import { expect, test } from '@playwright/test';

test('aperçu Galaxy visible, accessible, traduit et lié au produit', async ({
  page,
}, testInfo) => {
  await page.goto('/#galaxy');
  const exhibit = page.locator('#galaxy .chapter__exhibit');
  await exhibit.scrollIntoViewIfNeeded();
  await expect(exhibit).toBeVisible();
  await expect(exhibit).toHaveAttribute(
    'href',
    'https://galaxy.adrianguichard.dev/'
  );
  const image = exhibit.locator('img');
  await expect(image).toHaveAttribute(
    'alt',
    'Vue du système solaire interactif Galaxy.'
  );
  await expect
    .poll(() => image.evaluate((node: HTMLImageElement) => node.naturalWidth))
    .toBeGreaterThan(0);
  if (testInfo.project.name !== 'desktop-chromium') {
    const bounds = await exhibit.boundingBox();
    const rail = await page.locator('.rail').boundingBox();
    expect(bounds).not.toBeNull();
    expect(rail).not.toBeNull();
    expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(rail!.y);
  }
  await exhibit.evaluate((node) =>
    node.addEventListener('click', (event) => {
      event.preventDefault();
      node.setAttribute('data-tested-click', 'yes');
    })
  );
  await exhibit.focus();
  await expect(exhibit).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(exhibit).toHaveAttribute('data-tested-click', 'yes');

  const preview = page.locator('#galaxy .chapter__preview');
  const toggle = preview.locator('summary');
  await expect(toggle).toHaveText('Agrandir la capture du produit');
  await toggle.click();
  await expect(preview).toHaveAttribute('open', '');
  await expect(preview.locator('img')).toBeVisible();
  await expect(preview.locator('img')).toHaveAttribute(
    'alt',
    'Vue du système solaire interactif Galaxy.'
  );
  await page.locator('#lang-toggle').click();
  await expect(image).toHaveAttribute(
    'alt',
    'View of the interactive Galaxy solar system.'
  );
  await expect(preview.locator('img')).toHaveAttribute(
    'alt',
    'View of the interactive Galaxy solar system.'
  );
  await expect(toggle).toHaveText('Enlarge the product screenshot');
  await expect(exhibit).toContainText('Open live demo');
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)
  ).toBeLessThanOrEqual(1);
});
