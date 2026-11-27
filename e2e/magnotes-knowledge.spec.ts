import { expect, test, type Locator, type Page } from '@playwright/test';
import { waitForScrollEnd } from './scroll-settle';

// Les vidéos de cette seule campagne fournissent la courte démonstration.
test.use({ video: 'on' });
async function readAt(page: Page, node: Locator, reduced: boolean) {
  await node.evaluate((element, reduced) => {
    const delta = element.getBoundingClientRect().top - 100;
    if (reduced) window.scrollBy({ top: delta, behavior: 'instant' });
    else
      window.dispatchEvent(
        new WheelEvent('wheel', {
          deltaY: delta,
          bubbles: true,
          cancelable: true,
        })
      );
  }, reduced);
  if (!reduced) await waitForScrollEnd(page);
}

for (const fallback of [false, true]) {
  test(`atelier MagNotes : une source, trois projections${fallback ? ' sans WebGL et mouvement réduit' : ''}`, async ({
    page,
    isMobile,
  }, info) => {
    // Le parcours inclut les deux instruments livrés et les mutations de l'atelier.
    test.setTimeout(240000);
    const errors: string[] = [],
      chunks: string[] = [],
      sockets: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('websocket', (socket) => sockets.push(socket.url()));
    page.on('request', (request) => {
      if (/\/MagnotesKnowledgeLab-[^/]+\.js/.test(request.url()))
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
    await page.goto('/');
    await expect(page.locator('#boot-loader')).toBeHidden({ timeout: 90000 });
    const navigate = async (id: string) => {
      await page.locator(`.rail__dot[data-rail="${id}"]`).click();
      if (!fallback) await waitForScrollEnd(page);
      await expect(
        page.locator(`#${id}`).getByRole('heading').first()
      ).toBeInViewport();
    };
    const act = async (node: Locator) => {
      await readAt(page, node, fallback);
      if (isMobile) await node.tap();
      else {
        await node.focus();
        await page.keyboard.press('Enter');
      }
    };
    if (!fallback)
      for (const id of ['intro', 'stack', 'freelance']) await navigate(id);
    await navigate('projects-intro');
    if (!fallback) {
      await navigate('galaxy');
      const galaxy = page.locator('#galaxy-observatory');
      await act(galaxy.locator('summary'));
      await expect(galaxy.locator('#galaxy-observatory-scale')).toBeVisible();
      await act(galaxy.locator('button[data-scale="100"]'));
      await expect(galaxy.locator('#galaxy-observatory-scale')).toHaveValue(
        '100'
      );
      await act(galaxy.locator('summary'));
      await navigate('ludora');
      const lab = page.locator('#ludora-sync-lab');
      await act(lab.locator('summary'));
      await expect(lab.locator('.sync-lab__instrument')).toBeVisible();
      await lab.getByRole('combobox').selectOption('100');
      await act(lab.locator('[data-peer="A"] [data-action="take"]'));
      for (const peer of ['A', 'server', 'B'])
        await expect(
          lab.locator(`[data-peer="${peer}"] .sync-lab__state`)
        ).toHaveAttribute('data-version', '1');
      await expect(lab.locator('.sync-lab__instrument')).toHaveAttribute(
        'data-pending',
        '0'
      );
      await act(lab.locator('summary'));
    }
    await navigate('magnotes');
    const details = page.locator('#magnotes-knowledge-lab');
    const summary = details.locator('summary');
    expect(chunks).toHaveLength(0);
    await expect(details.locator('.knowledge__instrument')).toHaveCount(0);
    await act(summary);
    const root = details.locator('.knowledge__instrument');
    await expect(root).toBeVisible();
    expect(chunks).toHaveLength(1);
    const panel = root.locator('#knowledge-projection');
    const selected = root.locator('#knowledge-selected');
    const status = root.locator('#knowledge-status');
    const due = root.locator('#knowledge-due');
    const projection = async (view: string) => {
      await act(root.locator(`[data-view="${view}"]`));
      await expect(root).toHaveAttribute('data-view', view);
      await expect(panel.locator('button[data-note]')).toHaveCount(3);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth - innerWidth
        )
      ).toBeLessThanOrEqual(1);
    };
    await expect(root).toHaveAttribute('data-revision', '0');
    await act(root.locator('[data-move="up"]'));
    await expect(root.getByRole('status')).toContainText('Déplacement refusé');
    await expect(root).toHaveAttribute('data-revision', '0');
    await act(root.locator('[data-move="right"]'));
    await expect(root.locator('.knowledge__position')).toContainText(
      'N01 (1, 0)'
    );
    await readAt(page, status, fallback);
    if (isMobile) await status.selectOption('clear');
    else {
      await status.focus();
      await page.keyboard.press('End');
    }
    await expect(status).toHaveValue('clear');
    await due.selectOption('7');
    await expect(root).toHaveAttribute('data-revision', '3');
    await act(root.locator('[data-move="down"]'));
    await expect(root.getByRole('status')).toContainText('case occupée');
    await expect(root).toHaveAttribute('data-revision', '3');
    if (!fallback && info.project.name === 'desktop-chromium')
      console.log(
        `DEMO_START_SECONDS=${await page.evaluate(() => performance.now() / 1000)}`
      );
    for (const view of ['graph', 'kanban', 'timeline']) {
      await projection(view);
      const note = panel.locator('[data-note="N01"]');
      await expect(note).toContainText('Clarifié');
      await expect(note).toContainText('Jour 7');
      await expect(note).toContainText('(1, 0)');
      if (view === 'graph') {
        await expect(panel.locator('[data-relation="R01"]')).toHaveAttribute(
          'x1',
          '500'
        );
        await expect(panel.locator('[data-relation="R01"]')).toHaveAttribute(
          'y1',
          '72'
        );
      } else if (view === 'kanban')
        await expect(
          panel.locator('[data-column="clear"] [data-note="N01"]')
        ).toBeVisible();
      else
        await expect(
          panel.locator('[data-day="7"] [data-note="N01"]')
        ).toBeVisible();
      const captureView =
        info.project.name === 'desktop-chromium'
          ? 'graph'
          : info.project.name === 'android-chromium'
            ? 'kanban'
            : 'timeline';
      if (!fallback && view === captureView) {
        await readAt(page, root.locator('.knowledge__views'), false);
        await page.screenshot({
          path: info.outputPath('magnotes-projection.png'),
          scale: 'css',
        });
      }
    }
    await act(panel.locator('[data-note="N02"]'));
    await expect(selected).toHaveValue('N02');
    // Le toucher iOS ne donne pas nécessairement le focus : vérifier séparément
    // la sélection tactile et la conservation du focus lors d'une activation clavier.
    await panel.locator('[data-note="N02"]').focus();
    await page.keyboard.press('Enter');
    await expect(panel.locator('[data-note="N02"]')).toBeFocused();
    await act(summary);
    await expect(details).not.toHaveAttribute('open', '');
    await act(summary);
    await expect(root).toHaveAttribute('data-view', 'timeline');
    await expect(root).toHaveAttribute('data-revision', '3');
    await expect(selected).toHaveValue('N02');
    expect(chunks).toHaveLength(1);
    await selected.selectOption('N01');
    await page.locator('#lang-toggle').click();
    await expect(summary).toHaveText('Connect ideas, change perspective');
    await expect(root).toHaveAttribute('data-revision', '3');
    await expect(status).toHaveValue('clear');
    await expect(due).toHaveValue('7');
    await expect(panel.locator('[data-note="N01"]')).toContainText(
      'N01 · Observe'
    );
    await expect(panel.locator('[data-note="N01"]')).toContainText(
      'Clarified · Day 7'
    );
    await expect(root.locator('.knowledge__relations')).toHaveText(
      'Fixed relations : N01 → N02 ; N02 → N03'
    );
    await projection('graph');
    await expect(panel.locator('[data-relation="R01"]')).toHaveAttribute(
      'x1',
      '500'
    );
    await act(root.locator('.knowledge__reset'));
    await expect(root).toHaveAttribute('data-revision', '0');
    await expect(root).toHaveAttribute('data-view', 'graph');
    await expect(status).toHaveValue('explore');
    await expect(due).toHaveValue('1');
    await expect(root.locator('.knowledge__position')).toContainText(
      'N01 (0, 0)'
    );
    await expect(panel.locator('[data-relation="R01"]')).toHaveAttribute(
      'x1',
      '200'
    );
    await act(summary);
    await expect(page.locator('.technical')).toHaveCount(5);
    for (const id of ['galaxy', 'ludora', 'magnotes'])
      expect(
        await page
          .locator(`#${id} .chapter__beat--context`)
          .evaluate((node) => [...node.children].map((child) => child.tagName))
      ).toEqual(['HEADER', 'A', 'FIGURE']);
    await expect(page.locator('#galaxy-observatory summary')).toHaveText(
      'Experiment with scale'
    );
    await expect(page.locator('#ludora-sync-lab summary')).toHaveText(
      'Experiment with multiplayer'
    );
    for (const id of ['studies', 'contact']) await navigate(id);
    await expect(page.locator('canvas')).toHaveCount(1);
    expect(errors).toEqual([]);
    expect(sockets).toEqual([]);
  });
}
