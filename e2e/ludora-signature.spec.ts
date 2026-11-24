import { expect, test } from '@playwright/test';

test('Ludora : liens actionnables et transformations voisines réversibles', async ({ page }, testInfo) => {
  // Rendu logiciel sous workers parallèles : ~30 s mesurés seul, la marge évite un faux échec.
  test.setTimeout(120_000);
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/#ludora');
  await expect(page.locator('#ludora .chapter__thesis')).toHaveText('Des jeux singuliers, une mécanique commune.');
  await page.waitForFunction(() => !document.getElementById('boot-loader'));
  for (const id of ['ludora', 'magnotes', 'ludora', 'galaxy', 'ludora']) {
    await page.evaluate((target) => {
      const section = document.getElementById(target)!;
      const top = section.getBoundingClientRect().top + scrollY;
      scrollTo(0, top - innerHeight * 0.5);
    }, id);
    await page.waitForTimeout(650);
    await page.screenshot({ path: testInfo.outputPath(`transition-${id}-${Date.now()}.png`) });
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
  }
  const demo = page.locator('#ludora .chapter__links a').first();
  await expect(demo).toHaveAttribute('href', 'https://ludora.adrianguichard.dev/');
  await expect(page.locator('#ludora a[href="https://github.com/Addey34/ludora-showcase"]')).toBeVisible();
  await demo.scrollIntoViewIfNeeded();
  await expect.poll(() => demo.evaluate((link) => {
    const r = link.getBoundingClientRect();
    return link.contains(document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2));
  })).toBe(true);
  await page.locator('#lang-toggle').click();
  await expect(page.locator('#ludora .chapter__thesis')).toHaveText('Distinct games, one shared system.');
  await demo.focus();
  await expect(demo).toBeFocused();
  expect(errors).toEqual([]);
});