import { expect, test, type Locator } from '@playwright/test';
import { waitForScrollEnd } from './scroll-settle';

test.use({ video: 'on' });
for (const fallback of [false, true]) {
  test(`diagnostic SiteGuardian : seuils, hystérésis et incident unique${fallback ? ' sans WebGL et mouvement réduit' : ''}`, async ({
    page,
    isMobile,
  }, info) => {
    test.setTimeout(240000);
    const errors: string[] = [],
      chunks: string[] = [],
      sockets: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('websocket', (socket) => sockets.push(socket.url()));
    page.on('request', (request) => {
      if (/\/SiteguardianResilienceLab-[^/]+\.js/.test(request.url()))
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
    const read = async (node: Locator) => {
      // Aucun scroll à stabiliser si la commande est déjà entièrement lisible,
      // hors du bandeau supérieur et de la navigation fixe inférieure.
      const readable = await node.evaluate((element) => {
        const bounds = element.getBoundingClientRect();
        return bounds.top >= 80 && bounds.bottom <= innerHeight - 160;
      });
      if (readable) return;
      await node.evaluate((element) => {
        const deltaY = element.getBoundingClientRect().top - 100;
        if (matchMedia('(prefers-reduced-motion: reduce)').matches)
          window.scrollBy({ top: deltaY, behavior: 'instant' });
        else
          window.dispatchEvent(
            new WheelEvent('wheel', { deltaY, bubbles: true, cancelable: true })
          );
      });
      await waitForScrollEnd(page);
    };
    const act = async (node: Locator) => {
      await read(node);
      if (isMobile) await node.tap();
      else {
        await node.focus();
        await page.keyboard.press('Enter');
      }
    };
    const navigate = async (id: string) => {
      await page.locator(`.rail__dot[data-rail="${id}"]`).click();
      await waitForScrollEnd(page);
      await expect(
        page.locator(`#${id}`).getByRole('heading').first()
      ).toBeInViewport();
    };
    await page.goto('/');
    await expect(page.locator('#boot-loader')).toBeHidden({ timeout: 90000 });
    for (const id of [
      'intro',
      'stack',
      'freelance',
      'projects-intro',
      'galaxy',
      'ludora',
      'magnotes',
      'studies',
    ])
      await navigate(id);
    const details = page.locator('#siteguardian-resilience-lab');
    const summary = details.locator('summary');
    expect(chunks).toHaveLength(0);
    await act(summary);
    const root = details.locator('.resilience__instrument');
    await expect(root).toBeVisible();
    expect(chunks).toHaveLength(1);
    const probe = async (kind: 'failure' | 'success') =>
      act(root.locator(`button[data-probe="${kind}"]`));
    const state = (name: string) =>
      expect(root).toHaveAttribute('data-state', name);
    const reset = () => act(root.locator('.resilience__reset'));
    await probe('failure');
    await state('suspected');
    await probe('success');
    await state('operational');
    await expect(root).toHaveAttribute('data-opened', '0');
    await reset();
    await probe('failure');
    await probe('failure');
    await state('suspected');
    await probe('failure');
    await state('incident');
    await probe('failure');
    await expect(root).toHaveAttribute('data-opened', '1');
    await expect(root).toHaveAttribute('data-active', 'I01');
    await probe('success');
    await state('recovering');
    await probe('failure');
    await state('incident');
    await expect(root).toHaveAttribute('data-active', 'I01');
    await expect(root.locator('[data-event="relapse"]')).toHaveCount(1);
    await probe('success');
    await probe('success');
    await state('recovering');
    await probe('success');
    await state('operational');
    await expect(root).toHaveAttribute('data-resolved', '1');
    // Les seuils changent les compteurs, jamais les observations passées.
    const history = await root.locator('.resilience__strip').textContent();
    const threshold = root.locator('[data-threshold="failure"]');
    await read(threshold);
    await threshold.selectOption('2');
    expect(await root.locator('.resilience__strip').textContent()).toBe(
      history
    );
    await probe('failure');
    await state('suspected');
    await probe('failure');
    await state('incident');
    await expect(root).toHaveAttribute('data-active', 'I02');
    await act(page.locator('#lang-toggle'));
    await expect(summary).toHaveText('Experiment with resilience diagnosis');
    await expect(root.locator('.resilience__state')).toHaveText(
      'Confirmed incident'
    );
    await expect(root).toHaveAttribute('data-active', 'I02');
    await expect(threshold).toHaveValue('2');
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth - innerWidth
      )
    ).toBeLessThanOrEqual(1);
    await act(page.locator('#lang-toggle'));
    for (const [scenario, length, incidents] of [
      ['isolated', 2, 0],
      ['outage', 7, 1],
      ['unstable', 8, 1],
    ] as const) {
      await act(root.locator(`[data-scenario="${scenario}"]`));
      await expect(root).toHaveAttribute('data-opened', '0');
      for (let index = 0; index < length; index++)
        await act(root.locator('.resilience__next'));
      await state('operational');
      await expect(root).toHaveAttribute('data-opened', String(incidents));
      await expect(root).toHaveAttribute('data-resolved', String(incidents));
      await expect(root.locator('.resilience__next')).toBeDisabled();
    }
    if (!fallback) {
      await read(root);
      await root.screenshot({
        path: info.outputPath('siteguardian-resilience.png'),
        scale: 'css',
        // Le cadrage de l'instrument entier exclut les commandes fixes de page.
        style: '.rail, .scroll-progress { visibility: hidden !important; }',
      });
    }
    for (let index = 0; index < 20; index++) await probe('success');
    await expect(root.locator('.resilience__strip > li:visible')).toHaveCount(
      18
    );
    await reset();
    await expect(root.locator('.resilience__strip > li:visible')).toHaveCount(
      0
    );
    await expect(threshold).toHaveValue('3');
    await probe('failure');
    await act(summary);
    await act(summary);
    await state('operational');
    await expect(root).toHaveAttribute('data-opened', '0');
    await expect(root.locator('.resilience__strip > li:visible')).toHaveCount(
      0
    );
    expect(chunks).toHaveLength(1);
    await act(summary);
    // Smoke proportionné des instruments inchangés sur les profils normaux.
    if (!fallback) {
      for (const [id, target] of [
        ['galaxy', '#galaxy-observatory'],
        ['ludora', '#ludora-sync-lab'],
        ['magnotes', '#magnotes-knowledge-lab'],
        ['studies', '#aigen-execution-lab'],
      ] as const) {
        await navigate(id);
        const instrument = page.locator(target);
        await act(instrument.locator('summary'));
        if (id === 'galaxy') {
          await act(instrument.locator('[data-scale="100"]'));
          await expect(
            instrument.locator('#galaxy-observatory-scale')
          ).toHaveValue('100');
        } else if (id === 'ludora') {
          await instrument.getByRole('combobox').selectOption('100');
          await act(instrument.locator('[data-peer="A"] [data-action="take"]'));
          await expect(
            instrument.locator('[data-peer="B"] .sync-lab__state')
          ).toHaveAttribute('data-version', '1');
        } else if (id === 'magnotes') {
          await act(instrument.locator('[data-move="right"]'));
          await expect(
            instrument.locator('.knowledge__position')
          ).toContainText('N01 (1, 0)');
        } else {
          await act(instrument.locator('.execution__submit'));
          await expect(instrument.locator('[data-task="J01"]')).toHaveAttribute(
            'data-state',
            'succeeded',
            { timeout: 10000 }
          );
        }
        await act(instrument.locator('summary'));
      }
    }
    await navigate('contact');
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth - innerWidth
      )
    ).toBeLessThanOrEqual(1);
    await expect(page.locator('.technical')).toHaveCount(5);
    await expect(page.locator('canvas')).toHaveCount(1);
    expect(errors).toEqual([]);
    expect(sockets).toEqual([]);
  });
}
