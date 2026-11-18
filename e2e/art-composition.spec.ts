import { expect, test } from '@playwright/test';

for (const [width, height] of [
  [360, 800],
  [390, 844],
  [430, 932],
  [768, 1024],
  [1440, 900],
] as const) {
  test.describe(`composition ${width}×${height}`, () => {
    test.use({ viewport: { width, height } });

    test('Approche et Solutions restent lisibles après stabilisation', async ({
      page,
    }) => {
      test.setTimeout(120_000);
      await page.goto('/');
      await expect(page.locator('#boot-loader')).toBeHidden({ timeout: 30000 });
      for (const id of ['intro', 'freelance', 'stack', 'freelance', 'intro']) {
        await page
          .locator(`.rail__dot[data-rail="${id}"]`)
          .evaluate((link: HTMLAnchorElement) => link.click());
        await expect(page.locator(`#${id}`)).toBeInViewport();
        await page.waitForTimeout(4000);
        if (id !== 'stack') {
          const title = page.locator(
            id === 'intro' ? '.intro__title' : '#freelance .stack__title'
          );
          const layout = await title.evaluate((element) => {
            const rect = element.getBoundingClientRect();
            const hud = document.querySelector('.hud')!.getBoundingClientRect();
            const rail = document
              .querySelector('.rail')!
              .getBoundingClientRect();
            return {
              top: rect.top,
              bottom: rect.bottom,
              hud: hud.bottom,
              rail: rail.top,
            };
          });
          if (width <= 860) {
            expect(layout.top).toBeGreaterThanOrEqual(layout.hud);
            expect(layout.bottom).toBeLessThanOrEqual(layout.rail);
          }
        }
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth - innerWidth
          )
        ).toBeLessThanOrEqual(1);
      }
    });
  });
}
