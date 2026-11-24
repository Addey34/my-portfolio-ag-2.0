import { expect, test } from '@playwright/test';

for (const [width, height] of [
  [360, 800],
  [390, 844],
  [430, 932],
  [768, 1024],
  [1440, 900],
] as const) {
  test.describe(`navigation lisible ${width}×${height}`, () => {
    test.use({ viewport: { width, height }, reducedMotion: 'reduce' });

    test('contenu et commandes restent atteignables', async ({
      page,
      isMobile,
    }) => {
      test.setTimeout(90_000);
      await page.goto('/');
      await expect(page.locator('#boot-loader')).toBeHidden({ timeout: 30000 });
      const rail = page.locator('.rail');
      if (width <= 860) {
        const box = await rail.boundingBox();
        expect(box).not.toBeNull();
        expect(box!.height).toBeLessThanOrEqual(57);
      }

      for (const selector of [
        '.stack-family:last-child',
        '.offer-card:nth-child(2)',
        '.study:first-child',
        '.contact__form-toggle',
      ]) {
        const target = page.locator(selector).first();
        await expect(target).toBeVisible();
        await target.evaluate((el) => el.scrollIntoView({ block: 'center' }));
        await expect
          .poll(async () =>
            target.evaluate((el) => {
              const rect = el.getBoundingClientRect();
              const x = rect.left + rect.width / 2;
              const y = rect.top + rect.height / 2;
              const hit = document.elementFromPoint(x, y);
              return (
                y > 0 &&
                y < innerHeight &&
                !!hit &&
                (el === hit || el.contains(hit))
              );
            })
          )
          .toBe(true);
      }

      await page.evaluate(() => window.scrollTo(0, 0));
      const chapter = page.locator('.rail__dot[data-rail="stack"]');
      if (isMobile && width <= 860) {
        await chapter.tap();
      } else {
        await chapter.click();
      }
      await expect.poll(() => new URL(page.url()).hash).toBe('#stack');
      await expect(page.locator('#stack')).toBeInViewport();
      await page.locator('#lang-toggle').click();
      await expect(page.locator('html')).toHaveAttribute('lang', 'en');
      await expect(
        page.locator('.rail__dot[data-rail="studies"]')
      ).toHaveAttribute('aria-label', /studies/i);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth - innerWidth
        )
      ).toBeLessThanOrEqual(1);
    });
  });
}
