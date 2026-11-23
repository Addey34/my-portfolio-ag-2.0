import { expect, test, type Page } from '@playwright/test';

/** Les parcours HTML restent testés pendant le chargement des modèles ; la suite 3D garde ses vrais assets. */
export const uiTest = test.extend({
  context: async ({ context }, use) => {
    let release = (): void => {};
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    await context.route('**/models/*.glb', async (route) => {
      await gate;
      if (!route.request().frame().page().isClosed()) await route.continue();
    });
    try {
      await use(context);
    } finally {
      await context.unrouteAll({ behavior: 'ignoreErrors' });
      await context.close();
      release();
    }
  },
});

/** Accès utilisateur au HTML prêt, sans attendre la précompilation du monde 3D. */
export async function openPortfolioUI(page: Page, path = '/'): Promise<void> {
  await page.goto(path, { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#contact-name')).toBeEnabled({ timeout: 30_000 });
  const skip = page.locator('[data-boot-skip]');
  if ((await skip.isVisible()) && (await skip.isEnabled())) await skip.click();
  await expect(page.locator('#boot-loader')).toBeHidden({ timeout: 20_000 });
}

/** Identifie le module déclaré par le HTML réellement servi, puis le bloque. */
export async function blockEntryModule(page: Page): Promise<() => number> {
  const response = await page.request.get('/');
  if (!response.ok())
    throw new Error(`HTML indisponible : ${response.status()}`);
  const html = await response.text();
  const scripts = [
    ...html.matchAll(/<script\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi),
  ];
  const entries = scripts
    .map((match) => new URL(match[1], response.url()))
    .filter((url) =>
      /^\/src\/main\.ts$|^\/assets\/index-[^/]+\.js$/.test(url.pathname)
    );
  if (entries.length !== 1)
    throw new Error(`Module principal ambigu : ${entries.length}`);
  const entry = entries[0];
  let blocked = 0;
  await page.route(
    (url) => url.origin === entry.origin && url.pathname === entry.pathname,
    async (route) => {
      blocked += 1;
      await route.abort();
    }
  );
  return () => blocked;
}
