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

test('le contenu essentiel reste disponible sans JavaScript', async ({
  browser,
  baseURL,
}) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto(baseURL!);
  for (const name of ['Galaxy', 'Ludora', 'MagNotes']) {
    await expect(
      page.getByRole('heading', { name, exact: true })
    ).toBeVisible();
  }
  await expect(
    page.getByRole('link', { name: 'contact@adrianguichard.dev' })
  ).toHaveAttribute('href', 'mailto:contact@adrianguichard.dev');
  await expect(
    page.locator('.no-js-content a[href="https://galaxy.adrianguichard.dev/"]')
  ).toBeVisible();
  await context.close();
});

test('le contenu essentiel reste disponible si le module principal ne charge pas', async ({
  page,
}) => {
  await page.route('**/src/main.ts', (route) => route.abort());
  await page.goto('/');
  await expect(page.locator('#galaxy')).toContainText('Galaxy');
  await expect(page.locator('#ludora')).toContainText('Ludora');
  await expect(page.locator('#magnotes')).toContainText('MagNotes');
  await expect(page.locator('[data-contact-email]')).toHaveAttribute(
    'href',
    'mailto:contact@adrianguichard.dev'
  );
});

test('le contenu statique revient si le démarrage échoue', async ({ page }) => {
  await page.addInitScript(() => {
    const original = Element.prototype.replaceChildren;
    let fail = true;
    Element.prototype.replaceChildren = function (...nodes: (Node | string)[]) {
      if (fail && this.id === 'projects') {
        fail = false;
        throw new Error('Échec de démarrage simulé');
      }
      return original.apply(this, nodes);
    };
  });
  await page.goto('/');
  await expect(page.locator('html')).toHaveClass(/no-js/);
  await expect(page.locator('#galaxy')).toContainText('Galaxy');
  await expect(page.locator('[data-contact-email]')).toHaveAttribute(
    'href',
    'mailto:contact@adrianguichard.dev'
  );
});

test('les réglages retiennent le focus et le rendent au bouton', async ({
  page,
}) => {
  await page.goto('/');
  const trigger = page.locator('#controls-open');
  await trigger.click();
  const dialog = page.getByRole('dialog', { name: 'Réglages visuels' });
  const first = dialog.getByRole('switch').first();
  const last = dialog.locator('select');
  await expect(first).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(last).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(first).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(trigger).toBeFocused();
  await expect(
    page.locator('.offer-card[tabindex], .chapter__proof-item[tabindex]')
  ).toHaveCount(0);
});

test('Galaxy distingue ses échelles et donne accès à la méthodologie en FR et EN', async ({
  page,
}, testInfo) => {
  await page.goto('/#galaxy');
  const details = page.locator('#galaxy .chapter__more');
  const toggle = details.locator('summary');
  await toggle.scrollIntoViewIfNeeded();
  if (testInfo.project.name === 'desktop-chromium') await toggle.click();
  else await toggle.tap();
  await expect(details).toHaveAttribute('open', '');
  await expect(details).toContainText(
    'distances compressées en mode pédagogique'
  );
  const methodology = page
    .locator('#galaxy .chapter__links a')
    .filter({ hasText: 'Méthodologie' });
  await expect(methodology).toHaveAttribute(
    'href',
    'https://galaxy.adrianguichard.dev/methodology/'
  );
  await methodology.scrollIntoViewIfNeeded();
  await page.waitForTimeout(1500);
  await expect(methodology).toBeVisible();
  await expect(methodology).toBeInViewport();
  await expect
    .poll(async () =>
      Number(
        await page
          .locator('#galaxy .chapter__panel-shell')
          .evaluate((element) => getComputedStyle(element).opacity)
      )
    )
    .toBeGreaterThan(0.9);
  await page.screenshot({
    path: testInfo.outputPath('galaxy-methodologie-fr.png'),
  });
  await expect(methodology).toBeInViewport();
  await page.locator('#lang-toggle').click();
  await expect(details).toContainText(
    'compressed distances in educational mode'
  );
  await expect(
    page.locator('#galaxy .chapter__links a').filter({ hasText: 'Methodology' })
  ).toBeVisible();
  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth
    )
  ).toBeLessThanOrEqual(1);
});

