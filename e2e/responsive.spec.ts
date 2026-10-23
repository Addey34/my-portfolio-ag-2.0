import { expect, test as base } from '@playwright/test';

/**
 * Les parcours mesurent des positions 3D : l'écran d'attente, qui couvre la page
 * quelques secondes, est retiré dès son apparition (sauf pour son propre test).
 */
const test = base.extend<{ keepLoader: boolean }>({
  keepLoader: [false, { option: true }],
  page: async ({ page, keepLoader }, use) => {
    if (!keepLoader) {
      await page.addInitScript(() => {
        new MutationObserver(() => {
          document.getElementById('boot-loader')?.remove();
        }).observe(document, { childList: true, subtree: true });
      });
    }
    await use(page);
  },
});

const sections = [
  'top',
  'intro',
  'stack',
  'freelance',
  'projects-intro',
  'galaxy',
  'ludora',
  'magnotes',
  'studies',
  'contact',
];

test('stacks visibles et reliées aux projets en FR et EN', async ({
  page,
}, testInfo) => {
  test.setTimeout(120_000);
  await page.goto('/#stack');
  const stacks = page.locator('#stack .stack-node');
  await expect(stacks).toHaveCount(24);
  await expect(stacks.filter({ hasText: 'WebXR' })).toHaveCount(1);
  await expect(stacks.first()).toBeVisible();
  await expect(page.locator('#stack .stack-proof a')).toHaveCount(4);
  await expect(page.locator('#stack .stack__title')).toHaveText(
    'Du navigateur au déploiement.'
  );
  await page.locator('#stack .stack-graph').scrollIntoViewIfNeeded();
  await page.screenshot({ path: testInfo.outputPath('stacks-fr.png') });
  await page.locator('#stack .stack-proof').scrollIntoViewIfNeeded();
  if (page.viewportSize()!.width <= 980) {
    await page.evaluate(() => window.scrollBy(0, innerHeight * 0.25));
    await page.waitForTimeout(350);
  }
  await expect(page.locator('#stack .stack-proof')).toBeInViewport();
  await page.screenshot({ path: testInfo.outputPath('stacks-proofs-fr.png') });

  await page.locator('#lang-toggle').click();
  await expect(page.locator('#stack .stack__title')).toHaveText(
    'From browser to deployment.'
  );
  await expect(page.locator('#stack .stack-legend')).toContainText(
    'Delivery & quality'
  );
  await page.screenshot({ path: testInfo.outputPath('stacks-en.png') });
  if (page.viewportSize()!.width <= 980) {
    await page.locator('#stack .stack-proof').scrollIntoViewIfNeeded();
    await page.waitForTimeout(400);
    await expect(page.locator('#stack .stack-proof')).toBeInViewport();
  }
  await page.locator('#stack .stack-proof a').first().click();
  await expect(page.locator('#galaxy')).toBeInViewport({ ratio: 0.01 });
  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth
    )
  ).toBeLessThanOrEqual(1);
});

test('parcours responsive complet et contrôles', async ({ page }, testInfo) => {
  test.setTimeout(180_000);
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await expect(page.locator('.scene-lab')).toHaveCount(0);
  await expect(page.locator('#magnotes')).toBeAttached();
  await expect(page.locator('.rail__dot[data-rail="top"]')).toBeAttached();

  for (const section of sections) {
    await page.evaluate((id) => {
      if (id !== 'intro') {
        const link = document.querySelector<HTMLAnchorElement>(
          `.rail__dot[data-rail="${id}"]`
        );
        if (!link) throw new Error(`Lien ${id} introuvable`);
        link.click();
        return;
      }
      const element = document.getElementById(id);
      if (!element) throw new Error(`Section ${id} introuvable`);
      window.scrollTo(0, element.getBoundingClientRect().top + window.scrollY);
    }, section);
    await expect(page.locator(`#${section}`)).toBeInViewport({ ratio: 0.01 });
    await page.waitForTimeout(250);
    const overflow = await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth
    );
    expect(
      overflow,
      `Débordement horizontal dans #${section}`
    ).toBeLessThanOrEqual(1);
    if (
      section === 'galaxy' ||
      section === 'ludora' ||
      section === 'magnotes'
    ) {
      await page.screenshot({ path: testInfo.outputPath(`${section}.png`) });
    }
  }

  await page.locator('#lang-toggle').click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await page.locator('#controls-open').click();
  await expect(page.locator('.controls')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('.controls')).toBeHidden();
  expect(errors).toEqual([]);
});

