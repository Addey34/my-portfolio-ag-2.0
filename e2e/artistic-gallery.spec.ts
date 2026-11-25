import { expect } from '@playwright/test';
import { openPortfolioUI, uiTest } from './entry-module';

const PIECES = [
  { id: 'galaxy', fr: 'Astrolabe', en: 'Astrolabe', no: '01' },
  { id: 'ludora', fr: 'Dé et plateau', en: 'Die and board', no: '02' },
  {
    id: 'magnotes',
    fr: 'Grimoire et fiches',
    en: 'Grimoire and notes',
    no: '03',
  },
];

uiTest(
  'galerie : le cartel suit la sculpture exposée, en FR et EN',
  async ({ page }) => {
    await openPortfolioUI(page);
    const plaque = page.locator('.exhibit-plaque');
    for (const piece of PIECES) {
      await page.evaluate(
        (id) => document.getElementById(id)?.scrollIntoView(),
        piece.id
      );
      await expect(plaque).toHaveAttribute('data-scene', piece.id);
      await expect(plaque.locator('.exhibit-plaque__no')).toHaveText(piece.no);
      await expect(plaque.locator('.exhibit-plaque__name')).toHaveText(
        piece.fr
      );
    }
    await page.locator('#lang-toggle').click();
    await expect(plaque.locator('.exhibit-plaque__name')).toHaveText(
      PIECES[2].en
    );
    // Le cartel est décoratif : il ne double pas le contenu pour les lecteurs d'écran.
    await expect(plaque).toHaveAttribute('aria-hidden', 'true');
  }
);

uiTest(
  'galerie : le cartel ne recouvre ni le dossier du chapitre ni le texte',
  async ({ page }) => {
    await openPortfolioUI(page);
    for (const piece of PIECES) {
      // Accès direct comme un visiteur : le lien d'ancre passe par le défilement
      // lissé (un saut natif synthétique est ramené en arrière par Lenis, y compris
      // sur la baseline).
      await page.evaluate((id) => {
        document.querySelector<HTMLElement>(`a[href="#${id}"]`)?.click();
      }, piece.id);
      await expect(page.locator('.exhibit-plaque')).toHaveAttribute(
        'data-scene',
        piece.id
      );
      await expect
        .poll(
          async () => {
            const plaque = await page.locator('.exhibit-plaque').boundingBox();
            const panel = await page
              .locator(`#${piece.id} .chapter__panel`)
              .boundingBox();
            if (!plaque || !panel) return 'absent';
            const apart =
              plaque.x >= panel.x + panel.width - 1 ||
              plaque.x + plaque.width <= panel.x + 1 ||
              plaque.y + plaque.height <= panel.y + 1 ||
              plaque.y >= panel.y + panel.height;
            const opacity = await page
              .locator('.exhibit-plaque')
              .evaluate((node) => getComputedStyle(node).opacity);
            const inside =
              plaque.x >= 0 &&
              plaque.x + plaque.width <= page.viewportSize()!.width;
            return apart && inside && opacity === '1' ? 'ok' : 'chevauche';
          },
          { timeout: 15_000 }
        )
        .toBe('ok');
    }
  }
);