test('les aperçus des produits sont visibles, accessibles et traduits', async ({
  page,
}, testInfo) => {
  test.setTimeout(120_000);
  await page.goto('/');
  for (const id of ['galaxy', 'ludora', 'magnotes']) {
    const exhibit = page.locator(`#${id} .chapter__exhibit`);
    await exhibit.scrollIntoViewIfNeeded();
    const image = exhibit.locator('img');
    await expect(image).toBeVisible();
    await expect
      .poll(() => image.evaluate((node: HTMLImageElement) => node.naturalWidth))
      .toBeGreaterThan(0);
    await page.screenshot({ path: testInfo.outputPath(`preview-${id}.png`) });
  }
  await page.locator('#lang-toggle').click();
  await expect(page.locator('#galaxy .chapter__exhibit img')).toHaveAttribute(
    'alt',
    'View of the interactive Galaxy solar system.'
  );
  await expect(page.locator('#galaxy .chapter__exhibit span')).toHaveText(
    'Open live demo'
  );
  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth
    )
  ).toBeLessThanOrEqual(1);
});

test('activité GitHub traduite, y compris depuis le cache et en cas d’échec', async ({
  page,
}) => {
  await page.route('https://api.github.com/**', async (route) => {
    const isRepos = route.request().url().includes('/repos?');
    await route.fulfill({
      json: isRepos
        ? [
            {
              name: 'projet',
              html_url: 'https://github.com/Addey34/projet',
              pushed_at: '2026-10-05T12:00:00Z',
              fork: false,
              archived: false,
            },
          ]
        : {
            public_repos: 1,
            followers: 2,
            html_url: 'https://github.com/Addey34',
          },
    });
  });
  await page.goto('/');
  const profile = page.locator('[data-github-profile]');
  const summary = page.locator('[data-github-summary]');
  const latest = page.locator('[data-github-latest]');
  await expect(profile).toHaveAttribute('data-github-state', 'ready');
  await expect(summary).toHaveText('1 dépôt public · 2 abonnés');
  await expect(latest).toContainText('Dernière activité : projet');
  await page.locator('#lang-toggle').click();
  await expect(summary).toHaveText('1 public repo · 2 followers');
  await expect(latest).toContainText('Latest activity : projet');
  await page.reload();
  await expect(summary).toHaveText('1 public repo · 2 followers');
  await page.locator('#lang-toggle').click();
  await expect(summary).toHaveText('1 dépôt public · 2 abonnés');
  await page.evaluate(() => sessionStorage.clear());
  await page.unrouteAll();
  await page.route('https://api.github.com/**', (route) => route.abort());
  await page.reload();
  await expect(profile).toHaveAttribute('data-github-state', 'fallback');
  await expect(summary).toHaveText('Voir le profil GitHub');
  await page.locator('#lang-toggle').click();
  await expect(summary).toHaveText('View GitHub profile');
});

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
    // Le décalage ne sert que si le bloc reste sous le rail : le défilement
    // lissé peut sinon le pousser hors de l'écran et le faire disparaître.
    const hiddenByRail = await page.evaluate(() => {
      const proof = document.querySelector('#stack .stack-proof');
      return proof
        ? proof.getBoundingClientRect().bottom > innerHeight * 0.85
        : false;
    });
    if (hiddenByRail) {
      await page.evaluate(() => window.scrollBy(0, innerHeight * 0.25));
      await page.waitForTimeout(350);
    }
  }
  await expect(page.locator('#stack .stack-proof')).toBeInViewport();
  await page.screenshot({ path: testInfo.outputPath('stacks-proofs-fr.png') });

  await page.locator('#lang-toggle').click();
  await expect(page.locator('#stack .stack__title')).toHaveText(
    'From browser to deployment.'
  );
  await expect(
    page.locator('#stack .stack-family[data-layer="deploy"]')
  ).toContainText('Delivery & quality');
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

