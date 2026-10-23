import { expect, test } from '@playwright/test';

const SITE = process.env.IOS_BASE_URL ?? 'https://portfolioag-3288c.web.app/';

interface FrameStats {
  device: string;
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

  // Mesure des images pendant tout le parcours, via requestAnimationFrame.
  await page.evaluate(() => {
    const frames: number[] = [];
    (window as unknown as { __frames: number[] }).__frames = frames;
    let last = performance.now();
    const tick = (time: number): void => {
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
    errors: siteErrors.slice(0, 5),
  };
  console.log(`RESULT ${JSON.stringify(stats)}`);

  expect(gl.webgl).toBe(true);
  expect(ids.length).toBeGreaterThanOrEqual(7);
  expect(maxOverflow).toBeLessThanOrEqual(1);
  expect(siteErrors).toEqual([]);
  expect(Number(stats.fpsMoy)).toBeGreaterThan(30);
});
