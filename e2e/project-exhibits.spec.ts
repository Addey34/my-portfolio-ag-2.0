import { expect, test } from '@playwright/test';

const cases = [
  { id: 'ludora', href: 'https://ludora.adrianguichard.dev/', fr: 'Catalogue de jeux de Ludora.', en: 'Ludora game catalogue.' },
  { id: 'magnotes', href: 'https://magnotes.adrianguichard.dev/', fr: 'Tableau de notes dans la vue canvas de MagNotes.', en: 'A notes board in the MagNotes canvas view.' },
];

test('aperçus Ludora et MagNotes : démos, clavier, toucher et langues', async ({ page }, testInfo) => {
  await page.goto('/');
  for (const item of cases) {
    const exhibit = page.locator(`#${item.id} .chapter__exhibit`);
    await expect(exhibit).toHaveAttribute('href', item.href);
    const image = exhibit.locator('img');
    await expect(image).toHaveAttribute('alt', item.fr);
    if (testInfo.project.name === 'desktop-chromium') {
      await expect(exhibit).toBeHidden();
      continue;
    }
    await exhibit.scrollIntoViewIfNeeded();
    await expect(exhibit).toBeVisible();
    await expect.poll(() => image.evaluate((node: HTMLImageElement) => node.naturalWidth)).toBeGreaterThan(0);
    await exhibit.evaluate((node) => node.addEventListener('click', (event) => {
      event.preventDefault();
      node.setAttribute('data-activated', String(Number(node.getAttribute('data-activated') || 0) + 1));
    }));
    await exhibit.focus();
    await page.keyboard.press('Enter');
    await expect(exhibit).toHaveAttribute('data-activated', '1');
    await exhibit.tap();
    await expect(exhibit).toHaveAttribute('data-activated', '2');
  }
  await page.locator('#lang-toggle').click();
  for (const item of cases) {
    await expect(page.locator(`#${item.id} .chapter__exhibit img`)).toHaveAttribute('alt', item.en);
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
});