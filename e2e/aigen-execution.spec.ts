import { expect, test, type Locator } from '@playwright/test';
import {
  DISPATCH_DELAY,
  EXECUTION_STEP,
} from '../src/visual/aigenExecutionModel';
import { waitForScrollEnd } from './scroll-settle';

// Vidéos réutilisables pour la courte démo ; aucune seconde campagne d'enregistrement.
test.use({ video: 'on' });
for (const fallback of [false, true]) {
  test(`chaîne AIGen : FIFO, annulation et relance${fallback ? ' sans WebGL et mouvement réduit' : ''}`, async ({
    page,
    isMobile,
  }, info) => {
    test.setTimeout(240000);
    const recordingStart = Date.now();
    // Pauses de lecture de la vidéo, sans rôle dans les assertions temporelles.
    const demoHold = async () => {
      if (!fallback && info.project.name === 'desktop-chromium')
        await new Promise((resolve) => setTimeout(resolve, 900));
    };
    const errors: string[] = [],
      chunks: string[] = [],
      sockets: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('websocket', (socket) => sockets.push(socket.url()));
    page.on('request', (request) => {
      if (/\/AigenExecutionLab-[^/]+\.js/.test(request.url()))
        chunks.push(request.url());
    });
    await page.clock.install({ time: new Date('2030-01-01T00:00:00Z') });
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
    let paused = false;
    const readAt = async (node: Locator) => {
      if (paused || fallback) {
        await node.evaluate((element) =>
          window.scrollBy({
            top: element.getBoundingClientRect().top - 100,
            behavior: 'instant',
          })
        );
      } else {
        await node.evaluate((element) =>
          window.dispatchEvent(
            new WheelEvent('wheel', {
              deltaY: element.getBoundingClientRect().top - 100,
              bubbles: true,
              cancelable: true,
            })
          )
        );
        await waitForScrollEnd(page);
      }
    };
    const act = async (node: Locator) => {
      // L'horloge suspendue empêche Lenis de concurrencer le placement natif.
      if (paused) await node.scrollIntoViewIfNeeded();
      else await readAt(node);
      if (isMobile) await node.tap();
      else {
        await node.focus();
        await page.keyboard.press('Enter');
      }
    };
    const navigate = async (id: string) => {
      await page.locator(`.rail__dot[data-rail="${id}"]`).click();
      if (!fallback) await waitForScrollEnd(page);
      await expect(
        page.locator(`#${id}`).getByRole('heading').first()
      ).toBeInViewport();
    };
    await page.goto('/');
    await expect(page.locator('#boot-loader')).toBeHidden({ timeout: 90000 });
    if (!fallback)
      for (const id of ['intro', 'stack', 'freelance']) await navigate(id);
    await navigate('projects-intro');
    for (const id of ['galaxy', 'ludora', 'magnotes']) {
      await navigate(id);
      // Les corps compilés des trois instruments sont inchangés ; un smoke
      // desktop complète les preuves mobiles de production déjà acquises.
      if (!fallback && info.project.name === 'desktop-chromium') {
        const details = page.locator(
          id === 'galaxy'
            ? '#galaxy-observatory'
            : id === 'ludora'
              ? '#ludora-sync-lab'
              : '#magnotes-knowledge-lab'
        );
        await act(details.locator('summary'));
        if (id === 'galaxy') {
          await expect(
            details.locator('.observatory__instrument')
          ).toBeVisible();
          await act(details.locator('button[data-scale="100"]'));
          await expect(
            details.locator('#galaxy-observatory-scale')
          ).toHaveValue('100');
        } else if (id === 'ludora') {
          await expect(details.locator('.sync-lab__instrument')).toBeVisible();
          await details.getByRole('combobox').selectOption('100');
          await act(details.locator('[data-peer="A"] [data-action="take"]'));
          await expect(
            details.locator('[data-peer="B"] .sync-lab__state')
          ).toHaveAttribute('data-version', '1');
        } else {
          await expect(details.locator('.knowledge__instrument')).toBeVisible();
          await act(details.locator('[data-move="right"]'));
          await expect(details.locator('.knowledge__position')).toContainText(
            'N01 (1, 0)'
          );
        }
        await act(details.locator('summary'));
      }
    }
    await navigate('studies');
    const details = page.locator('#aigen-execution-lab');
    const summary = details.locator('summary');
    expect(chunks).toHaveLength(0);
    await expect(details.locator('.execution__instrument')).toHaveCount(0);
    await act(summary);
    const root = details.locator('.execution__instrument');
    await expect(root).toBeVisible();
    await readAt(root);
    await page.clock.pauseAt(new Date('2030-01-01T01:00:00Z'));
    paused = true;
    expect(chunks).toHaveLength(1);
    const job = (id: string) => root.locator(`[data-task="${id}"]`);
    const submit = root.locator('.execution__submit');
    const reset = root.locator('.execution__reset');
    const state = async (id: string, value: string) =>
      expect(job(id)).toHaveAttribute('data-state', value);
    const advance = async (steps: number) => {
      for (let index = 0; index < steps; index++)
        await page.clock.fastForward(EXECUTION_STEP);
    };
    const oneWorker = async () =>
      expect(root.locator('[data-state="running"]')).toHaveCount(1);
    await act(submit);
    await root.locator('input[type="checkbox"]').check();
    await act(submit);
    await act(submit);
    await act(submit);
    await expect(root).toHaveAttribute('data-count', '4');
    await expect(submit).toBeDisabled();
    await expect(root.locator('[data-state="queued"]')).toHaveCount(4);
    await expect(root.locator('.execution__chain')).toContainText(
      'J01/a1 → J02/a1 → J03/a1 → J04/a1'
    );
    await act(job('J03').locator('[data-action="cancel"]'));
    await state('J03', 'cancelled');
    await page.clock.fastForward(DISPATCH_DELAY);
    await state('J01', 'running');
    await oneWorker();
    await advance(1);
    await expect(job('J01').locator('progress')).toHaveJSProperty('value', 25);
    if (!fallback && info.project.name === 'desktop-chromium') {
      console.log(`DEMO_START_SECONDS=${(Date.now() - recordingStart) / 1000}`);
      await readAt(root.locator('.execution__chain'));
      await page.screenshot({
        path: info.outputPath('aigen-execution.png'),
        scale: 'css',
      });
      await demoHold();
    }
    await act(job('J01').locator('[data-action="cancel"]'));
    await state('J01', 'cancelled');
    await page.clock.fastForward(DISPATCH_DELAY);
    await state('J02', 'running');
    await advance(2);
    await state('J02', 'failed');
    await demoHold();
    await expect(job('J02').locator('[data-action="restart"]')).toBeEnabled();
    await act(job('J02').locator('[data-action="restart"]'));
    await expect(job('J02')).toHaveAttribute('data-attempt', '2');
    await state('J02', 'queued');
    await expect(root.locator('.execution__chain')).toContainText(
      'J04/a1 → J02/a2'
    );
    await page.clock.fastForward(DISPATCH_DELAY);
    await state('J04', 'running');
    await oneWorker();
    await demoHold();
    if (!fallback && info.project.name === 'iphone-webkit') {
      await readAt(root.locator('.execution__tasks'));
      await page.screenshot({
        path: info.outputPath('aigen-execution.png'),
        scale: 'css',
      });
    }
    await advance(4);
    await state('J04', 'succeeded');
    await expect(job('J04').locator('.execution__proof')).toContainText(
      'J04/a1'
    );
    await page.clock.fastForward(DISPATCH_DELAY);
    await state('J02', 'running');
    await advance(1);
    await oneWorker();
    if (!fallback && info.project.name === 'android-chromium') {
      await readAt(root.locator('.execution__tasks'));
      await page.screenshot({
        path: info.outputPath('aigen-execution.png'),
        scale: 'css',
      });
    }
    await advance(3);
    await state('J02', 'succeeded');
    await expect(job('J02').locator('.execution__proof')).toContainText(
      'J02/a2'
    );
    await demoHold();
    await expect(root).toHaveAttribute('data-active', '');
    await expect(root).toHaveAttribute('data-pending', 'false');
    for (const id of ['J01', 'J03'])
      await expect(job(id).locator('.execution__proof')).toHaveAttribute(
        'data-result',
        ''
      );
    await act(reset);
    await act(submit);
    await page.clock.fastForward(DISPATCH_DELAY);
    await advance(1);
    await act(reset);
    await page.clock.fastForward(10000);
    await expect(root).toHaveAttribute('data-count', '0');
    await expect(root).toHaveAttribute('data-pending', 'false');
    await act(submit);
    await page.clock.fastForward(DISPATCH_DELAY);
    await advance(1);
    await page.locator('#lang-toggle').click();
    await page.clock.runFor(32);
    await expect(summary).toHaveText('Operate the execution chain');
    await expect(job('J01').locator('.execution__state')).toHaveText('Running');
    await expect(job('J01').locator('progress')).toHaveJSProperty('value', 25);
    await expect(job('J01')).toHaveAttribute('data-attempt', '1');
    await expect(root.locator('.execution__note').last()).toContainText(
      'No GPU, AI model, real local agent or network call'
    );
    await act(summary);
    await expect(details).not.toHaveAttribute('open', '');
    await page.clock.fastForward(10000);
    await expect(root).toHaveAttribute('data-count', '0');
    await expect(root).toHaveAttribute('data-pending', 'false');
    await act(summary);
    await expect(root).toHaveAttribute('data-count', '0');
    expect(chunks).toHaveLength(1);
    await act(submit);
    await page.clock.fastForward(DISPATCH_DELAY);
    await advance(4);
    await state('J01', 'succeeded');
    await expect(job('J01').locator('.execution__proof')).toContainText(
      'J01/a1'
    );
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth - innerWidth
      )
    ).toBeLessThanOrEqual(1);
    await act(summary);
    await expect(page.locator('.technical')).toHaveCount(5);
    for (const [id, count] of [
      ['galaxy', 3],
      ['ludora', 3],
      ['magnotes', 3],
      ['siteguardian', 6],
      ['imagegeneratorlocal', 4],
    ] as const) {
      await expect(page.locator(`#${id} .technical__stages > li`)).toHaveCount(
        count
      );
    }
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
    await expect(page.locator('#magnotes-knowledge-lab summary')).toHaveText(
      'Connect ideas, change perspective'
    );
    await page.clock.resume();
    paused = false;
    await navigate('contact');
    await expect(page.locator('canvas')).toHaveCount(1);
    expect(errors).toEqual([]);
    expect(sockets).toEqual([]);
  });
}
