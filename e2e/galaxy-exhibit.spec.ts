import { expect, test } from '@playwright/test';

test('aperçu Galaxy accessible, traduit et lié au produit sur mobile', async ({ page }, testInfo) => {
  await page.goto('/#galaxy');
  const exhibit = page.locator('#galaxy .chapter__exhibit');
  if (testInfo.project.name === 'desktop-chromium') {
    await expect(exhibit).toBeHidden();
    return;
  }
  await exhibit.scrollIntoViewIfNeeded();
  await expect(exhibit).toBeVisible();
  await expect(exhibit).toHaveAttribute('href', 'https://galaxy.adrianguichard.dev/');
  const image = exhibit.locator('img');
  await expect(image).toHaveAttribute('alt', 'Vue du système solaire interactif Galaxy.');
  await expect.poll(() => image.evaluate((node: HTMLImageElement) => node.naturalWidth)).toBeGreaterThan(0);
  await exhibit.evaluate((node) => node.addEventListener('click', (event) => {
    event.preventDefault();
    node.setAttribute('data-tested-click', 'yes');
  }));
  await exhibit.focus();
  await expect(exhibit).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(exhibit).toHaveAttribute('data-tested-click', 'yes');
  await page.locator('#lang-toggle').click();
  await expect(image).toHaveAttribute('alt', 'View of the interactive Galaxy solar system.');
  await expect(exhibit).toContainText('Open live demo');
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
});