test('passage Ludora vers MagNotes et retour', async ({ page }, testInfo) => {
  await page.goto('/');
  await expect(page.locator('#magnotes')).toBeAttached();

  for (const [step, progress] of [0, 0.5, 1, 0.5, 0].entries()) {
    await page.evaluate((position) => {
      const section = document.querySelector('#magnotes');
      if (!section) throw new Error('Chapitre MagNotes introuvable');
      const top = section.getBoundingClientRect().top + window.scrollY;
      window.scrollTo(0, top - innerHeight * (0.82 - position * 0.64));
    }, progress);
    await page.waitForTimeout(450);
    await page.screenshot({
      path: testInfo.outputPath(`passage-${step}-${progress}.png`),
    });
    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth
      )
    ).toBeLessThanOrEqual(1);
  }
});

test('l’horloge se déploie en stacks et se reforme au retour', async ({
  page,
}, testInfo) => {
  test.setTimeout(120_000);
  const assemblyResponse = page.waitForResponse((response) =>
    response.url().endsWith('/models/clock_breakup.glb')
  );
  await page.goto('/');
  expect((await assemblyResponse).ok()).toBe(true);
  await expect(page.locator('#stack')).toBeAttached();
  for (const [step, viewportPosition] of [
    0.82, 0.5, 0.35, 0.18, 0.35, 0.5, 0.82,
  ].entries()) {
    await page.evaluate((position) => {
      const section = document.querySelector('#stack');
      if (!section) throw new Error('Section Système introuvable');
      const top = section.getBoundingClientRect().top + window.scrollY;
      window.scrollTo(0, top - innerHeight * position);
    }, viewportPosition);
    await page.waitForTimeout(450);
    await page.screenshot({
      path: testInfo.outputPath(`ag-systeme-${step}.png`),
    });
    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth
      )
    ).toBeLessThanOrEqual(1);
  }
});

test('médaillon AG devient horloge et retrouve AG au retour', async ({
  page,
}, testInfo) => {
  test.setTimeout(180_000);
  const modelResponse = page.waitForResponse((response) =>
    response.url().endsWith('/models/clock.glb')
  );
  const lampResponse = page.waitForResponse((response) =>
    response.url().endsWith('/models/lamp.glb')
  );
  const pendantResponse = page.waitForResponse((response) =>
    response.url().endsWith('/models/pendant.glb')
  );
  await page.goto('/');
  expect((await modelResponse).ok()).toBe(true);
  expect((await lampResponse).ok()).toBe(true);
  expect((await pendantResponse).ok()).toBe(true);
  await expect(page.locator('#world-3d')).toBeVisible();
  await page.waitForTimeout(1400);
  await page.screenshot({ path: testInfo.outputPath('horloge-hero.png') });
  if (page.viewportSize()!.width <= 980) {
    await expect(page.locator('.hero__inner')).toBeVisible();
  }
  for (const [step, position] of [0.92, 0.62, 0.32, 0.62, 0.92].entries()) {
    await page.evaluate((viewportPosition) => {
      const section = document.querySelector('#intro');
      if (!section) throw new Error('Introduction introuvable');
      const top = section.getBoundingClientRect().top + window.scrollY;
      window.scrollTo(0, top - innerHeight * viewportPosition);
    }, position);
    await page.waitForTimeout(500);
    await page.screenshot({
      path: testInfo.outputPath(`horloge-ag-${step}.png`),
    });
    if (page.viewportSize()!.width <= 980) {
      await expect(page.locator('.hero__inner')).toBeHidden();
    }
    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth
      )
    ).toBeLessThanOrEqual(1);
  }
});

