import { expect, test, type Locator } from '@playwright/test';
import { waitForScrollEnd } from './scroll-settle';

test.use({ video: 'on' });
for (const fallback of [false, true]) {
  test(`musée AG : récit et cinq instruments${fallback ? ' sans WebGL et mouvement réduit' : ''}`, async ({
    page,
    isMobile,
  }, info) => {
    test.setTimeout(360000);
    const errors: string[] = [],
      chunks: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('request', (request) => {
      if (
        /\/(GalaxyObservatory|LudoraSyncLab|MagnotesKnowledgeLab|AigenExecutionLab|SiteguardianResilienceLab)-[^/]+\.js/.test(
          request.url()
        )
      )
        chunks.push(request.url());
    });
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
    const overflow = async () =>
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth - innerWidth
        )
      ).toBeLessThanOrEqual(1);
    const nav = async (id: string) => {
      await page.locator(`.rail__dot[data-rail="${id}"]`).click();
      if (!fallback) await waitForScrollEnd(page);
      await expect(
        page.locator(`#${id}`).getByRole('heading').first()
      ).toBeInViewport();
    };
    const act = async (node: Locator) => {
      const readable = await node.evaluate((element) => {
        const r = element.getBoundingClientRect();
        return r.top >= 80 && r.bottom <= innerHeight - 160;
      });
      if (!readable) {
        await node.evaluate((element, reduced) => {
          const top = element.getBoundingClientRect().top - 100;
          if (reduced) window.scrollBy({ top, behavior: 'instant' });
          else
            window.dispatchEvent(
              new WheelEvent('wheel', {
                deltaY: top,
                bubbles: true,
                cancelable: true,
              })
            );
        }, fallback);
        if (!fallback) await waitForScrollEnd(page);
      }
      if (isMobile) await node.tap();
      else {
        await node.focus();
        await page.keyboard.press('Enter');
      }
    };
    await page.goto('/');
    await expect(page.locator('#boot-loader')).toBeHidden({ timeout: 90000 });
    await expect(page.locator('.hero__edition')).toHaveText(
      'AG — Le musée des systèmes'
    );
    await expect(page.locator('.hero__cta--primary')).toBeInViewport();
    await overflow();
    for (const id of [
      'intro',
      'stack',
      'freelance',
      'projects-intro',
      'galaxy',
    ])
      await nav(id);
    expect(chunks).toHaveLength(0);
    const galaxy = page.locator('#galaxy-observatory');
    await act(galaxy.locator('summary'));
    await act(galaxy.locator('[data-scale="100"]'));
    await expect(galaxy.locator('#galaxy-observatory-scale')).toHaveValue(
      '100'
    );
    await overflow();
    await act(galaxy.locator('summary'));
    await nav('ludora');
    const ludora = page.locator('#ludora-sync-lab');
    await act(ludora.locator('summary'));
    if (!fallback && info.project.name === 'iphone-webkit')
      await page.screenshot({
        path: info.outputPath('ludora-iphone.png'),
        scale: 'css',
      });
    await ludora.getByRole('combobox').selectOption('100');
    await act(ludora.locator('[data-peer="A"] [data-action="take"]'));
    for (const peer of ['A', 'server', 'B'])
      await expect(
        ludora.locator(`[data-peer="${peer}"] .sync-lab__state`)
      ).toHaveAttribute('data-version', '1');
    await overflow();
    await act(ludora.locator('summary'));
    await nav('magnotes');
    const knowledge = page.locator('#magnotes-knowledge-lab');
    await act(knowledge.locator('summary'));
    if (!fallback && info.project.name === 'iphone-webkit')
      await page.screenshot({
        path: info.outputPath('magnotes-iphone.png'),
        scale: 'css',
      });
    await act(knowledge.locator('[data-move="right"]'));
    await expect(knowledge.locator('.knowledge__position')).toContainText(
      'N01 (1, 0)'
    );
    await overflow();
    await act(knowledge.locator('summary'));
    await nav('studies');
    const aigen = page.locator('#aigen-execution-lab');
    await act(aigen.locator('summary'));
    await act(aigen.locator('.execution__submit'));
    await expect(aigen.locator('[data-task="J01"]')).toHaveAttribute(
      'data-state',
      'succeeded',
      { timeout: 15000 }
    );
    await expect(aigen.locator('.execution__proof').first()).toContainText(
      'J01/a1'
    );
    await overflow();
    await act(aigen.locator('summary'));
    const resilience = page.locator('#siteguardian-resilience-lab');
    await act(resilience.locator('summary'));
    const root = resilience.locator('.resilience__instrument');
    for (let index = 0; index < 3; index++)
      await act(root.locator('button[data-probe="failure"]'));
    await expect(root).toHaveAttribute('data-state', 'incident');
    await act(root.locator('button[data-probe="success"]'));
    await act(root.locator('button[data-probe="failure"]'));
    await expect(root).toHaveAttribute('data-active', 'I01');
    await expect(root).toHaveAttribute('data-opened', '1');
    await act(page.locator('#lang-toggle'));
    await expect(page.locator('.hero__edition')).toHaveText(
      'AG — The museum of systems'
    );
    await expect(root.locator('.resilience__state')).toHaveText(
      'Confirmed incident'
    );
    for (let index = 0; index < 3; index++)
      await act(root.locator('button[data-probe="success"]'));
    await expect(root).toHaveAttribute('data-resolved', '1');
    await overflow();
    await act(root.locator('.resilience__reset'));
    await expect(root).toHaveAttribute('data-opened', '0');
    await act(resilience.locator('summary'));
    await act(resilience.locator('summary'));
    await expect(root).toHaveAttribute('data-state', 'operational');
    await act(resilience.locator('summary'));
    expect(chunks).toHaveLength(5);
    await expect(page.locator('.instrument-exhibit')).toHaveCount(5);
    await expect(page.locator('.technical')).toHaveCount(5);
    await nav('contact');
    // Retour complet puis accès direct, sans modifier le moteur de défilement.
    for (const id of [
      'studies',
      'magnotes',
      'ludora',
      'galaxy',
      'projects-intro',
      'freelance',
      'stack',
      'intro',
      'top',
    ])
      await nav(id);
    // Le CTA principal est l'accès commun à tous les formats ; les raccourcis
    // nominatifs sont plus bas sur écran court dans la composition existante.
    // On le touche en place, sans faire sortir le héros de son état de lecture.
    const direct = page.locator('.hero__cta--primary');
    await expect(page.locator('.hero__inner')).toHaveCSS('opacity', '1');
    await expect(direct).toBeInViewport();
    if (isMobile) await direct.tap();
    else {
      await direct.focus();
      await page.keyboard.press('Enter');
    }
    if (!fallback) await waitForScrollEnd(page);
    // Le CTA ouvre le seuil des produits, pas directement une fiche.
    await expect(
      page.locator('#projects-intro .project-threshold__title')
    ).toBeInViewport();
    await expect(page.locator('.exhibit-plaque')).toHaveAttribute(
      'data-scene',
      'selection'
    );
    // Saut direct par la palette existante, disponible sur tous les formats.
    await page.keyboard.press('Control+k');
    const search = page.locator('.palette__input');
    await expect(search).toBeVisible();
    await search.fill('Galaxy');
    await search.press('Enter');
    if (!fallback) await waitForScrollEnd(page);
    await expect(page.locator('.exhibit-plaque')).toHaveAttribute(
      'data-scene',
      'galaxy'
    );
    await expect(page.locator('#galaxy .chapter__name')).toBeInViewport();
    await page.locator('.rail__dot[data-rail="ludora"]').click();
    await page.locator('.rail__dot[data-rail="magnotes"]').click();
    if (!fallback) await waitForScrollEnd(page);
    await expect(page.locator('.exhibit-plaque')).toHaveAttribute(
      'data-scene',
      'magnotes'
    );
    await expect(page.locator('#magnotes .chapter__name')).toBeInViewport();
    await expect(page.locator('canvas')).toHaveCount(1);
    await overflow();
    expect(errors).toEqual([]);
  });
}