test('le rail attend la validation du clic avant de changer de chapitre', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page.locator('#boot-loader')).toBeHidden({ timeout: 30000 });
  const target = page.locator('.rail__dot[data-rail="stack"]');
  await expect(target).toBeVisible();
  const rect = await target.boundingBox();
  if (!rect) throw new Error('Chapitre Stacks inaccessible');
  await page.mouse.move(rect.x + rect.width / 2, rect.y + rect.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(350);
  expect(new URL(page.url()).hash).toBe('');
  await page.mouse.up();
  await expect.poll(() => new URL(page.url()).hash).toBe('#stack');
});

test('le rail reste utilisable au toucher', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'Contrôle réservé aux profils tactiles.');
  await page.goto('/');
  await expect(page.locator('#boot-loader')).toBeHidden({ timeout: 30000 });
  await page.locator('.rail__dot[data-rail="stack"]').tap();
  await expect.poll(() => new URL(page.url()).hash).toBe('#stack');
  await expect(page.locator('#stack')).toBeInViewport();
});

test('le rail marque les étapes traversées et suit le retour', async ({
  page,
}) => {
  test.setTimeout(60000);
  await page.goto('/');
  await expect(page.locator('#boot-loader')).toBeHidden({ timeout: 30000 });
  const current = page.locator('.rail__dot[data-rail="freelance"]');
  await expect(current).toBeAttached();
  await current.evaluate((link: HTMLAnchorElement) => link.click());
  await expect(page.locator('#freelance')).toBeInViewport({ timeout: 15000 });
  await expect(current).toHaveClass(/is-current/);
  await expect(page.locator('.rail__dot[data-rail="stack"]')).toHaveClass(
    /is-complete/
  );
  await expect(page.locator('.rail__dot[data-rail="galaxy"]')).not.toHaveClass(
    /is-complete/
  );
  const start = page.locator('.rail__dot[data-rail="top"]');
  await start.evaluate((link: HTMLAnchorElement) => link.click());
  await expect
    .poll(() => page.evaluate(() => window.scrollY), { timeout: 20000 })
    .toBeLessThan(20);
  await expect(start).toHaveClass(/is-current/, { timeout: 10000 });
  await expect(page.locator('.rail__dot.is-complete')).toHaveCount(0);
});

test('la lettre 3D reste visible lorsque le formulaire de contact est ouvert', async ({
  page,
  isMobile,
}, testInfo) => {
  test.setTimeout(60000);
  const letter = page.waitForResponse((response) =>
    response.url().endsWith('/models/contact_letter.glb')
  );
  await page.goto('/?capture=contact#contact');
  expect((await letter).ok()).toBe(true);
  await expect(page.locator('.contact__form-toggle')).toBeVisible();
  await page.waitForTimeout(5000);
  await page.locator('.contact__form-toggle').click();
  await expect(page.locator('#contact-form')).toBeVisible();
  await page.waitForTimeout(700);
  const size = page.viewportSize();
  if (!size) throw new Error('Taille du navigateur indisponible');
  const clip = isMobile
    ? {
        x: Math.round(size.width * 0.64),
        y: Math.round(size.height * 0.24),
        width: Math.round(size.width * 0.36),
        height: Math.round(size.height * 0.25),
      }
    : {
        x: Math.round(size.width * 0.64),
        y: Math.round(size.height * 0.32),
        width: Math.round(size.width * 0.3),
        height: Math.round(size.height * 0.42),
      };
  await page.screenshot({ path: testInfo.outputPath('contact-form-3d.png') });
  const visible = await page.screenshot({ clip });
  await page.locator('#world-3d').evaluate((canvas: HTMLElement) => {
    canvas.style.visibility = 'hidden';
  });
  const hidden = await page.screenshot({ clip });
  const changedPixels = await page.evaluate(
    async ([first, second]) => {
      const read = async (source: string) => {
        const image = new Image();
        image.src = `data:image/png;base64,${source}`;
        await image.decode();
        const canvas = document.createElement('canvas');
        canvas.width = image.width;
        canvas.height = image.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Canvas 2D indisponible');
        ctx.drawImage(image, 0, 0);
        return ctx.getImageData(0, 0, image.width, image.height).data;
      };
      const a = await read(first);
      const b = await read(second);
      let changed = 0;
      for (let i = 0; i < a.length; i += 4) {
        if (
          Math.abs(a[i] - b[i]) +
            Math.abs(a[i + 1] - b[i + 1]) +
            Math.abs(a[i + 2] - b[i + 2]) >
          40
        )
          changed += 1;
      }
      return changed;
    },
    [visible.toString('base64'), hidden.toString('base64')]
  );
  expect(changedPixels).toBeGreaterThan(100);
});

