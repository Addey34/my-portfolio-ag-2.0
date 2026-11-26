import { expect, test } from '@playwright/test';
import { waitForScrollEnd } from './scroll-settle';

for (const fallback of [false, true]) {
  test(`lecture technique des cinq projets : FR/EN, schémas et preuves${fallback ? ' sans WebGL et mouvement réduit' : ''}`, async ({
    page,
  }, info) => {
    test.setTimeout(120_000);
    if (fallback) {
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.addInitScript(() => {
        const original = HTMLCanvasElement.prototype.getContext;
        HTMLCanvasElement.prototype.getContext = function (
          type: string,
          ...args: unknown[]
        ) {
          return type.includes('webgl')
            ? null
            : Reflect.apply(original, this, [type, ...args]);
        } as typeof original;
      });
    }
    await page.goto('/');
    await expect(page.locator('#boot-loader')).toBeHidden({ timeout: 90_000 });
    for (const locale of ['fr', 'en']) {
      if (locale === 'en') await page.locator('#lang-toggle').click();
      for (const [id, count, fr, en] of [
        ['galaxy', 3, 'Éphémérides', 'Ephemerides'],
        ['ludora', 3, 'Une page par jeu', 'One page per game'],
        ['magnotes', 3, 'Notes + liens', 'Notes + links'],
        ['siteguardian', 6, 'Nouvelle vérification', 'Fresh check'],
        ['imagegeneratorlocal', 4, 'Agent local associé', 'Paired local agent'],
      ] as const) {
        // Même accès d'ancre que le visiteur, compatible avec Lenis.
        await page.evaluate(
          (id) =>
            document
              .querySelector<HTMLAnchorElement>(`a[href="#${id}"]`)
              ?.click(),
          id
        );
        await waitForScrollEnd(page);
        const figure = page.locator(`#${id} .technical`);
        await expect(figure).toHaveAccessibleName(/.+/);
        await expect(figure.locator('li')).toHaveCount(count);
        await expect(figure).toContainText(locale === 'fr' ? fr : en);
        await expect(figure.locator('.technical__skill')).not.toBeEmpty();
        // Lecture sous le HUD : le centrage de MagNotes tombe dans la zone
        // d'aimantation du titre sur Android et ramène la fiche en arrière.
        await figure.evaluate((node) =>
          window.scrollTo({
            top: node.getBoundingClientRect().top + scrollY - 88,
            behavior: 'instant',
          })
        );
        await waitForScrollEnd(page);
        await expect(figure).toBeInViewport({ ratio: 0.98 });
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth - innerWidth
          )
        ).toBeLessThanOrEqual(1);
        const geometry = await figure.evaluate((node) => {
          const box = node.getBoundingClientRect();
          return [...node.querySelectorAll('li')].every((item) => {
            const r = item.getBoundingClientRect();
            return (
              r.left >= box.left - 1 &&
              r.right <= box.right + 1 &&
              item.scrollWidth <= item.clientWidth + 1
            );
          });
        });
        expect(geometry).toBe(true);
        await page.screenshot({
          path: info.outputPath(
            `${locale}-${id}${fallback ? '-fallback' : ''}.png`
          ),
          scale: 'css',
        });
        const evidence = page.locator(`#${id} .ledger__row--evidence`);
        await expect(evidence).not.toBeEmpty();
        const link = page
          .locator(`#${id} .chapter__links a, #${id} .study__links a`)
          .first();
        await link.focus();
        await expect(link).toBeFocused();
      }
    }
  });
}

const cases = [
  {
    id: 'ludora',
    href: 'https://ludora.adrianguichard.dev/',
    fr: 'Catalogue de jeux de Ludora.',
    proof: 'Pas de chiffres d’usage',
    en: 'Ludora game catalogue.',
  },
  {
    id: 'magnotes',
    href: 'https://magnotes.adrianguichard.dev/',
    fr: 'Tableau de notes dans la vue canvas de MagNotes.',
    proof: 'Tests E2E',
    en: 'A notes board in the MagNotes canvas view.',
  },
];

test('aperçus Ludora et MagNotes : démos, clavier, toucher et langues', async ({
  page,
}, testInfo) => {
  await page.goto('/');
  for (const item of cases) {
    const exhibit = page.locator(`#${item.id} .chapter__exhibit`);
    await expect(exhibit).toHaveAttribute('href', item.href);
    const image = exhibit.locator('img');
    await expect(image).toHaveAttribute('alt', item.fr);
    await exhibit.scrollIntoViewIfNeeded();
    await expect(exhibit).toBeVisible();
    await expect(
      page.locator(`#${item.id} .chapter__beat--outcome`)
    ).toContainText(item.proof);
    await expect
      .poll(() => image.evaluate((node: HTMLImageElement) => node.naturalWidth))
      .toBeGreaterThan(0);
    await exhibit.evaluate((node) =>
      node.addEventListener('click', (event) => {
        event.preventDefault();
        node.setAttribute(
          'data-activated',
          String(Number(node.getAttribute('data-activated') || 0) + 1)
        );
      })
    );
    await exhibit.focus();
    await page.keyboard.press('Enter');
    await expect(exhibit).toHaveAttribute('data-activated', '1');
    if (testInfo.project.name === 'desktop-chromium') await exhibit.click();
    else await exhibit.tap();
    await expect(exhibit).toHaveAttribute('data-activated', '2');
  }
  await page.locator('#lang-toggle').click();
  for (const item of cases) {
    await expect(
      page.locator(`#${item.id} .chapter__exhibit img`)
    ).toHaveAttribute('alt', item.en);
  }
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)
  ).toBeLessThanOrEqual(1);
});
