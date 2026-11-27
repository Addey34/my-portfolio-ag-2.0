import { expect, test, type Locator, type Page } from '@playwright/test';
import { waitForScrollEnd } from './scroll-settle';

/** Même entrée Lenis que les gestes de lecture ; aucun saut natif concurrent. */
async function readAt(
  page: Page,
  node: Locator,
  reduced: boolean
): Promise<void> {
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
  }, reduced);
  await waitForScrollEnd(page);
}

for (const fallback of [false, true]) {
  test(`observatoire : échelles, commandes et récit${fallback ? ' sans WebGL et mouvement réduit' : ''}`, async ({
    page,
    isMobile,
  }, info) => {
    test.setTimeout(180_000);
    const errors: string[] = [];
    const chunks: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('request', (request) => {
      if (/\/GalaxyObservatory-[^/]+\.js/.test(request.url()))
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
    await expect(page.locator('#boot-loader')).toBeHidden({ timeout: 90_000 });
    const canvas = page.locator('#world-3d');
    await expect(canvas).toHaveCount(1);
    if (!fallback) {
      for (const id of ['intro', 'stack', 'freelance', 'projects-intro']) {
        await page.locator(`.rail__dot[data-rail="${id}"]`).click();
        await waitForScrollEnd(page);
        await expect(
          page.locator(`#${id}`).getByRole('heading').first()
        ).toBeInViewport();
      }
    }
    // Le rail reste visible ; revenir au lien du héros ferait concurrencer
    // l'auto-scroll de Playwright et la destination interne de Lenis.
    await page.locator('.rail__dot[data-rail="galaxy"]').click();
    await waitForScrollEnd(page);
    const details = page.locator('#galaxy-observatory');
    const summary = details.locator('summary');
    await readAt(page, summary, fallback);
    await expect(details.locator('.observatory__instrument')).toHaveCount(0);
    expect(chunks).toHaveLength(0);
    await page.screenshot({
      path: info.outputPath('galaxy-context.png'),
      scale: 'css',
    });
    await summary.focus();
    await expect(summary).toBeFocused();
    await page.keyboard.press('Enter');
    const instrument = details.locator('.observatory__instrument');
    await expect(instrument).toBeVisible();
    expect(chunks).toHaveLength(1);
    await expect(instrument).toHaveAttribute('data-scale', '0');
    const slider = details.locator('#galaxy-observatory-scale');
    await expect(slider).toHaveAccessibleName('Déplier les distances');
    await readAt(page, instrument, fallback);
    expect(
      await instrument.evaluate((node) => {
        let opacity = 1;
        for (
          let parent: Element | null = node;
          parent;
          parent = parent.parentElement
        )
          opacity *= Number(getComputedStyle(parent).opacity);
        return opacity;
      })
    ).toBeGreaterThan(0.95);
    // Viewport réel : une capture d'élément dépassant l'écran mobile peut
    // sortir de la surface peinte, et déplace artificiellement le rail fixe.
    await page.screenshot({
      path: info.outputPath(`compressed${fallback ? '-fallback' : ''}.png`),
      scale: 'css',
    });
    const initialEarth = await details
      .locator('[data-body="earth"]')
      .getAttribute('transform');
    await readAt(page, slider, fallback);
    await slider.focus();
    await page.keyboard.press('End');
    await expect(slider).toHaveValue('100');
    await expect(slider).toHaveAttribute(
      'aria-valuetext',
      /proportionnelle.*3,3/
    );
    await expect(details.locator('tbody tr').first()).toContainText('3,3');
    expect(
      await details.locator('[data-body="earth"]').getAttribute('transform')
    ).not.toBe(initialEarth);
    expect(
      await details.locator('[data-body="neptune"]').getAttribute('transform')
    ).toBe('translate(576 0)');
    await page.keyboard.press('ArrowLeft');
    await expect(slider).toHaveValue('99');
    await page.keyboard.press('Home');
    await expect(slider).toHaveValue('0');
    await expect(details.locator('[data-body="earth"]')).toHaveAttribute(
      'transform',
      initialEarth!
    );
    const bounds = await slider.boundingBox();
    expect(bounds).not.toBeNull();
    const x = bounds!.x + bounds!.width / 2;
    const y = bounds!.y + bounds!.height / 2;
    if (isMobile) await page.touchscreen.tap(x, y);
    else await page.mouse.click(x, y);
    expect(Number(await slider.inputValue())).toBeGreaterThan(40);
    expect(Number(await slider.inputValue())).toBeLessThan(60);
    // Les boutons évitent de dépendre d'un geste fin sur le curseur tactile.
    const proportional = details.getByRole('button', {
      name: 'Échelle proportionnelle',
    });
    if (isMobile) await proportional.tap();
    else await proportional.click();
    await expect(slider).toHaveValue('100');
    await readAt(page, instrument, fallback);
    await page.screenshot({
      path: info.outputPath(`proportional${fallback ? '-fallback' : ''}.png`),
      scale: 'css',
    });
    await page.locator('#lang-toggle').click();
    await expect(summary).toHaveText('Experiment with scale');
    await expect(
      details.getByRole('slider', { name: 'Unfold the distances' })
    ).toHaveValue('100');
    await expect(slider).toHaveAttribute(
      'aria-valuetext',
      /Proportional scale.*3\.3%/
    );
    await expect(details.locator('tbody tr').first()).toContainText('Earth');
    await expect(details.locator('.observatory__note')).toContainText(
      'does not reproduce the Galaxy engine'
    );
    await readAt(page, instrument, fallback);
    await page.screenshot({
      path: info.outputPath('english.png'),
      scale: 'css',
    });
    await readAt(page, summary, fallback);
    if (isMobile) await summary.tap();
    else await summary.click();
    await expect(details).not.toHaveAttribute('open', '');
    await summary.focus();
    await page.keyboard.press('Enter');
    await expect(slider).toHaveValue('100');
    expect(chunks).toHaveLength(1);
    await expect(page.locator('canvas')).toHaveCount(1);
    // Coût de l'entrée utilisateur, recalcul et layout inclus, sans boucle au repos.
    const timings = await slider.evaluate((node) => {
      const input = node as HTMLInputElement;
      const times: number[] = [];
      for (let value = 0; value <= 100; value++) {
        const start = performance.now();
        input.value = String(value);
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.closest('details')!.getBoundingClientRect();
        times.push(performance.now() - start);
      }
      return times.sort((a, b) => a - b);
    });
    console.log(
      `${info.project.name} ${fallback ? 'fallback' : 'normal'} input p95=${timings[95].toFixed(2)}ms max=${timings[100].toFixed(2)}ms`
    );
    expect(timings[95]).toBeLessThan(50);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth - innerWidth
      )
    ).toBeLessThanOrEqual(1);
    await readAt(page, summary, fallback);
    await summary.click();
    // Le disclosure fermé restitue le récit et ses cinq présentations intactes.
    await expect(page.locator('.technical')).toHaveCount(5);
    for (const id of ['galaxy', 'ludora', 'magnotes']) {
      expect(
        await page
          .locator(`#${id} .chapter__beat--context`)
          .evaluate((node) => [...node.children].map((child) => child.tagName))
      ).toEqual(['HEADER', 'A', 'FIGURE']);
      await expect(
        page.locator(`#${id} .chapter__exhibit img`)
      ).toHaveJSProperty('complete', true);
    }
    for (const id of ['ludora', 'magnotes', 'studies', 'contact']) {
      await page.locator(`.rail__dot[data-rail="${id}"]`).click();
      await waitForScrollEnd(page);
      await expect(
        page.locator(`#${id}`).getByRole('heading').first()
      ).toBeInViewport();
    }
    expect(errors).toEqual([]);
  });
}
