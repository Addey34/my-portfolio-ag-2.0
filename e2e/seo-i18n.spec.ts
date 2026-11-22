import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { DICTIONARIES } from '../src/i18n/dictionary';
import { LANGUAGE_PATHS, ORIGIN, SEO } from '../src/i18n/seo';

for (const locale of ['fr', 'en'] as const) {
  test(`HTML initial, sans JavaScript : ${locale}`, async ({
    browser,
    baseURL,
  }, testInfo) => {
    const context = await browser.newContext({
      ...testInfo.project.use,
      javaScriptEnabled: false,
    });
    const page = await context.newPage();
    try {
      await page.goto(baseURL + LANGUAGE_PATHS[locale]);
      await expect(page.locator('html')).toHaveAttribute('lang', locale);
      await expect(page).toHaveTitle(SEO[locale].title);
      await expect(page.locator('.hero__lead')).toHaveText(
        DICTIONARIES[locale]['hero.lead']
      );
      for (const id of [
        'galaxy',
        'ludora',
        'magnotes',
        'siteguardian',
        'imagegeneratorlocal',
      ]) {
        await expect(page.locator(`#${id}`)).toContainText(
          locale === 'fr' ? 'Contribution' : 'Contribution'
        );
      }
      await expect(page.locator('#boot-loader')).toBeHidden();
      const link = page.locator('#lang-toggle');
      await link.focus();
      await expect(link).toBeFocused();
      await page.keyboard.press('Enter');
      await expect(page.locator('html')).toHaveAttribute(
        'lang',
        locale === 'fr' ? 'en' : 'fr'
      );
      await expect(page.locator('[data-contact-email]')).toHaveAttribute(
        'href',
        'mailto:contact@adrianguichard.dev'
      );
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1
        )
      ).toBe(true);
    } finally {
      await context.close();
    }
  });

  test(`URL prioritaire, métadonnées et rechargement : ${locale}`, async ({
    page,
  }) => {
    await page.addInitScript(
      (language) => localStorage.setItem('ag-locale', language),
      locale === 'fr' ? 'en' : 'fr'
    );
    await page.goto(LANGUAGE_PATHS[locale]);
    await expect(page.locator('html')).toHaveAttribute('lang', locale);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      'href',
      ORIGIN + LANGUAGE_PATHS[locale]
    );
    await expect(page.locator('meta[property="og:locale"]')).toHaveAttribute(
      'content',
      SEO[locale].ogLocale
    );
    const json = await page
      .locator('script[type="application/ld+json"]')
      .textContent();
    expect(JSON.parse(json!)['@id']).toBe(ORIGIN + '/#person');
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('lang', locale);
  });
}

