import { expect, test } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { requireDevSources } from './dev-sources';

interface ArtWorld {
  state: {
    scene: string;
    transition: number;
    clockAgProgress: number;
    identityStackProgress: number;
  };
  world: { position: { y: number }; scale: { x: number } };
  getRenderDiagnostics(): {
    calls: number;
    triangles: number;
    pixelRatio: number;
  };
}

declare global {
  interface Window {
    mobileArt: {
      scroll?: {
        lenis: { isScrolling: boolean | string } | null;
        scrollTo(
          target: number,
          offset: number,
          options: { immediate: boolean }
        ): void;
      };
      world: ArtWorld | null;
      contexts: number;
      mounts: number;
      tickerAdds: number;
      settled: boolean;
      readyMs: number | null;
      canvas: HTMLElement | null;
    };
  }
}

test('trois passages : composition, retour et navigation tactile', async ({
  page,
  isMobile,
}, testInfo) => {
  test.setTimeout(180_000);
  await requireDevSources(page);
  await page.addInitScript(() => {
    localStorage.setItem('ag-transition', 'fade');
    window.mobileArt = {
      world: null,
      contexts: 0,
      mounts: 0,
      tickerAdds: 0,
      settled: false,
      readyMs: null,
      canvas: null,
    };
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type, ...args) {
      if (type.includes('webgl')) window.mobileArt.contexts++;
      return Reflect.apply(original, this, [type, ...args]);
    } as typeof original;
    addEventListener('world-settled', () => {
      window.mobileArt.settled = true;
      window.mobileArt.readyMs = performance.now();
    });
  });
  // Référence visuelle reproductible, sans réécrire les fichiers de travail.
  if (process.env.MOBILE_ART_REFERENCE === '1') {
    const css = execFileSync(
      'git',
      ['show', 'd0b67ae90091f0de39381329c32ed9594cd088a2:src/style.css'],
      { encoding: 'utf8' }
    );
    await page.route('**/src/style.css*', async (route) => {
      const response = await route.fetch();
      await route.fulfill({ response, body: css, contentType: 'text/css' });
    });
  }
  await page.route('**/src/visual/StoryWorld3D.ts*', async (route) => {
    const response = await route.fetch();
    const body = await response.text();
    const marker = 'setVisualState(state) {';
    expect(body.split(marker)).toHaveLength(2);
    await route.fulfill({
      response,
      body: body.replace(
        marker,
        marker +
          ' if(window.mobileArt.world!==this)window.mobileArt.mounts++; window.mobileArt.world = this;'
      ),
    });
  });
  await page.route('**/src/main.ts*', async (route) => {
    const response = await route.fetch();
    const body = await response.text();
    const marker = 'const scroll = new SmoothScroll();';
    expect(body.split(marker)).toHaveLength(2);
    const clock = [...body.matchAll(/([\w$]+)\.ticker\.add\(/g)].at(-1)?.[1];
    if (!clock) throw new Error('Ticker absent de la racine');
    const probe = `queueMicrotask(()=>{const original=${clock}.ticker.add;${clock}.ticker.add=function(...args){window.mobileArt.tickerAdds++;return Reflect.apply(original,this,args);};});`;
    await route.fulfill({
      response,
      body:
        probe +
        body.replace(marker, marker + ' window.mobileArt.scroll = scroll;'),
    });
  });
  await page.goto('/');
  await page.evaluate(() => document.fonts.ready);
  await page.waitForFunction(() => window.mobileArt.settled, null, {
    timeout: 90_000,
  });
  await expect(page.locator('#boot-loader')).toHaveCount(0);
  const initial = await page.evaluate(() => {
    window.mobileArt.canvas = document.getElementById('world-3d');
    return {
      contexts: window.mobileArt.contexts,
      mounts: window.mobileArt.mounts,
      tickerAdds: window.mobileArt.tickerAdds,
      readyMs: window.mobileArt.readyMs,
    };
  });
  const frames = [];
  const capture = async (label: string, section: string, position: number) => {
    await page.locator(`#${section}`).evaluate((element, fraction) => {
      window.mobileArt.scroll!.scrollTo(
        element.getBoundingClientRect().top + scrollY - innerHeight * fraction,
        0,
        { immediate: true }
      );
    }, position);
    // L'aimantation peut ajuster le repère : on observe sa pose finale réelle.
    await expect
      .poll(
        () =>
          page.evaluate(() => window.mobileArt.world?.state.transition ?? 1),
        { timeout: 15000 }
      )
      .toBeGreaterThan(0.98);
    await page.screenshot({
      path: testInfo.outputPath(`${label}.png`),
      scale: 'css',
    });
    frames.push(
      await page.evaluate((name) => {
        const world = window.mobileArt.world!;
        return {
          name,
          scrollY,
          scene: world.state.scene,
          clock: world.state.clockAgProgress,
          stack: world.state.identityStackProgress,
          objectY: world.world.position.y,
          scale: world.world.scale.x,
          render: world.getRenderDiagnostics(),
          overflow: document.documentElement.scrollWidth - innerWidth,
        };
      }, label)
    );
  };
  await capture('hero', 'top', 0);
  for (const [name, section, fraction] of [
    ['clock-start', 'intro', 0.92],
    ['clock-middle', 'intro', 0.62],
    ['clock-end', 'intro', 0.32],
    ['stack-start', 'stack', 0.82],
    ['stack-middle', 'stack', 0.5],
    ['stack-end', 'stack', 0.18],
    ['stack-return', 'stack', 0.82],
    ['clock-return', 'intro', 0.62],
  ] as const)
    await capture(name, section, fraction);
  for (const language of ['fr', 'en']) {
    if (language === 'en') {
      await page.locator('#lang-toggle').focus();
      await page.keyboard.press('Enter');
      await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    }
    for (const id of ['galaxy', 'ludora', 'magnotes', 'galaxy']) {
      const link = page.locator(`.rail__dot[data-rail="${id}"]`);
      if (isMobile) await link.tap();
      else await link.click();
      await expect(page).toHaveURL(new RegExp(`#${id}$`));
      await expect
        .poll(() => page.evaluate(() => window.mobileArt.world?.state.scene), {
          timeout: 15000,
        })
        .toBe(id);
      await expect
        .poll(
          () =>
            page.evaluate(() => window.mobileArt.world?.state.transition ?? 0),
          { timeout: 15000 }
        )
        .toBeGreaterThan(0.98);
      await expect
        .poll(
          () =>
            page.evaluate(
              () => window.mobileArt.scroll?.lenis?.isScrolling ?? false
            ),
          { timeout: 15000 }
        )
        .toBe(false);
      await page.screenshot({
        path: testInfo.outputPath(`tap-${id}-${language}.png`),
        scale: 'css',
      });
      if (isMobile) {
        const layout = await page.locator(`#${id}`).evaluate((section) => {
          const panel = section
            .querySelector('.chapter__panel')!
            .getBoundingClientRect();
          const title = section
            .querySelector('.chapter__name')!
            .getBoundingClientRect();
          return {
            panelTop: panel.top,
            titleBottom: title.bottom,
            railTop: document.querySelector('.rail')!.getBoundingClientRect()
              .top,
            height: innerHeight,
            sectionTop: section.getBoundingClientRect().top,
            padding: getComputedStyle(section.querySelector('.chapter__inner')!)
              .paddingTop,
          };
        });
        await testInfo.attach(`composition-${language}-${id}`, {
          body: JSON.stringify(layout),
          contentType: 'application/json',
        });
        expect(layout.panelTop).toBeGreaterThan(layout.height * 0.4);
        expect(layout.titleBottom).toBeLessThan(layout.railTop);
      }
      await capture(`project-${id}-${language}`, id, 0);
    }
  }
  expect(frames.every((frame) => frame.overflow <= 1)).toBe(true);
  expect(
    await page.evaluate(() => ({
      contexts: window.mobileArt.contexts,
      mounts: window.mobileArt.mounts,
      tickerAdds: window.mobileArt.tickerAdds,
      sameCanvas:
        window.mobileArt.canvas === document.getElementById('world-3d'),
    }))
  ).toEqual({
    contexts: initial.contexts,
    mounts: initial.mounts,
    tickerAdds: initial.tickerAdds,
    sameCanvas: true,
  });
  await testInfo.attach('mesures', {
    body: JSON.stringify({ initial, frames }, null, 2),
    contentType: 'application/json',
  });
});

test('lecture FR/EN sans WebGL et en mouvement réduit', async ({
  page,
  isMobile,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type, ...args) {
      return type.includes('webgl')
        ? null
        : Reflect.apply(original, this, [type, ...args]);
    } as typeof original;
  });
  await page.goto('/#galaxy');
  await expect(page.locator('#boot-loader')).toHaveCount(0);
  for (const language of ['fr', 'en']) {
    if (language === 'en') {
      await page.locator('#lang-toggle').focus();
      await page.keyboard.press('Enter');
    }
    for (const id of ['galaxy', 'ludora', 'magnotes']) {
      const link = page.locator(`.rail__dot[data-rail="${id}"]`);
      if (isMobile) await link.tap();
      else await link.click();
      await expect(page.locator(`#${id} .chapter__name`)).toBeInViewport();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth - innerWidth
        )
      ).toBeLessThanOrEqual(1);
    }
  }
  expect(
    await page.evaluate(
      () => matchMedia('(prefers-reduced-motion: reduce)').matches
    )
  ).toBe(true);
});
