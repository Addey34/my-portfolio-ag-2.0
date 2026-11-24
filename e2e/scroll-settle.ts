import type { Page } from '@playwright/test';

/**
 * Attend la fin réelle du défilement lissé : la position doit rester identique
 * pendant plusieurs images consécutives. Remplace les attentes à durée fixe,
 * dont l'issue dépendait de la vitesse du rendu logiciel.
 */
export async function waitForScrollEnd(
  page: Page,
  stableFrames = 8
): Promise<void> {
  await page.evaluate(
    (frames) =>
      new Promise<void>((resolve) => {
        let last = Number.NaN;
        let stable = 0;
        const step = () => {
          const y = window.scrollY;
          stable = Math.abs(y - last) < 0.5 ? stable + 1 : 0;
          last = y;
          if (stable >= frames) resolve();
          else requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      }),
    stableFrames
  );
}