test('bascule au milieu du récit, historique et montage 3D unique', async ({
  page,
}, testInfo) => {
  test.setTimeout(180_000);
  await page.route(
    /\/(?:assets\/index-[^/]+\.js|src\/main\.ts)(?:\?.*)?$/,
    async (route) => {
      const response = await route.fetch();
      const source = await response.text();
      const clock = [...source.matchAll(/([\w$]+)\.ticker\.add\(/g)].at(
        -1
      )?.[1];
      if (!clock)
        throw new Error('Ticker GSAP non trouvé dans la racine de composition');
      // Après l'évaluation du module, les imports CJS optimisés de Vite dev sont prêts.
      const probe = `queueMicrotask(()=>{const original=${clock}.ticker.add;window.seoTickerAdds=0;${clock}.ticker.add=function(...args){window.seoTickerAdds++;return Reflect.apply(original,this,args);};});`;
      await route.fulfill({ response, body: probe + source });
    }
  );
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    const canvases = new Set<HTMLCanvasElement>();
    let contexts = 0;
    HTMLCanvasElement.prototype.getContext = function (
      type: string,
      ...args: unknown[]
    ) {
      if (type.includes('webgl')) {
        contexts++;
        canvases.add(this);
      }
      return Reflect.apply(original, this, [type, ...args]);
    } as typeof original;
    Object.defineProperty(window, 'seoProbe', {
      value: {
        canvases,
        get contexts() {
          return contexts;
        },
        canvas: null,
      },
    });
    addEventListener('world-settled', () => {
      document.documentElement.dataset.seoSettled = 'true';
    });
  });
  await page.goto('/#galaxy');
  await expect(page.locator('html')).toHaveAttribute(
    'data-seo-settled',
    'true',
    { timeout: 60_000 }
  );
  await expect(page.locator('#boot-loader')).toHaveCount(0);
  const before = await page.evaluate(() => {
    const probe = Reflect.get(window, 'seoProbe');
    probe.canvas = document.getElementById('world-3d');
    return {
      contexts: probe.contexts,
      canvases: probe.canvases.size,
      tickerAdds: Reflect.get(window, 'seoTickerAdds'),
    };
  });
  expect(before.canvases).toBe(1);
  expect(before.tickerAdds).toBe(0);
  await page.locator('#galaxy .chapter__panel').scrollIntoViewIfNeeded();
  const link = page.locator('#lang-toggle');
  await link.focus();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/en\/#galaxy$/);
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.locator('#galaxy .chapter__tagline')).toContainText(
    'real-time'
  );
  await expect(link).toBeFocused();
  await expect(page.locator('#galaxy')).toBeInViewport({ ratio: 0.05 });
  await page.goBack();
  await expect(page.locator('html')).toHaveAttribute('lang', 'fr');
  await page.goForward();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    'href',
    ORIGIN + '/en/'
  );
  const after = await page.evaluate(() => {
    const probe = Reflect.get(window, 'seoProbe');
    return {
      contexts: probe.contexts,
      canvases: probe.canvases.size,
      same: probe.canvas === document.getElementById('world-3d'),
      tickerAdds: Reflect.get(window, 'seoTickerAdds'),
    };
  });
  expect(after).toEqual({ ...before, same: true });
  for (const language of ['en', 'fr']) {
    if (language === 'fr') {
      await link.click();
      await expect(page.locator('html')).toHaveAttribute('lang', 'fr');
    }
    for (const id of [
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
    ]) {
      const target = page.locator(
        ['galaxy', 'ludora', 'magnotes'].includes(id)
          ? `#${id} .chapter__beat--context`
          : `#${id}`
      );
      await target.scrollIntoViewIfNeeded();
      await page.waitForTimeout(1200);
      await expect(target).toBeInViewport({ ratio: 0.05 });
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1
        )
      ).toBe(true);
      await page.screenshot({
        path: testInfo.outputPath(`${language}-${id}.png`),
        scale: 'css',
      });
    }
  }
});

test('anglais sans WebGL, mouvement réduit et stockage bloqué', async ({
  page,
}, testInfo) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', {
      get() {
        throw new Error('stockage bloqué');
      },
    });
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
  await page.goto('/en/#magnotes');
  await expect(page.locator('#boot-loader')).toHaveCount(0, {
    timeout: 20_000,
  });
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await page.locator('#lang-toggle').click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'fr');
  await page.screenshot({ path: testInfo.outputPath('sans-webgl.png') });
});

test('sitemap XML et alternates réciproques', async ({ page, request }) => {
  const response = await request.get('/sitemap.xml');
  expect(response.ok()).toBe(true);
  const xml = await response.text();
  await page.goto('/');
  const parsed = await page.evaluate((source) => {
    const document = new DOMParser().parseFromString(source, 'application/xml');
    return {
      errors: document.querySelectorAll('parsererror').length,
      urls: document.getElementsByTagName('url').length,
      links: document.getElementsByTagNameNS(
        'http://www.w3.org/1999/xhtml',
        'link'
      ).length,
    };
  }, xml);
  expect(parsed).toEqual({ errors: 0, urls: 2, links: 6 });
  for (const path of ['/', '/en/']) {
    await page.goto(path);
    expect(
      await page
        .locator('head link[rel="alternate"]')
        .evaluateAll((nodes) =>
          nodes.map((node) => [
            node.getAttribute('hreflang'),
            node.getAttribute('href'),
          ])
        )
    ).toEqual([
      ['fr', ORIGIN + '/'],
      ['en', ORIGIN + '/en/'],
      ['x-default', ORIGIN + '/'],
    ]);
  }
});

