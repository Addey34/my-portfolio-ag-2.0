import { expect, test, type Locator } from '@playwright/test';
import { waitForScrollEnd } from './scroll-settle';

test.use({ video: 'on' });
for (const fallback of [false, true]) {
  test(`sculptures vivantes${fallback ? ' sans WebGL et mouvement réduit' : ''}`, async ({
    page,
    isMobile,
  }, info) => {
    test.setTimeout(360000);
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
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
    const canvas = page.locator('#world-3d');
    const prepare = async (node: Locator) => {
      const top = isMobile && !fallback ? 280 : 100;
      await node.evaluate((element, y) => {
        const delta = element.getBoundingClientRect().top - y;
        window.dispatchEvent(
          new WheelEvent('wheel', {
            deltaY: delta,
            bubbles: true,
            cancelable: true,
          })
        );
        if (!document.documentElement.classList.contains('lenis'))
          scrollBy({ top: delta, behavior: 'instant' });
      }, top);
      await waitForScrollEnd(page);
      await expect(node).toBeInViewport();
    };
    const act = async (node: Locator) => {
      await prepare(node);
      if (isMobile) {
        // Le pré-scroll interne de Locator.tap désigne un voisin sous Lenis.
        // Vérifier le hit-test réel, puis envoyer un véritable toucher en place.
        await expect(node).toBeEnabled();
        await expect
          .poll(() =>
            node.evaluate((element) => {
              const r = element.getBoundingClientRect();
              return element.contains(
                document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)
              );
            })
          )
          .toBe(true);
        const rect = await node.boundingBox();
        if (!rect) throw new Error('Commande sans géométrie');
        await page.touchscreen.tap(
          rect.x + rect.width / 2,
          rect.y + rect.height / 2
        );
      } else {
        await node.focus();
        await page.keyboard.press('Enter');
      }
    };
    const nav = async (id: string) => {
      await page.locator(`.rail__dot[data-rail="${id}"]`).click();
      await waitForScrollEnd(page);
      await expect(
        page.locator(`#${id}`).getByRole('heading').first()
      ).toBeInViewport();
    };
    const pose = async () =>
      JSON.parse(
        (await canvas.getAttribute('data-sculpture-pose')) ?? '[]'
      ) as Array<{
        name: string;
        scale: number[];
        position: number[];
        rotation: number[];
      }>;
    const shot = async (name: string) =>
      page.screenshot({ path: info.outputPath(name + '.png'), scale: 'css' });
    await page.goto('/');
    await expect(page.locator('#boot-loader')).toBeHidden({ timeout: 90000 });
    if (!fallback) {
      const renderer = await canvas.evaluate((element) => {
        const gl = (element as HTMLCanvasElement).getContext('webgl2');
        const ext = gl?.getExtension('WEBGL_debug_renderer_info');
        return gl && ext
          ? (gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) as string)
          : 'indisponible';
      });
      await info.attach('renderer', {
        body: renderer,
        contentType: 'text/plain',
      });
    }
    await nav('galaxy');
    const galaxy = page.locator('#galaxy-observatory');
    await act(galaxy.locator('summary'));
    const expanded = galaxy.locator('[data-scale="100"]');
    await prepare(expanded);
    if (!fallback) {
      await expect(canvas).toHaveAttribute('data-sculpture', /galaxy/);
      await expect
        .poll(async () => (await pose()).filter(Boolean).length)
        .toBe(3);
    }
    await shot('galaxy-avant');
    const initial = fallback ? [] : await pose();
    await act(expanded);
    await expect(galaxy.locator('input')).toHaveValue('100');
    if (!fallback) {
      await expect
        .poll(async () => (await pose())[0]?.scale[0])
        .toBeCloseTo(1 / 30.07, 5);
      expect(await pose()).not.toEqual(initial);
      await shot('galaxy-apres');
      // Images du canvas seul, mouvement réduit : une différence de pixels doit subsister.
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.waitForTimeout(1100);
      const proportional = await canvas.screenshot();
      await act(galaxy.locator('[data-scale="0"]'));
      await expect
        .poll(async () => (await pose())[0]?.scale[0])
        .toBeGreaterThan(0.4);
      expect((await canvas.screenshot()).equals(proportional)).toBe(false);
      await page.emulateMedia({ reducedMotion: 'no-preference' });
    }
    await act(galaxy.locator('summary'));
    if (!fallback) await expect(canvas).toHaveAttribute('data-sculpture', '');
    await nav('ludora');
    const ludora = page.locator('#ludora-sync-lab');
    await act(ludora.locator('summary'));
    const take = ludora.locator('[data-peer="A"] [data-action="take"]');
    await prepare(take);
    if (!fallback)
      await expect(canvas).toHaveAttribute('data-sculpture', /ludora/);
    await ludora.locator('select').selectOption('1400');
    await shot('ludora-avant');
    const resting = fallback ? [] : await pose();
    await act(take);
    if (!fallback) {
      await expect(canvas).toHaveAttribute('data-sculpture', /"phase":"sent"/);
      await expect
        .poll(async () => (await pose())[1]?.position[1])
        .not.toBe(resting[1].position[1]);
      await shot('ludora-transit');
    }
    await expect(
      ludora.locator('[data-peer="B"] .sync-lab__state')
    ).toHaveAttribute('data-version', '1', { timeout: 12000 });
    if (!fallback) {
      await expect(canvas).toHaveAttribute(
        'data-sculpture',
        /"versions":\[1,1,1\]/
      );
      await shot('ludora-convergence');
    }
    await act(ludora.locator('[data-peer="A"] [data-action="stale"]'));
    if (!fallback) {
      await expect(canvas).toHaveAttribute(
        'data-sculpture',
        /"rejected":true/,
        { timeout: 10000 }
      );
      await expect.poll(async () => (await pose())[0]?.rotation[2]).toBe(-0.32);
      await shot('ludora-rejet');
    }
    await act(ludora.locator('.sync-lab__reset'));
    await expect(
      ludora.locator('[data-peer="server"] .sync-lab__state')
    ).toHaveAttribute('data-version', '0');
    await act(take);
    await act(ludora.locator('summary'));
    await page.waitForTimeout(3000);
    await act(ludora.locator('summary'));
    await expect(
      ludora.locator('[data-peer="server"] .sync-lab__state')
    ).toHaveAttribute('data-version', '0');
    await act(ludora.locator('summary'));
    await nav('magnotes');
    const knowledge = page.locator('#magnotes-knowledge-lab');
    await act(knowledge.locator('summary'));
    const right = knowledge.locator('[data-move="right"]');
    await prepare(right);
    if (!fallback)
      await expect(canvas).toHaveAttribute('data-sculpture', /magnotes/);
    await shot('magnotes-avant');
    await act(right);
    await expect(knowledge.locator('.knowledge__position')).toContainText(
      'N01 (1, 0)'
    );
    if (!fallback) {
      await expect.poll(async () => (await pose())[0]?.position[0]).toBe(0);
      await shot('magnotes-deplace');
    }
    await act(knowledge.locator('[data-view="kanban"]'));
    if (!fallback) {
      await expect(canvas).toHaveAttribute('data-sculpture', /"view":"kanban"/);
      await expect.poll(async () => (await pose())[0]?.rotation[1]).toBe(-0.2);
      await shot('magnotes-kanban');
    }
    const statusSelect = knowledge
      .locator('.knowledge__inspector select')
      .nth(1);
    await prepare(statusSelect);
    await statusSelect.selectOption('clear');
    if (!fallback)
      await expect.poll(async () => (await pose())[0]?.position[0]).toBe(0.8);
    await act(knowledge.locator('[data-view="timeline"]'));
    const daySelect = knowledge.locator('.knowledge__inspector select').nth(2);
    await prepare(daySelect);
    await daySelect.selectOption('7');
    if (!fallback) {
      await expect
        .poll(async () => (await pose())[0]?.position[0])
        .toBeCloseTo(0.78, 5);
      await expect.poll(async () => (await pose())[0]?.rotation[0]).toBe(-0.35);
      await shot('magnotes-chronologie');
    }
    await act(page.locator('#lang-toggle'));
    await expect(knowledge.locator('.knowledge__position')).toContainText(
      'N01 (1, 0)'
    );
    await act(knowledge.locator('summary'));
    if (!fallback) await expect(canvas).toHaveAttribute('data-sculpture', '');
    await act(knowledge.locator('summary'));
    await expect(knowledge.locator('.knowledge__instrument')).toHaveAttribute(
      'data-view',
      'timeline'
    );
    await act(knowledge.locator('.knowledge__reset'));
    await expect(knowledge.locator('.knowledge__position')).toContainText(
      'N01 (0, 0)'
    );
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
    await act(aigen.locator('summary'));
    const guardian = page.locator('#siteguardian-resilience-lab');
    await act(guardian.locator('summary'));
    for (let i = 0; i < 3; i++)
      await act(guardian.locator('button[data-probe="failure"]'));
    await expect(guardian.locator('.resilience__instrument')).toHaveAttribute(
      'data-state',
      'incident'
    );
    await act(guardian.locator('summary'));
    await nav('contact');
    await nav('magnotes');
    await nav('ludora');
    await nav('galaxy');
    await page.keyboard.press('Control+k');
    await page.locator('.palette__input').fill('MagNotes');
    await page.locator('.palette__input').press('Enter');
    await waitForScrollEnd(page);
    await expect(page.locator('#magnotes .chapter__name')).toBeInViewport();
    await page.locator('.rail__dot[data-rail="ludora"]').click();
    await page.locator('.rail__dot[data-rail="galaxy"]').click();
    await waitForScrollEnd(page);
    await expect(page.locator('#galaxy .chapter__name')).toBeInViewport();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth - innerWidth
      )
    ).toBeLessThanOrEqual(1);
    await expect(canvas).toHaveCount(1);
    expect(errors).toEqual([]);
  });
}
