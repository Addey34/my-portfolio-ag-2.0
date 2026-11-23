import { expect, test } from '@playwright/test';

// Même build optimisé, mêmes profils et gestes pour les deux états de revue.
const phase = process.env.VISUAL_PHASE ?? 'after';

test('composition aux entrées depuis le rail', async ({
  page,
  isMobile,
}, info) => {
  test.setTimeout(150_000);
  await page.goto('/');
  await expect(page.locator('#boot-loader')).toHaveCount(0, {
    timeout: 90_000,
  });
  for (const id of [
    'freelance',
    'projects-intro',
    'galaxy',
    'ludora',
    'magnotes',
    'studies',
    'contact',
  ]) {
    const link = page.locator(`.rail__dot[data-rail="${id}"]`);
    if (isMobile) await link.tap();
    else await link.click();
    await expect(link).toHaveClass(/is-current/);
    await page.waitForTimeout(2000);
    const heading = page.locator(`#${id}`).getByRole('heading').first();
    await expect(heading).toBeInViewport();
    if (isMobile && ['galaxy', 'ludora', 'magnotes'].includes(id)) {
      const layout = await page.locator(`#${id}`).evaluate((section) => ({
        panelTop: section
          .querySelector('.chapter__panel')!
          .getBoundingClientRect().top,
        titleBottom: section
          .querySelector('.chapter__name')!
          .getBoundingClientRect().bottom,
        railTop: document.querySelector('.rail')!.getBoundingClientRect().top,
        height: innerHeight,
      }));
      expect(layout.panelTop).toBeGreaterThan(layout.height * 0.4);
      expect(layout.titleBottom).toBeLessThan(layout.railTop);
    }
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth - innerWidth
      )
    ).toBeLessThanOrEqual(1);
    await page.screenshot({
      path: info.outputPath(`${phase}-entry-${id}.png`),
      scale: 'css',
    });
  }
});

for (const locale of ['fr', 'en']) {
  test(`revue visuelle du récit complet : ${locale}`, async ({
    page,
  }, info) => {
    test.setTimeout(180_000);
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(locale === 'fr' ? '/' : '/en/');
    await expect(page.locator('#boot-loader')).toHaveCount(0, {
      timeout: 90_000,
    });
    await page.evaluate(() => document.fonts.ready);
    const canvas = await page.locator('#world-3d').elementHandle();
    for (const id of [
      'top',
      'intro',
      'stack',
      'freelance',
      'projects-intro',
      'galaxy',
      'ludora',
      'magnotes',
      'studies',
      'contact',
    ]) {
      const target = page.locator(
        ['galaxy', 'ludora', 'magnotes'].includes(id)
          ? `#${id} .chapter__beat--context`
          : `#${id}`
      );
      await target.scrollIntoViewIfNeeded();
      // La capture observe la pose après la transition et l'aimantation existantes.
      await page.waitForTimeout(1500);
      await expect(target).toBeInViewport({ ratio: 0.05 });
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1
        )
      ).toBe(true);
      await page.screenshot({
        path: info.outputPath(`${phase}-${locale}-${id}.png`),
        scale: 'css',
      });
    }
    expect(
      await canvas?.evaluate(
        (node) => node === document.getElementById('world-3d')
      )
    ).toBe(true);
    expect(errors).toEqual([]);
  });
}

test('mesure comparable de l’entrée et du premier scroll', async ({
  page,
  browserName,
}, info) => {
  test.skip(
    !process.env.VISUAL_PHASE,
    'Mesure comparative exécutée à la demande.'
  );
  test.setTimeout(120_000);
  await page.addInitScript(() => {
    const samples: number[] = [];
    let previous = 0;
    let start = 0;
    const state = { ready: 0, settled: 0, opened: 0, samples };
    Object.assign(window, { visualMetrics: state });
    window.addEventListener('world-ready', () => {
      state.ready = performance.now();
    });
    window.addEventListener('world-settled', () => {
      state.settled = performance.now();
    });
    const observer = new MutationObserver(() => {
      if (!state.opened && document.querySelector('#boot-loader.is-done')) {
        state.opened = performance.now();
        start = state.opened;
        requestAnimationFrame(function sample(now) {
          if (previous) samples.push(now - previous);
          previous = now;
          if (now - start < 6200) requestAnimationFrame(sample);
        });
      }
    });
    observer.observe(document, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class'],
    });
  });
  await page.goto('/');
  await page.waitForFunction(
    () =>
      document.querySelector('#boot-loader.is-done') ||
      !document.getElementById('boot-loader'),
    null,
    { timeout: 90_000 }
  );
  for (let gesture = 0; gesture < 30; gesture++) {
    if (browserName === 'webkit') await page.keyboard.press('ArrowDown');
    else await page.mouse.wheel(0, 45);
    await page.waitForTimeout(200);
  }
  const metrics = await page.evaluate(() => {
    const state = (
      window as unknown as {
        visualMetrics: {
          ready: number;
          settled: number;
          opened: number;
          samples: number[];
        };
      }
    ).visualMetrics;
    const values = [...state.samples].sort((a, b) => a - b);
    return {
      ready: state.ready,
      settled: state.settled,
      opened: state.opened,
      frames: values.length,
      p95: values[Math.floor(values.length * 0.95)] ?? 0,
      max: Math.max(0, ...values),
      over100: values.filter((v) => v > 100).length,
    };
  });
  expect(metrics.opened).toBeGreaterThan(0);
  expect(metrics.frames).toBeGreaterThan(0);
  console.log(
    JSON.stringify({
      phase,
      profile: info.project.name,
      repeat: info.repeatEachIndex,
      metrics,
    })
  );
});
