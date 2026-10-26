import { expect, test, type Page } from '@playwright/test';
import { PNG } from 'pngjs';

const SITE = process.env.IOS_BASE_URL ?? 'https://www.adrianguichard.dev/';

/** Nombre de pixels clairs du monde 3D seul (HTML masqué) : prouve que le canvas n'est pas vide. */
async function visibleWorldPixels(page: Page, path: string): Promise<number> {
  const hidden = '#scroll-root,.hud,.rail,.scroll-progress';
  await page.evaluate((selector) => {
    document
      .querySelectorAll<HTMLElement>(selector)
      .forEach((node) =>
        node.style.setProperty('visibility', 'hidden', 'important')
      );
  }, hidden);
  await page.waitForTimeout(600);
  const image = PNG.sync.read(await page.screenshot({ path, type: 'png' }));
  await page.evaluate((selector) => {
    document
      .querySelectorAll<HTMLElement>(selector)
      .forEach((node) => node.style.removeProperty('visibility'));
  }, hidden);
  let count = 0;
  for (let i = 0; i < image.data.length; i += 4 * 16) {
    if (image.data[i] + image.data[i + 1] + image.data[i + 2] > 180) count += 1;
  }
  return count;
}

interface FrameStats {
  device: string;
  worldPixels: number;
  baselineFps: string;
  renderer: string;
  dpr: number;
  sections: number;
  maxOverflow: number;
  frames: number;
  fpsMoy: string;
  p50ms: string;
  p95ms: string;
  p99ms: string;
  sup50ms: number;
  hitches: string[];
  smoothHitches: string[];
  errors: string[];
}