test('suspension alignée du petit mobile au bureau', async ({
  page,
}, testInfo) => {
  test.setTimeout(180_000);
  const lampResponse = page.waitForResponse((response) =>
    response.url().endsWith('/models/lamp.glb')
  );
  await page.goto('/');
  expect((await lampResponse).ok()).toBe(true);
  await expect(page.locator('#world-3d')).toBeVisible();
  for (const [width, height] of [
    [320, 720],
    [390, 844],
    [768, 1024],
    [860, 800],
    [900, 800],
    [980, 800],
    [981, 800],
    [1100, 800],
    [1101, 800],
    [1280, 720],
  ] as const) {
    await page.setViewportSize({ width, height });
    await page.waitForTimeout(500);
    await page.screenshot({
      path: testInfo.outputPath(`suspension-${width}.png`),
    });
    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth
      )
    ).toBeLessThanOrEqual(1);
  }
});

test('récit complet au seuil tablette', async ({ page }, testInfo) => {
  test.setTimeout(180_000);
  await page.setViewportSize({ width: 900, height: 800 });
  await page.goto('/');
  await expect(page.locator('#world-3d')).toBeVisible();
  await expect(page.locator('.rail__dot[data-rail="top"]')).toBeAttached();
  for (const section of sections) {
    await page.evaluate((id) => {
      if (id === 'intro') {
        const element = document.getElementById(id);
        if (!element) throw new Error(`Section ${id} introuvable`);
        window.scrollTo(
          0,
          element.getBoundingClientRect().top + window.scrollY
        );
        return;
      }
      const link = document.querySelector<HTMLAnchorElement>(
        `.rail__dot[data-rail="${id}"]`
      );
      if (!link) throw new Error(`Lien ${id} introuvable`);
      link.click();
    }, section);
    await expect(page.locator(`#${section}`)).toBeInViewport({ ratio: 0.01 });
    await page.waitForTimeout(250);
    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth
      ),
      `Débordement horizontal dans #${section} à 900 px`
    ).toBeLessThanOrEqual(1);
    if (['galaxy', 'ludora', 'magnotes', 'contact'].includes(section)) {
      await page.screenshot({
        path: testInfo.outputPath(`tablette-${section}.png`),
      });
    }
  }
});

test('captures des trois aiguilles aux repères réels du cadran', async ({
  page,
}, testInfo) => {
  test.setTimeout(180_000);
  const modelResponse = page.waitForResponse((response) =>
    response.url().endsWith('/models/clock.glb')
  );
  await page.goto('/');
  expect((await modelResponse).ok()).toBe(true);
  await expect(page.locator('#world-3d')).toBeVisible();
  await page.clock.setFixedTime(new Date(2026, 9, 19, 12, 0, 0));
  await page.waitForTimeout(1400);
  for (const [label, hour, minute, second] of [
    ['12-00-00', 12, 0, 0],
    ['03-15-00', 3, 15, 0],
    ['06-30-30', 6, 30, 30],
    ['09-45-45', 9, 45, 45],
    ['10-20-00', 10, 20, 0],
    ['10-20-20', 10, 20, 20],
    ['10-20-40', 10, 20, 40],
    ['10-20-59', 10, 20, 59],
    ['10-21-00', 10, 21, 0],
  ] as const) {
    await page.clock.setFixedTime(new Date(2026, 9, 19, hour, minute, second));
    await page.waitForTimeout(450);
    await page.screenshot({ path: testInfo.outputPath(`cadran-${label}.png`) });
  }
});

test('atelier 3D local : repères précis et retour', async ({
  page,
}, testInfo) => {
  test.setTimeout(180_000);
  await page.goto('/?scene-lab=1');
  const lab = page.locator('.scene-lab');
  await expect(lab).toBeVisible();
  await expect(lab.locator('#scene-lab-metrics')).not.toHaveText(
    'Chargement WebGL…',
    { timeout: 30_000 }
  );
  const currentPercent = async () =>
    Number(
      (await lab.locator('#scene-lab-phase').textContent())?.replace(/\D/g, '')
    );
  for (const [step, percent] of [0, 25, 50, 75, 100, 75, 50, 25, 0].entries()) {
    await lab
      .getByRole('button', { name: String(percent), exact: true })
      .click();
    await expect.poll(currentPercent).toBeGreaterThanOrEqual(percent - 2);
    await expect.poll(currentPercent).toBeLessThanOrEqual(percent + 2);
    await page.waitForTimeout(350);
    await page.screenshot({
      path: testInfo.outputPath(`atelier-horloge-ag-${step}-${percent}.png`),
    });
  }
  await lab.getByRole('button', { name: '50', exact: true }).click();
  await page.waitForTimeout(350);
  await lab.getByRole('button', { name: 'Réduire' }).click();
  await page.screenshot({ path: testInfo.outputPath('atelier-apercu-50.png') });
});

