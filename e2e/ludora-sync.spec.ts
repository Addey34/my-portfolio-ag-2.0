import { expect, test, type Locator, type Page } from '@playwright/test';
import { waitForScrollEnd } from './scroll-settle';

// La vidéo du parcours sert aussi de source à la courte démonstration, sans nouveau navigateur.
test.use({ video: 'on' });

async function readAt(page: Page, locator: Locator, reduced: boolean) {
  await locator.evaluate((node, reduced) => {
    const delta = node.getBoundingClientRect().top - 100;
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
  // L'horloge du fallback est suspendue ; le défilement natif est instantané.
  if (!reduced) await waitForScrollEnd(page);
}

for (const fallback of [false, true]) {
  test(`plateau Ludora : autorité, rejet et convergence${fallback ? ' sans WebGL et mouvement réduit' : ''}`, async ({
    page,
    isMobile,
  }, info) => {
    test.setTimeout(180000);
    const errors: string[] = [];
    const chunks: string[] = [];
    const remoteSockets: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('websocket', (socket) => remoteSockets.push(socket.url()));
    page.on('request', (request) => {
      if (/\/LudoraSyncLab-[^/]+\.js/.test(request.url()))
        chunks.push(request.url());
    });
    if (fallback) {
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.clock.install({ time: new Date('2030-01-01T00:00:00Z') });
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
    // Le rail mobile n'expose que les voisins du chapitre courant : Ludora
    // est hors écran depuis le héros. Le seuil Produits est un accès visible.
    await page.locator('.rail__dot[data-rail="projects-intro"]').click();
    if (!fallback) await waitForScrollEnd(page);
    await page.locator('.rail__dot[data-rail="ludora"]').click();
    if (!fallback) await waitForScrollEnd(page);
    const details = page.locator('#ludora-sync-lab');
    const summary = details.locator('summary');
    await readAt(page, summary, fallback);
    expect(chunks).toHaveLength(0);
    await expect(details.locator('.sync-lab__instrument')).toHaveCount(0);
    if (isMobile) await summary.tap();
    else {
      await summary.focus();
      await page.keyboard.press('Enter');
    }
    const root = details.locator('.sync-lab__instrument');
    await expect(root).toBeVisible();
    expect(chunks).toHaveLength(1);
    if (fallback) await page.clock.pauseAt(new Date('2030-01-01T01:00:00Z'));
    const state = (peer: string) =>
      root.locator(`[data-peer="${peer}"] .sync-lab__state`);
    const button = (peer: string, action = 'take') =>
      root.locator(`[data-peer="${peer}"] [data-action="${action}"]`);
    const log = root.locator('.sync-lab__log');
    const select = root.getByRole('combobox');
    const act = async (target: Locator) => {
      await readAt(page, target, fallback);
      if (isMobile) await target.tap();
      else {
        await target.focus();
        await page.keyboard.press('Enter');
      }
    };
    const converge = async (version: number, delay: number) => {
      if (fallback && delay > 0) {
        await page.clock.fastForward(delay);
        await page.clock.fastForward(delay);
      }
      for (const peer of ['A', 'server', 'B'])
        await expect(state(peer)).toHaveAttribute(
          'data-version',
          String(version),
          { timeout: 10000 }
        );
      await expect(root).toHaveAttribute('data-pending', '0');
    };
    await expect(select.locator('option')).toHaveCount(3);
    if (!fallback && info.project.name === 'desktop-chromium')
      console.log(
        `DEMO_START_SECONDS=${await page.evaluate(() => performance.now() / 1000)}`
      );
    await select.selectOption('1400');
    await act(button('B'));
    await converge(0, 1400);
    await expect(log).toContainText('ce n’est pas votre tour');
    await expect(root.getByRole('status')).toContainText('rejet');
    await act(button('A'));
    if (fallback) {
      await expect(state('server')).toHaveAttribute('data-version', '0');
      await page.clock.fastForward(1400);
      await expect(state('server')).toHaveAttribute('data-version', '1');
      await expect(state('B')).toHaveAttribute('data-version', '0');
      await page.clock.fastForward(1400);
    }
    await converge(1, 0);
    await act(button('B', 'stale'));
    await converge(1, 1400);
    await expect(log).toContainText('version obsolète (v0 ≠ v1)');
    if (!fallback) {
      const target =
        info.project.name === 'iphone-webkit'
          ? root.locator('.sync-lab__status')
          : root.locator('.sync-lab__board');
      await readAt(page, target, false);
      await page.screenshot({
        path: info.outputPath('ludora-authority.png'),
        scale: 'css',
      });
    }
    await select.selectOption('100');
    await act(button('B'));
    await converge(2, 100);
    // Réinitialisation alors qu'une commande ou sa propagation est en transit.
    await select.selectOption('1400');
    await act(button('A'));
    if (fallback) await page.clock.fastForward(1400);
    await act(root.locator('.sync-lab__reset'));
    if (fallback) await page.clock.fastForward(10000);
    await converge(0, 0);
    await expect(log).toContainText('Nouvelle manche');
    // Le changement de langue ne doit pas annuler une commande en attente.
    await act(button('A'));
    await page.locator('#lang-toggle').click();
    await expect(summary).toHaveText('Experiment with multiplayer');
    await converge(1, 1400);
    await expect(state('server')).toContainText('4 tokens');
    await expect(button('B')).toHaveAccessibleName('Take 1 · B');
    await expect(root.locator('.sync-lab__note').last()).toContainText(
      'no connection to Ludora or Nakama'
    );
    // Fermer en transit annule également les réponses et recrée une manche saine.
    await act(button('B'));
    await act(summary);
    await expect(details).not.toHaveAttribute('open', '');
    if (fallback) await page.clock.fastForward(10000);
    await act(summary);
    await converge(0, 0);
    expect(chunks).toHaveLength(1);
    await expect(root.locator('.sync-lab__log')).toContainText('New round');
    await act(summary);
    await expect(page.locator('.technical')).toHaveCount(5);
    await expect(page.locator('#galaxy-observatory summary')).toHaveText(
      'Experiment with scale'
    );
    for (const id of ['galaxy', 'ludora', 'magnotes']) {
      expect(
        await page
          .locator(`#${id} .chapter__beat--context`)
          .evaluate((node) => [...node.children].map((child) => child.tagName))
      ).toEqual(['HEADER', 'A', 'FIGURE']);
    }
    if (fallback) await page.clock.resume();
    for (const id of ['magnotes', 'studies', 'contact']) {
      await page.locator(`.rail__dot[data-rail="${id}"]`).click();
      if (!fallback) await waitForScrollEnd(page);
      await expect(
        page.locator(`#${id}`).getByRole('heading').first()
      ).toBeInViewport();
    }
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth - innerWidth
      )
    ).toBeLessThanOrEqual(1);
    await expect(page.locator('canvas')).toHaveCount(1);
    expect(errors).toEqual([]);
    expect(remoteSockets).toEqual([]);
  });
}
