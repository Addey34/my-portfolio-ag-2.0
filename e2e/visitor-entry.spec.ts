import { expect, test } from '@playwright/test';

for (const [locale, label] of [
  ['fr', 'Voir le portfolio'],
  ['en', 'View the portfolio'],
] as const) {
  test(`accès volontaire avant la 3D : ${locale}`, async ({
    page,
    isMobile,
  }, testInfo) => {
    if (isMobile && locale === 'en')
      await page.setViewportSize({ width: 360, height: 640 });
    await page.addInitScript((language) => {
      localStorage.setItem('ag-locale', language);
      addEventListener('world-settled', () => {
        document.documentElement.dataset.visitorSettled = 'true';
      });
    }, locale);
    let releaseModels: (() => void) | undefined;
    const gate = new Promise<void>((resolve) => {
      releaseModels = resolve;
    });
    await page.route('**/models/*.glb', async (route) => {
      await gate;
      await route.continue();
    });
    const started = Date.now();
    try {
      await page.goto('/', { waitUntil: 'domcontentloaded' });
      const skip = page.getByRole('button', { name: label, exact: true });
      await expect(skip).toBeEnabled();
      await expect(skip).toBeVisible();
      const box = await skip.boundingBox();
      expect(box!.height).toBeGreaterThanOrEqual(44);
      await expect(page.locator('html')).not.toHaveAttribute(
        'data-visitor-settled',
        'true'
      );
      if (isMobile) await skip.tap();
      else {
        await skip.focus();
        await page.keyboard.press('Enter');
      }
      await expect(page.locator('.hero__cta--primary')).toBeFocused();
      await expect(page.locator('#boot-loader')).toHaveCount(0);
      await page.keyboard.press('Enter');
      await expect(page.locator('#projects-intro')).toBeInViewport({
        ratio: 0.1,
      });
      await expect(page.locator('html')).not.toHaveAttribute(
        'data-visitor-settled',
        'true'
      );
      console.log(
        `${testInfo.project.name} ${locale}: sélection utilisable en ${Date.now() - started} ms, GLB encore retenus`
      );
      await page.locator('.hud__btn--link[href="#contact"]').click();
      await expect(page.locator('#contact')).toBeInViewport({ ratio: 0.1 });
      releaseModels?.();
      await expect(page.locator('html')).toHaveAttribute(
        'data-visitor-settled',
        'true',
        { timeout: 30_000 }
      );
      await expect(page.locator('#contact')).toBeInViewport({ ratio: 0.1 });
      await expect(page.locator('#boot-loader')).toHaveCount(0);
    } finally {
      releaseModels?.();
    }
  });
}

test('fermeture automatique conservée, sans déplacement du focus', async ({
  page,
}) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  const contact = page.locator('.hud__btn--link[href="#contact"]');
  await contact.focus();
  await expect(page.locator('#boot-loader')).toHaveCount(0, {
    timeout: 20_000,
  });
  await expect(contact).toBeFocused();
  await expect(page.locator('.hero__cta--primary')).toBeVisible();
});

test('repli sans WebGL et mouvement réduit : aucun écran d’attente persistant', async ({
  page,
}) => {
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
  await expect(page.locator('#boot-loader')).toHaveCount(0);
  await expect(page.locator('#world-3d')).toBeHidden();
  await expect(page.locator('#hero-projects a')).toHaveCount(3);
  const contact = page.locator('.hero__cta[href="#contact"]');
  await contact.focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#contact')).toBeInViewport({ ratio: 0.1 });
});