test('le fil de progression est centré sur les repères du rail', async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, 'Le fil vertical est réservé au bureau.');
  await page.goto('/');
  const rail = page.locator('.rail');
  await expect(rail).toBeVisible();
  const alignment = await rail.evaluate((element) => {
    const railBounds = element.getBoundingClientRect();
    const progress = getComputedStyle(element, '::after');
    const x =
      railBounds.left +
      parseFloat(progress.left) +
      parseFloat(progress.width) / 2;
    const markers = [...element.querySelectorAll('.rail__marker')];
    return {
      background: getComputedStyle(element, '::before').display,
      distances: markers.map((marker) => {
        const rect = marker.getBoundingClientRect();
        return Math.abs(rect.left + rect.width / 2 - x);
      }),
    };
  });
  expect(alignment.background).toBe('none');
  expect(Math.max(...alignment.distances)).toBeLessThan(1);
});

test('le contenu reste lisible si un objet 3D ne charge pas', async ({
  page,
}, testInfo) => {
  await page.route('**/models/galaxy_astrolabe.glb', (route) => route.abort());
  await page.goto('/');
  await expect(page.locator('#boot-loader')).toBeHidden({ timeout: 30000 });
  await expect(page.locator('.rail__dot[data-rail="galaxy"]')).toBeAttached();
  await page.evaluate(() => {
    const link = document.querySelector<HTMLAnchorElement>(
      '.rail__dot[data-rail="galaxy"]'
    );
    if (!link) throw new Error('Navigation Galaxy introuvable');
    link.click();
  });
  await expect(page.locator('#galaxy')).toBeInViewport({ timeout: 15000 });
  await page.waitForTimeout(1000);
  await page.screenshot({
    path: testInfo.outputPath('galaxy-sans-modele.png'),
  });
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
    if (
      page.viewportSize()!.width <= 980 &&
      page.viewportSize()!.height > 740
    ) {
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
  if (page.viewportSize()!.width <= 860 && page.viewportSize()!.height <= 740) {
    await page.evaluate(() => {
      const top = document.querySelector('#top')!;
      window.scrollTo(0, top.getBoundingClientRect().bottom + scrollY + 80);
    });
    await expect(page.locator('.hero__inner')).toBeHidden();
    await page.evaluate(() => window.scrollTo(0, 0));
    await expect(page.locator('.hero__inner')).toBeVisible();
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
  test.skip(
    Boolean(process.env.E2E_BASE_URL),
    'Atelier scene-lab : outil du serveur de développement, absent d’un build.'
  );
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
  test.skip(
    Boolean(process.env.E2E_BASE_URL),
    'Atelier scene-lab : outil du serveur de développement, absent d’un build.'
  );
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
    await page.evaluate(() => {
      const top = document.querySelector('#top')!;
      const lowScreen = innerWidth <= 860 && innerHeight <= 740;
      window.scrollTo(
        0,
        lowScreen ? top.getBoundingClientRect().bottom + scrollY + 80 : 100
      );
    });
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
  test.setTimeout(90_000);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript(() => {
    window.addEventListener('world-settled', () => {
      document.documentElement.dataset.worldSettled = 'true';
    });
  });
  await page.goto('/');
  // Le héros montre le médaillon AG : les aiguilles n'existent qu'une fois
  // l'horloge révélée, et le rendu n'est prêt qu'après le chargement des modèles.
  await expect(page.locator('html')).toHaveAttribute(
    'data-world-settled',
    'true',
    { timeout: 60_000 }
  );
  await page.evaluate(() => {
    const section = document.querySelector('#intro');
    if (!section) throw new Error('Introduction introuvable');
    window.scrollTo(
      0,
      section.getBoundingClientRect().top + window.scrollY - innerHeight * 0.32
    );
  });
  const canvas = page.locator('#world-3d');
  await expect(canvas).toBeVisible();
  // Mouvement réduit : l'image est rafraîchie une fois par seconde, la
  // trotteuse doit donc avancer entre deux captures espacées de 2,2 s.
  await page.waitForTimeout(1500);
  const before = await canvas.screenshot();
  await page.waitForTimeout(2200);
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

test('le titre des études reste visible après navigation et stabilisation', async ({
  page,
}) => {
  await page.goto('/');
  const rail = page.locator('.rail__dot[data-rail="studies"]');
  await expect(rail).toBeAttached();
  await rail.evaluate((link: HTMLElement) => link.click());
  const title = page.locator('#studies .studies__title');
  await expect(title).toBeInViewport({ ratio: 1, timeout: 15_000 });
  await page.waitForTimeout(2000);
  await expect(title).toBeInViewport({ ratio: 1 });
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

test('captures des projets après installation de la scène sur WebKit', async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name !== 'iphone-webkit',
    'Diagnostic WebKit isolé.'
  );
  test.setTimeout(180_000);
  await page.addInitScript(() => {
    window.addEventListener('world-settled', () => {
      document.documentElement.dataset.worldSettled = 'true';
    });
  });
  for (const section of ['galaxy', 'ludora', 'magnotes']) {
    await page.goto(`/?capture=${section}#${section}`);
    await expect(page.locator('html')).toHaveAttribute(
      'data-world-settled',
      'true',
      { timeout: 45_000 }
    );
    await page.waitForTimeout(2000);
    await page.screenshot({
      path: testInfo.outputPath(`webgl-${section}.png`),
    });
  }
});

test('prototype mobile compact : parcours et captures des projets', async ({
  page,
  isMobile,
}, testInfo) => {
  test.skip(
    !process.env.RUN_STARTUP_EXPERIMENTS || !isMobile,
    'Prototype mobile lancé à la demande.'
  );
  test.setTimeout(120_000);
  await page.addInitScript(() =>
    window.addEventListener(
      'world-settled',
      () => {
        document.documentElement.dataset.worldSettled = 'true';
      },
      { once: true }
    )
  );
  for (const id of ['galaxy', 'ludora', 'magnotes']) {
    await page.goto(`/?compact-mobile&capture=${id}#${id}`);
    await expect(page.locator('html')).toHaveClass(/compact-mobile/);
    await expect(page.locator('html')).toHaveAttribute(
      'data-world-settled',
      'true',
      { timeout: 45_000 }
    );
    await expect(page.locator(`#${id} h3`)).toBeVisible();
    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth
      )
    ).toBeLessThanOrEqual(1);
    await page.waitForTimeout(1200);
    await page.screenshot({ path: testInfo.outputPath(`compact-${id}.png`) });
    const exhibit = page.locator(`#${id} .chapter__exhibit`);
    await exhibit.evaluate((node) =>
      node.scrollIntoView({ block: 'center', behavior: 'instant' })
    );
    await page.waitForTimeout(1200);
    await expect(exhibit.locator('img')).toBeVisible();
  }
});

test.describe('écran d’attente', () => {
  test.use({ keepLoader: true });

  test('capture de la première image du prototype anticipé', async ({
    page,
  }, testInfo) => {
    test.skip(
      !process.env.RUN_STARTUP_EXPERIMENTS,
      'Diagnostic lancé à la demande.'
    );
    await page.goto('/?early-boot');
    await expect(page.locator('#boot-loader')).toHaveClass(/is-done/, {
      timeout: 30_000,
    });
    await page.waitForTimeout(700);
    await page.screenshot({ path: testInfo.outputPath('prototype-hero.png') });
  });

  test('profil CPU du premier défilement anticipé', async ({
    page,
  }, testInfo) => {
    test.skip(
      !process.env.RUN_STARTUP_EXPERIMENTS,
      'Diagnostic lancé à la demande.'
    );
    test.skip(
      testInfo.project.name !== 'desktop-chromium',
      'Profil CDP Chromium uniquement.'
    );
    test.setTimeout(60_000);
    await page.goto('/?early-boot');
    await expect(page.locator('#boot-loader')).toHaveClass(/is-done/, {
      timeout: 30_000,
    });
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Profiler.enable');
    await cdp.send('Profiler.start');
    await page.evaluate(async () => {
      await new Promise<void>((resolve) => {
        let start = 0;
        const step = (now: number): void => {
          if (!start) start = now;
          const progress = Math.min((now - start) / 6000, 1);
          window.scrollTo(0, progress * 1300);
          if (progress < 1) requestAnimationFrame(step);
          else resolve();
        };
        requestAnimationFrame(step);
      });
    });
    const { profile } = await cdp.send('Profiler.stop');
    await cdp.detach();
    const nodes = new Map(profile.nodes.map((node) => [node.id, node]));
    const totals = new Map<string, number>();
    profile.samples?.forEach((id, index) => {
      const node = nodes.get(id);
      if (!node) return;
      const label = `${node.callFrame.functionName || '(anonyme)'} ${node.callFrame.url.split('/').pop() || ''}`;
      totals.set(
        label,
        (totals.get(label) ?? 0) + (profile.timeDeltas?.[index] ?? 0)
      );
    });
    console.log(
      'Profil CPU, temps propre estimé (ms) :',
      [...totals]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 12)
        .map(([name, time]) => ({ name, ms: Math.round(time / 1000) }))
    );
  });

  test('la préparation différée reprend après le défilement', async ({
    page,
  }, testInfo) => {
    test.skip(
      !process.env.RUN_STARTUP_EXPERIMENTS,
      'Diagnostic lancé à la demande.'
    );
    test.setTimeout(120_000);
    await page.addInitScript(() => {
      window.addEventListener(
        'world-settled',
        () => {
          document.documentElement.dataset.worldSettled = 'true';
        },
        { once: true }
      );
    });
    await page.goto('/?early-boot&idle-warmup&no-shader-log');
    await expect(page.locator('#boot-loader')).toHaveClass(/is-done/, {
      timeout: 30_000,
    });
    await page.evaluate(async () => {
      await new Promise<void>((resolve) => {
        let start = 0;
        const step = (now: number): void => {
          if (!start) start = now;
          const progress = Math.min((now - start) / 6000, 1);
          window.scrollTo(0, progress * 1300);
          if (progress < 1) requestAnimationFrame(step);
          else resolve();
        };
        requestAnimationFrame(step);
      });
    });
    await expect(page.locator('html')).toHaveAttribute(
      'data-world-settled',
      'true',
      { timeout: 60_000 }
    );
    for (const id of ['galaxy', 'ludora', 'magnotes']) {
      await page
        .locator(`.rail__dot[data-rail="${id}"]`)
        .evaluate((link: HTMLElement) => link.click());
      await expect(page.locator(`#${id}`)).toBeInViewport({ ratio: 0.01 });
      await page.waitForTimeout(2000);
      await page.screenshot({ path: testInfo.outputPath(`idle-${id}.png`) });
    }
  });

  test('comparaison expérimentale du démarrage et du premier défilement', async ({
    page,
  }, testInfo) => {
    test.skip(
      !process.env.RUN_STARTUP_EXPERIMENTS,
      'Diagnostic lancé à la demande.'
    );
    test.setTimeout(240_000);
    for (const mode of [
      'baseline',
      'early-boot&idle-warmup',
      'early-boot&idle-warmup',
      'baseline',
    ]) {
      const query =
        mode === 'baseline' ? 'warmup-trace' : `${mode}&warmup-trace`;
      await page.goto(`/?${query}`);
      await page.waitForFunction(
        () => {
          const loader = document.getElementById('boot-loader');
          return !loader || loader.classList.contains('is-done');
        },
        undefined,
        { timeout: 30_000 }
      );
      const result = await page.evaluate(async () => {
        const visibleAt = performance.now();
        const gaps: number[] = [];
        await new Promise<void>((resolve) => {
          let start = 0;
          let previous = 0;
          const step = (now: number): void => {
            if (!start) start = now;
            if (previous) gaps.push(now - previous);
            previous = now;
            const progress = Math.min((now - start) / 6000, 1);
            window.scrollTo(0, progress * 1300);
            if (progress < 1) requestAnimationFrame(step);
            else resolve();
          };
          requestAnimationFrame(step);
        });
        return {
          visibleMs: Math.round(visibleAt),
          frames: gaps.length,
          over50: gaps.filter((gap) => gap > 50).length,
          over100: gaps.filter((gap) => gap > 100).length,
          maxMs: Math.round(Math.max(0, ...gaps)),
          warmup: ['warmup-texture', 'warmup-draw'].map((name) => {
            const entries = performance
              .getEntriesByName(name)
              .filter((entry) => entry.startTime >= visibleAt);
            return {
              name,
              count: entries.length,
              totalMs: Math.round(
                entries.reduce((sum, entry) => sum + entry.duration, 0)
              ),
              maxMs: Math.round(
                Math.max(0, ...entries.map((entry) => entry.duration))
              ),
            };
          }),
        };
      });
      console.log(`${testInfo.project.name} ${mode} ${JSON.stringify(result)}`);
    }
  });

  test('prototype : défilement rapide, pauses et liens directs', async ({
    page,
  }, testInfo) => {
    test.skip(
      !process.env.RUN_STARTUP_EXPERIMENTS,
      'Diagnostic lancé à la demande.'
    );
    test.setTimeout(240_000);
    await page.addInitScript(() =>
      window.addEventListener(
        'world-ready',
        () => performance.mark('diagnostic-world-ready'),
        { once: true }
      )
    );
    for (const mode of ['baseline', 'early-boot&idle-warmup']) {
      const query = mode === 'baseline' ? '' : `?${mode}`;
      await page.goto(`/${query}`);
      await page.waitForFunction(
        () => {
          const loader = document.getElementById('boot-loader');
          return !loader || loader.classList.contains('is-done');
        },
        undefined,
        { timeout: 30_000 }
      );
      const phases = await page.evaluate(async () => {
        const measure = async (target: number | null, duration: number) => {
          const gaps: number[] = [];
          const from = scrollY;
          await new Promise<void>((resolve) => {
            let start = 0;
            let previous = 0;
            const step = (now: number): void => {
              if (!start) start = now;
              if (previous) gaps.push(now - previous);
              previous = now;
              const progress = Math.min((now - start) / duration, 1);
              if (target !== null)
                scrollTo(0, from + (target - from) * progress);
              if (progress < 1) requestAnimationFrame(step);
              else resolve();
            };
            requestAnimationFrame(step);
          });
          return {
            frames: gaps.length,
            over100: gaps.filter((gap) => gap > 100).length,
            maxMs: Math.round(Math.max(0, ...gaps)),
          };
        };
        return [
          await measure(1400, 1000),
          await measure(null, 2500),
          await measure(4000, 1000),
          await measure(null, 2500),
        ];
      });
      console.log(
        `${testInfo.project.name} ${mode} geste/pause/geste/pause ${JSON.stringify(phases)}`
      );
      for (const id of ['galaxy', 'ludora', 'magnotes']) {
        const directQuery =
          mode === 'baseline' ? `?capture=${id}` : `?${mode}&capture=${id}`;
        await page.goto(`/${directQuery}#${id}`);
        await page.waitForFunction(
          (scene) =>
            performance.getEntriesByName(`scene-loaded-${scene}`).length > 0,
          id,
          { timeout: 45_000 }
        );
        await page.waitForFunction(
          () =>
            performance.getEntriesByName('diagnostic-world-ready').length > 0,
          undefined,
          { timeout: 45_000 }
        );
        await page.waitForFunction(
          () => {
            const loader = document.getElementById('boot-loader');
            return !loader || loader.classList.contains('is-done');
          },
          undefined,
          { timeout: 30_000 }
        );
        const loaded = await page.evaluate(
          (scene) => ({
            modelMs: Math.round(
              performance.getEntriesByName(`scene-loaded-${scene}`)[0].startTime
            ),
            renderReadyMs: Math.round(
              performance.getEntriesByName('diagnostic-world-ready')[0]
                .startTime
            ),
            contentReadyMs: Math.round(performance.now()),
          }),
          id
        );
        await page.waitForTimeout(2000);
        await page.screenshot({
          path: testInfo.outputPath(
            `${mode === 'baseline' ? 'actuel' : 'differe'}-${id}.png`
          ),
        });
        console.log(
          `${testInfo.project.name} ${mode} ${id} ${JSON.stringify(loaded)} ms depuis navigation`
        );
      }
    }
  });

  test('couvre la page puis disparaît quand la 3D est installée', async ({
    page,
  }) => {
    test.setTimeout(120_000);
    await page.addInitScript(() => {
      for (const event of ['world-ready', 'world-settled']) {
        window.addEventListener(
          event,
          () => {
            document.documentElement.setAttribute(
              `data-${event}-ms`,
              String(Math.round(performance.now()))
            );
          },
          { once: true }
        );
      }
    });
    await page.goto('/');
    await expect(page.locator('#boot-loader')).toBeAttached();
    await expect(page.locator('#boot-loader')).toHaveCount(0, {
      timeout: 60_000,
    });
    console.log(
      `Chargeur retiré après ${Math.round(await page.evaluate(() => performance.now()))} ms depuis la navigation`
    );
    console.log(
      'Étapes 3D :',
      await page.locator('html').getAttribute('data-world-ready-ms'),
      await page.locator('html').getAttribute('data-world-settled-ms')
    );
    await expect(page.locator('#world-3d')).toBeVisible();
  });
});

for (const size of [
  { width: 360, height: 640 },
  { width: 390, height: 664 },
]) {
  test(`liens projets accessibles sur ${size.width} px`, async ({
    page,
    isMobile,
  }, testInfo) => {
    test.skip(!isMobile, 'Contrôle réservé aux profils tactiles.');
    await page.setViewportSize(size);
    await page.goto('/');
    await expect(page.locator('.hero__projects a')).toHaveCount(3);
    await expect(page.locator('.rail')).toBeAttached();
    await page.waitForFunction(() => {
      const projects = document.querySelector('.hero__projects');
      return projects && getComputedStyle(projects).opacity === '1';
    });
    const initialOverlap = await page.evaluate(() => {
      const rail = document.querySelector('.rail')!.getBoundingClientRect();
      return [...document.querySelectorAll('.hero__projects a')].some(
        (link) => {
          const rect = link.getBoundingClientRect();
          return (
            rect.top < innerHeight &&
            rect.bottom > rail.top &&
            rect.top < rail.bottom
          );
        }
      );
    });
    expect(initialOverlap).toBe(false);
    for (const lang of ['fr', 'en']) {
      if ((await page.locator('html').getAttribute('lang')) !== lang) {
        await page.locator('#lang-toggle').click();
      }
      await expect(page.locator('html')).toHaveAttribute('lang', lang);
      for (const link of await page.locator('.hero__projects a').all()) {
        await link.evaluate((element) =>
          element.scrollIntoView({ block: 'center', inline: 'nearest' })
        );
        await expect
          .poll(async () =>
            link.evaluate((element) => {
              const rect = element.getBoundingClientRect();
              const hit = document.elementFromPoint(
                rect.left + rect.width / 2,
                rect.top + rect.height / 2
              );
              return hit === element || element.contains(hit);
            })
          )
          .toBe(true);
        await expect(link).toBeInViewport();
        await link.click({ trial: true });
      }
      await page.screenshot({
        path: testInfo.outputPath('hero-links-' + lang + '.png'),
      });
    }
  });
}