test('JSON-LD sous la CSP existante, sans exception de sécurité', async ({
  page,
}) => {
  const policy = readFileSync('public/_headers', 'utf8')
    .split('\n')
    .find((line) => line.includes('Content-Security-Policy:'))!
    .split('Content-Security-Policy:')[1]
    .trim();
  await page.route('**/*', async (route) => {
    if (route.request().resourceType() !== 'document') return route.continue();
    const response = await route.fetch();
    await route.fulfill({
      response,
      headers: { ...response.headers(), 'content-security-policy': policy },
    });
  });
  await page.addInitScript(() => {
    Reflect.set(window, 'seoCspViolations', []);
    addEventListener('securitypolicyviolation', (event) =>
      Reflect.get(window, 'seoCspViolations').push({
        directive: event.effectiveDirective,
        blocked: event.blockedURI,
      })
    );
  });
  await page.goto('/en/');
  await expect(page.locator('html')).toHaveClass(/\bjs\b/);
  const person = JSON.parse(
    (await page.locator('script[type="application/ld+json"]').textContent())!
  );
  expect(person['@id']).toBe(ORIGIN + '/#person');
  expect(
    await page.evaluate(() =>
      Reflect.get(window, 'seoCspViolations').filter(
        (violation: { directive: string }) =>
          violation.directive.startsWith('script-src')
      )
    )
  ).toEqual([]);
});

test('clic modifié ouvre le document anglais sans changer la scène source', async ({
  page,
  context,
  isMobile,
}) => {
  test.skip(isMobile, 'Interaction clavier de bureau');
  await page.goto('/#magnotes');
  await expect(page.locator('#boot-loader')).toHaveCount(0, {
    timeout: 20_000,
  });
  const popupPromise = context.waitForEvent('page');
  await page.locator('#lang-toggle').click({ modifiers: ['ControlOrMeta'] });
  const popup = await popupPromise;
  await popup.waitForLoadState('domcontentloaded');
  await expect(popup).toHaveURL(/\/en\/#magnotes$/);
  await expect(popup.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.locator('html')).toHaveAttribute('lang', 'fr');
  await popup.close();
});

test('réglages, formulaire ouvert et commande de langue conservés', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/en/#contact');
  await expect(page.locator('#boot-loader')).toHaveCount(0, {
    timeout: 20_000,
  });
  await page.locator('#controls-open').click();
  await page.locator('#controls-transition').selectOption('fade');
  const switches = await page
    .locator('.controls__switch')
    .evaluateAll((nodes) =>
      nodes.map((node) => node.getAttribute('aria-checked'))
    );
  await page.keyboard.press('Escape');
  await page.locator('.contact__form-toggle').scrollIntoViewIfNeeded();
  await page.locator('.contact__form-toggle').click();
  await page.locator('#contact-name').fill('SEO qualification');
  await page.locator('#lang-toggle').click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'fr');
  await expect(page.locator('.contact__disclosure')).toHaveAttribute(
    'open',
    ''
  );
  await expect(page.locator('#contact-name')).toHaveValue('SEO qualification');
  await expect(page.locator('#controls-transition')).toHaveValue('fade');
  expect(
    await page
      .locator('.controls__switch')
      .evaluateAll((nodes) =>
        nodes.map((node) => node.getAttribute('aria-checked'))
      )
  ).toEqual(switches);
  await page.locator('#palette-open').click();
  await page.locator('.palette__input').fill('FR / EN');
  await page.keyboard.press('Enter');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page).toHaveURL(/\/en\/#contact$/);
  await expect(page.locator('#contact-name')).toHaveValue('SEO qualification');
});
