import { expect, test, type Page } from '@playwright/test';
import { waitForScrollEnd } from './scroll-settle';

/**
 * Raccords articulés (Solutions → Sélection, Galaxy → Ludora, Ludora → MagNotes) :
 * traversée à l'endroit, à l'envers, interrompue en plein raccord et par accès
 * direct. Aucun raccord ne doit lever d'erreur ni laisser une pièce hors place.
 */
async function openStory(page: Page): Promise<string[]> {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await page.waitForFunction(
    () => !document.getElementById('boot-loader'),
    null,
    {
      timeout: 90_000,
    }
  );
  await page.waitForTimeout(1500);
  return errors;
}

async function scrollToSection(
  page: Page,
  id: string,
  viewportFraction: number
): Promise<void> {
  await page.evaluate(
    ([target, fraction]) => {
      const element = document.getElementById(target as string);
      if (!element) throw new Error(`Section absente : ${target}`);
      window.scrollTo(
        0,
        element.getBoundingClientRect().top +
          window.scrollY -
          window.innerHeight * (fraction as number)
      );
    },
    [id, viewportFraction]
  );
}

test('les raccords articulés se traversent, s’interrompent et se remontent sans erreur', async ({
  page,
}) => {
  // Parcours long en rendu logiciel : budget dédié (la baseline dépasse aussi 45 s).
  test.setTimeout(150_000);
  const errors = await openStory(page);
  const crossings = ['projects-intro', 'ludora', 'magnotes'];
  for (const id of crossings) {
    // Descente par paliers dans le raccord, puis demi-tour au milieu.
    for (const fraction of [1.1, 0.8, 0.55, 0.35]) {
      await scrollToSection(page, id, fraction);
      await page.waitForTimeout(350);
    }
    for (const fraction of [0.55, 0.8, 1.1]) {
      await scrollToSection(page, id, fraction);
      await page.waitForTimeout(350);
    }
    // Reprise de la descente jusqu'au chapitre.
    await scrollToSection(page, id, 0);
    await waitForScrollEnd(page);
    await expect(page.locator(`#${id}`)).toBeInViewport({ ratio: 0.05 });
  }
  expect(errors).toEqual([]);
});

test('accès direct à un chapitre après un raccord articulé', async ({
  page,
}) => {
  const errors = await openStory(page);
  await page.goto('/#magnotes');
  await page.waitForFunction(
    () => !document.getElementById('boot-loader'),
    null,
    {
      timeout: 90_000,
    }
  );
  await page.waitForTimeout(2500);
  await expect(page.locator('#magnotes')).toBeInViewport({ ratio: 0.05 });
  await expect(page.locator('#world-3d')).toBeVisible();
  expect(errors).toEqual([]);
});

test.describe('mouvement réduit', () => {
  test.use({ reducedMotion: 'reduce' });

  test('les raccords restent lisibles sans animation', async ({ page }) => {
    const errors = await openStory(page);
    for (const id of ['projects-intro', 'ludora', 'magnotes']) {
      await scrollToSection(page, id, 0);
      await page.waitForTimeout(500);
      await expect(page.locator(`#${id}`)).toBeInViewport({ ratio: 0.05 });
    }
    expect(errors).toEqual([]);
  });
});
