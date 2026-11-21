import { expect, test } from '@playwright/test';

test('MagNotes : structure commune et liens dégagés en FR/EN', async ({ page }) => {
  await page.goto('/#magnotes');
  await expect(page.locator('#magnotes .chapter__thesis')).toHaveText('Des idées libres, une structure commune.');
  await page.waitForFunction(() => !document.getElementById('boot-loader'));
  for (const language of ['fr', 'en']) {
    for (const href of ['https://magnotes.adrianguichard.dev/', 'https://github.com/Addey34/magnotes-frontend']) {
      const link = page.locator(`#magnotes .chapter__links a[href="${href}"]`);
      await link.scrollIntoViewIfNeeded();
      await expect.poll(() => link.evaluate((el) => {
        const r = el.getBoundingClientRect();
        return el.contains(document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2));
      })).toBe(true);
      await link.focus();
      await expect(link).toBeFocused();
      await link.evaluate((el) => el.addEventListener('click', (event) => { event.preventDefault(); el.setAttribute('data-tested', 'yes'); }));
      await link.click();
      await expect(link).toHaveAttribute('data-tested', 'yes');
    }
    if (language === 'fr') await page.locator('#lang-toggle').click();
  }
  await expect(page.locator('#magnotes .chapter__thesis')).toHaveText('Free ideas, one shared structure.');
});
