import { test, type Page } from '@playwright/test';

/**
 * Les sondes `3d-sync` et `mobile-art` réécrivent les sources servies (`/src/main.ts`,
 * `StoryWorld3D.ts`). Elles n'ont de sens que sur le serveur de développement : un build
 * minifié (production) ne porte pas ces repères. Le test est alors ignoré, jamais affaibli.
 */
export async function requireDevSources(page: Page): Promise<void> {
  const response = await page.request.get('/');
  const html = await response.text();
  test.skip(
    !/\/src\/main\.ts/.test(html),
    'Sonde réservée aux sources de développement : absente d’un build de production.'
  );
}