test('parcours complet sur iPhone réel : WebGL, débordement, fluidité', async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });

  // Cadence maximale de l'appareil : page vide, pour distinguer un plafond matériel d'une surcharge du site.
  await page.goto('about:blank');
  const measuredBaseline: unknown = await page.evaluate(
    () =>
      new Promise<number>((resolve) => {
        let count = 0;
        const start = performance.now();
        const tick = (time: number): void => {
          count += 1;
          if (time - start >= 1500) resolve((count * 1000) / (time - start));
          else requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      })
  );

  // Valeur illisible (aléa du service) : on retombe sur 60 i/s, cadence usuelle des écrans.
  const baselineFps =
    typeof measuredBaseline === 'number' && Number.isFinite(measuredBaseline)
      ? measuredBaseline
      : 60;
  await page.goto(SITE, { waitUntil: 'load' });
  await page.waitForTimeout(4000);

  const gl = await page.evaluate(() => {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('webgl2') ?? canvas.getContext('webgl');
    const info = context?.getExtension('WEBGL_debug_renderer_info');
    return {
      webgl: Boolean(context),
      renderer:
        context && info
          ? String(context.getParameter(info.UNMASKED_RENDERER_WEBGL))
          : 'n/a',
      dpr: window.devicePixelRatio,
    };
  });

  // La 3D doit réellement s'afficher : on masque le HTML et on compte les pixels clairs restants.
  const worldPixels = await visibleWorldPixels(
    page,
    testInfo.outputPath('monde.png')
  );

  // Mesure des images pendant tout le parcours, via requestAnimationFrame.
  await page.evaluate(() => {
    const frames: number[] = [];
    const hitches: Array<[number, number]> = [];
    const win = window as unknown as {
      __frames: number[];
      __hitches: Array<[number, number]>;
    };
    win.__frames = frames;
    win.__hitches = hitches;
    let last = performance.now();
    const tick = (time: number): void => {
      if (time - last > 50)
        hitches.push([Math.round(time - last), Math.round(window.scrollY)]);
      frames.push(time - last);
      last = time;
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });

  const ids = await page.evaluate(() =>
    [...document.querySelectorAll('section[id]')].map((s) => s.id)
  );
  let maxOverflow = 0;
  for (const id of ids) {
    for (const part of [0, 0.5, 1]) {
      await page.evaluate(
        ([sectionId, ratio]) => {
          const rect = document
            .getElementById(String(sectionId))
            ?.getBoundingClientRect();
          if (!rect) throw new Error(`Section ${sectionId} introuvable`);
          const extra = Math.max(0, rect.height - window.innerHeight);
          window.scrollTo(0, rect.top + window.scrollY + extra * Number(ratio));
        },
        [id, part]
      );
      await page.waitForTimeout(700);
      maxOverflow = Math.max(
        maxOverflow,
        await page.evaluate(
          () =>
            document.documentElement.scrollWidth -
            document.documentElement.clientWidth
        )
      );
    }
    if (['stack', 'freelance', 'contact'].includes(id)) {
      const path = testInfo.outputPath(`ios-${id}.png`);
      await page.screenshot({ path });
      await testInfo.attach(`ios-${id}`, { path, contentType: 'image/png' });
    }
  }

  const hitchRaw = await page.evaluate(() => [
    ...(window as unknown as { __hitches: Array<[number, number]> }).__hitches,
  ]);
  // Second passage : défilement continu et progressif (comme un geste), du haut vers le bas.
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(1500);
  await page.evaluate(() => {
    (window as unknown as { __hitches: unknown[] }).__hitches.length = 0;
  });
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        const total =
          document.documentElement.scrollHeight - window.innerHeight;
        const duration = 24000;
        const start = performance.now();
        const step = (now: number): void => {
          const t = Math.min(1, (now - start) / duration);
          window.scrollTo(0, total * t);
          if (t < 1) requestAnimationFrame(step);
          else resolve();
        };
        requestAnimationFrame(step);
      })
  );
  const smoothRaw = await page.evaluate(
    () =>
      (window as unknown as { __hitches: Array<[number, number]> }).__hitches
  );
  const smoothHitches = smoothRaw.map(([ms, y]) => `${y}px:${ms}ms`);

  const tops = await page.evaluate(() =>
    [...document.querySelectorAll('section[id]')].map((node) => [
      node.id,
      Math.round(node.getBoundingClientRect().top + window.scrollY),
    ])
  );
  const where = (y: number): string => {
    let name = 'haut';
    for (const [id, top] of tops) if (y >= Number(top) - 300) name = String(id);
    return name;
  };
  const hitches = hitchRaw.slice(1).map(([ms, y]) => `${where(y)}:${ms}ms`);
  const frames = (
    await page.evaluate(
      () => (window as unknown as { __frames: number[] }).__frames
    )
  )
    .slice(5)
    .sort((a, b) => a - b);
  const mean =
    frames.reduce((sum, v) => sum + v, 0) / Math.max(1, frames.length);
  const at = (p: number): string =>
    frames.length ? frames[Math.floor(frames.length * p)].toFixed(1) : 'n/a';

  // Playwright injecte une feuille de style pour les captures : la CSP la refuse sur Safari, sans lien avec le site.
  const siteErrors = errors.filter(
    (e) => !e.includes('Refused to apply a stylesheet')
  );
  const stats: FrameStats = {
    device: testInfo.project.name,
    worldPixels,
    baselineFps: baselineFps.toFixed(1),
    renderer: gl.renderer,
    dpr: gl.dpr,
    sections: ids.length,
    maxOverflow,
    frames: frames.length,
    fpsMoy: (1000 / mean).toFixed(1),
    p50ms: at(0.5),
    p95ms: at(0.95),
    p99ms: at(0.99),
    sup50ms: frames.filter((v) => v > 50).length,
    hitches,
    smoothHitches,
    errors: siteErrors.slice(0, 5),
  };
  console.log(`RESULT ${JSON.stringify(stats)}`);

  expect(gl.webgl).toBe(true);
  expect(worldPixels, 'monde 3D vide à l’écran').toBeGreaterThan(40);
  expect(ids.length).toBeGreaterThanOrEqual(7);
  expect(maxOverflow).toBeLessThanOrEqual(1);
  expect(siteErrors).toEqual([]);
  // Au moins 70 % de la cadence maximale mesurée sur l'appareil (page vide).
  expect(Number(stats.fpsMoy)).toBeGreaterThan(baselineFps * 0.7);
});
