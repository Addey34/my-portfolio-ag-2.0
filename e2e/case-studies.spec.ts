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
    const toggle = article.locator('summary');
    await toggle.focus();
    await page.keyboard.press('Enter');
    await expect(article.locator('details')).toHaveAttribute('open', '');
    await expect(article.locator('.study__rows')).toBeVisible();
    await page.keyboard.press('Enter');
    await expect(article.locator('details')).not.toHaveAttribute('open');
    await expect(toggle).toBeFocused();
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

test('petit écran sans WebGL : liens et volets utilisables sans collision avec le rail', async ({
  page,
}, testInfo) => {
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
      for (const control of [
        article.locator('.study__links a'),
        article.locator('summary'),
      ]) {
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
      const toggle = article.locator('summary');
      if (testInfo.project.name === 'desktop-chromium') await toggle.click();
      else await toggle.tap();
      await expect(article.locator('details')).toHaveAttribute('open', '');
      await toggle.evaluate((node) =>
        node.scrollIntoView({ block: 'center', behavior: 'instant' })
      );
      // Après repli de la mise en page, le toucher est testé au point réellement exposé.
      await expect
        .poll(() =>
          toggle.evaluate((node) => {
            const r = node.getBoundingClientRect();
            return node.contains(
              document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)
            );
          })
        )
        .toBe(true);
      if (testInfo.project.name === 'desktop-chromium') await toggle.click();
      else {
        const target = await toggle.boundingBox();
        await page.touchscreen.tap(
          target!.x + target!.width / 2,
          target!.y + target!.height / 2
        );
      }
      await expect(article.locator('details')).not.toHaveAttribute('open');
    }
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth - innerWidth
      )
    ).toBeLessThanOrEqual(1);
  }
});