test('comparaison des deux ouvertures avec retour au cadran', async ({
  page,
}, testInfo) => {
  test.setTimeout(240_000);
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/?scene-lab=1');
  const lab = page.locator('.scene-lab');
  await expect(page.locator('#world-3d')).toBeVisible();
  for (const variant of ['ag', 'direct'] as const) {
    await lab.locator(`[data-opening="${variant}"]`).click();
    await expect(lab.locator(`[data-opening="${variant}"]`)).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    for (const percent of [0, 25, 50, 75, 100, 0]) {
      await lab.locator('#scene-lab-opening').fill(String(percent));
      await expect
        .poll(() =>
          lab
            .locator('#scene-lab-opening-phase')
            .textContent()
            .then((value) => Number(value?.replace(/\D/g, '')))
        )
        .toBeGreaterThanOrEqual(percent - 2);
      await page.waitForTimeout(250);
      await lab.locator('#scene-lab-collapse').evaluate((button) => {
        (button as HTMLButtonElement).click();
      });
      if (percent !== 0 || variant === 'direct') {
        await page.screenshot({
          path: testInfo.outputPath(`ouverture-${variant}-${percent}.png`),
        });
      }
      await lab.locator('#scene-lab-collapse').evaluate((button) => {
        (button as HTMLButtonElement).click();
      });
      expect(
        await page.evaluate(
          () =>
            document.documentElement.scrollWidth -
            document.documentElement.clientWidth
        )
      ).toBeLessThanOrEqual(1);
    }
  }
  expect(errors).toEqual([]);
});

test('les quatre passages complémentaires suivent le scroll dans les deux sens', async ({
  page,
}, testInfo) => {
  test.setTimeout(180_000);
  await page.goto('/');
  await expect(page.locator('#contact')).toBeAttached();
  await page.waitForLoadState('networkidle');
  for (const section of ['freelance', 'projects-intro', 'studies', 'contact']) {
    for (const [step, position] of [0.82, 0.5, 0.18, 0.5, 0.82].entries()) {
      await page.evaluate(
        ({ target, viewportPosition }) => {
          const element = document.getElementById(target);
          if (!element) throw new Error(`Section ${target} introuvable`);
          const top = element.getBoundingClientRect().top + window.scrollY;
          window.scrollTo(0, top - innerHeight * viewportPosition);
        },
        { target: section, viewportPosition: position }
      );
      await page.waitForTimeout(430);
      await page.screenshot({
        path: testInfo.outputPath(`flux-${section}-${step}.png`),
      });
      expect(
        await page.evaluate(
          () =>
            document.documentElement.scrollWidth -
            document.documentElement.clientWidth
        )
      ).toBeLessThanOrEqual(1);
    }
  }
});

test('Sélection se déploie en orbites Galaxy et revient', async ({
  page,
}, testInfo) => {
  await page.goto('/#projects-intro');
  await expect(page.locator('#galaxy')).toBeAttached();
  await page.waitForTimeout(2800);
  await page.screenshot({ path: testInfo.outputPath('selection-start.png') });
  for (const [step, position] of [1.1, 0.64, 0.18, 0.64, 1.1].entries()) {
    await page.evaluate((viewportPosition) => {
      const section = document.querySelector('#galaxy');
      if (!section) throw new Error('Chapitre Galaxy introuvable');
      const top = section.getBoundingClientRect().top + window.scrollY;
      window.scrollTo(0, top - innerHeight * viewportPosition);
    }, position);
    await page.waitForTimeout(900);
    await page.screenshot({
      path: testInfo.outputPath(`selection-galaxy-${step}.png`),
    });
    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth
      )
    ).toBeLessThanOrEqual(1);
  }
});

