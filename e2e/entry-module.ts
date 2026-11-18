import type { Page } from '@playwright/test';

/** Identifie le module déclaré par le HTML réellement servi, puis le bloque. */
export async function blockEntryModule(page: Page): Promise<() => number> {
  const response = await page.request.get('/');
  if (!response.ok()) throw new Error(`HTML indisponible : ${response.status()}`);
  const html = await response.text();
  const scripts = [...html.matchAll(/<script\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi)];
  const entries = scripts
    .map((match) => new URL(match[1], response.url()))
    .filter((url) => /^\/src\/main\.ts$|^\/assets\/index-[^/]+\.js$/.test(url.pathname));
  if (entries.length !== 1) throw new Error(`Module principal ambigu : ${entries.length}`);
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