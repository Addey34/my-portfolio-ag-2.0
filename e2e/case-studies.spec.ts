import { expect, test } from '@playwright/test';

test('dossiers bilingues : décisions, preuves, limites et détails accessibles', async ({
  page,
}) => {
  await page.goto('/');
  await page
    .locator('#boot-loader')
    .waitFor({ state: 'hidden', timeout: 30_000 });
  for (const [id, name, steps] of [
    ['siteguardian', 'SiteGuardian', 6],
    ['imagegeneratorlocal', 'AIGen', 4],
  ] as const) {
    const article = page.locator(`#${id}`);
    await expect(article).toHaveAccessibleName(name);
    await expect(article.locator('.study__flow li')).toHaveCount(steps);
    await expect(article.locator('.study__limit')).toBeVisible();
    await expect(article.locator('.ledger__row')).toHaveCount(4);
    await expect(article.locator('.ledger__row--evidence')).toBeVisible();
    const link = article.locator('.study__links a');
    await expect(link).toHaveAttribute('target', '_blank');
    await expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  }
  await expect(
    page.locator('#imagegeneratorlocal .study__highlight')
  ).toContainText('Lanceur Windows 386 publié');
  await page.locator('#lang-toggle').click();
  await expect(page.locator('#siteguardian .study__flow')).toContainText(
    'Acknowledgement'
  );
  await expect(
    page.locator('#imagegeneratorlocal .study__limit')
  ).toContainText('without an Authenticode');
  await expect(page.locator('#imagegeneratorlocal .study__links a')).toHaveText(
    'View the public interface'
  );
  await page
    .locator('#contact')
    .evaluate((node) =>
      node.scrollIntoView({ block: 'center', behavior: 'instant' })
    );
  await expect(page.locator('#scroll-root')).not.toHaveClass(
    /is-reading-studies/
  );
});

test('petit écran sans WebGL : liens et fiches utilisables sans collision avec le rail', async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 640 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (
      type: string,
      ...args: unknown[]
    ) {
      if (type.includes('webgl')) return null;
      return Reflect.apply(original, this, [type, ...args]);
    } as typeof original;
  });
  await page.goto('/');
  await page
    .locator('#boot-loader')
    .waitFor({ state: 'hidden', timeout: 30_000 });
  for (const locale of ['fr', 'en']) {
    if (locale === 'en') await page.locator('#lang-toggle').click();
    for (const id of ['siteguardian', 'imagegeneratorlocal']) {
      const article = page.locator(`#${id}`);
      for (const control of [article.locator('.study__links a')]) {
        await control.evaluate((node) =>
          node.scrollIntoView({ block: 'center', behavior: 'instant' })
        );
        await expect
          .poll(() =>
            control.evaluate((node) => {
              const r = node.getBoundingClientRect();
              return node.contains(
                document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)
              );
            })
          )
          .toBe(true);
        const box = await control.boundingBox();
        expect(box!.height).toBeGreaterThanOrEqual(44);
      }
      await expect(page.locator('#scroll-root')).toHaveClass(
        /is-reading-studies/
      );
    }
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth - innerWidth
      )
    ).toBeLessThanOrEqual(1);
  }
});

test('libellé de capture MagNotes : contraste WCAG AA en FR et EN', async ({
  page,
}) => {
  await page.goto('/');
  await page
    .locator('#boot-loader')
    .waitFor({ state: 'hidden', timeout: 30_000 });
  const badge = page.locator('#magnotes .chapter__exhibit-badge');
  for (const locale of ['fr', 'en']) {
    if (locale === 'en') await page.locator('#lang-toggle').click();
    const ratio = await badge.evaluate((node) => {
      const channels = (css: string) => css.match(/[\d.]+/g)!.slice(0, 3);
      const luminance = (css: string) => {
        const [r, g, b] = channels(css).map((value) => {
          const v = Number(value) / 255;
          return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
        });
        return 0.2126 * r + 0.7152 * g + 0.0722 * b;
      };
      const text = luminance(getComputedStyle(node).color);
      const frame = luminance(
        getComputedStyle(node.closest('.chapter__exhibit')!).backgroundColor
      );
      return (Math.max(text, frame) + 0.05) / (Math.min(text, frame) + 0.05);
    });
    expect(ratio).toBeGreaterThanOrEqual(4.5);
  }
});