test('tableau MagNotes placé entre les panneaux', async ({
  page,
}, testInfo) => {
  await page.goto('/#magnotes');
  await expect(page.locator('#magnotes')).toBeAttached();
  await page.evaluate(() => {
    const section = document.querySelector('#magnotes');
    if (!section) throw new Error('Chapitre MagNotes introuvable');
    const top = section.getBoundingClientRect().top + window.scrollY;
    window.scrollTo(0, top - innerHeight / 2 + section.clientHeight * 0.6);
  });
  await page.waitForTimeout(600);
  await page.screenshot({ path: testInfo.outputPath('magnotes-tableau.png') });
  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth
    )
  ).toBeLessThanOrEqual(1);
});

test('contenu utilisable avec mouvement réduit', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  if (page.viewportSize()!.width <= 980) {
    await page.goto('/');
    await expect(page.locator('.hero__inner')).toBeVisible();
    await page.evaluate(() => window.scrollTo(0, 100));
    await expect(page.locator('.hero__inner')).toBeHidden();
    await page.evaluate(() => window.scrollTo(0, 0));
    await expect(page.locator('.hero__inner')).toBeVisible();
  }
  await page.goto('/#magnotes');
  await expect(page.locator('#magnotes')).toBeAttached();
  await expect(page.locator('#magnotes h3')).toBeVisible();
  await expect(page.locator('#contact')).toBeAttached();
});

test('horloge à l’heure même avec mouvement réduit', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const clockResponse = page.waitForResponse((response) =>
    response.url().endsWith('/models/clock.glb')
  );
  const lampResponse = page.waitForResponse((response) =>
    response.url().endsWith('/models/lamp.glb')
  );
  await page.goto('/');
  expect((await clockResponse).ok()).toBe(true);
  expect((await lampResponse).ok()).toBe(true);
  const canvas = page.locator('#world-3d');
  await expect(canvas).toBeVisible();
  await page.waitForTimeout(1100);
  const before = await canvas.screenshot();
  await page.waitForTimeout(1600);
  const after = await canvas.screenshot();
  expect(before.equals(after)).toBe(false);
});

test('contenu et navigation disponibles sans WebGL', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
      value: () => null,
    });
  });
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await expect(page.locator('#world-3d')).toBeHidden();
  await expect(page.locator('#top h1')).toBeVisible();
  await expect(page.locator('#hero-projects a').first()).toHaveAttribute(
    'href',
    '#galaxy'
  );
  const projectLink = page.locator('#stack .stack-proof a').first();
  await projectLink.scrollIntoViewIfNeeded();
  await projectLink.click();
  await expect(page).toHaveURL(/#galaxy$/);
  await expect(page.locator('#galaxy')).toBeInViewport();
});

test('captures de finition des scènes principales', async ({
  page,
}, testInfo) => {
  test.setTimeout(180_000);
  for (const section of [
    'top',
    'stack',
    'freelance',
    'projects-intro',
    'galaxy',
    'ludora',
    'magnotes',
    'studies',
    'contact',
  ]) {
    await page.goto(`/?capture=${section}#${section}`);
    await expect(page.locator(`#${section}`)).toBeAttached();
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(1200);
    await expect(
      page.locator(`.rail__dot[data-rail="${section}"]`)
    ).toHaveAttribute('aria-current', 'location');
    await page.screenshot({
      path: testInfo.outputPath(`scene-${section}.png`),
    });
    if (section === 'contact') {
      await page.locator('.contact__form-toggle').click();
      await expect(page.locator('#contact-form')).toBeVisible();
      await page.waitForTimeout(450);
      await page.screenshot({
        path: testInfo.outputPath('scene-contact-form.png'),
      });
    }
  }
});

test.describe('écran d’attente', () => {
  test.use({ keepLoader: true });

  test('couvre la page puis disparaît quand la 3D est installée', async ({
    page,
  }) => {
    test.setTimeout(120_000);
    await page.goto('/');
    await expect(page.locator('#boot-loader')).toBeAttached();
    await expect(page.locator('#boot-loader')).toHaveCount(0, {
      timeout: 60_000,
    });
    await expect(page.locator('#world-3d')).toBeVisible();
  });
});
