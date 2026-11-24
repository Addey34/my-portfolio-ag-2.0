import { expect, test, type Page } from '@playwright/test';
import { openPortfolioUI, uiTest } from './entry-module';

const PROJECT_IDS = ['galaxy', 'ludora', 'magnotes', 'siteguardian'];

uiTest(
  'identité : héros et approche annoncent le profil sans promesse inventée',
  async ({ page }) => {
    await openPortfolioUI(page);
    await expect(page.locator('.hero__tag').first()).toHaveText(
      'Développeur full-stack JS/TS'
    );
    await expect(page.locator('.hero__tag').nth(1)).toContainText(
      'Autodidacte'
    );
    await expect(page.locator('.hero__lead')).not.toContainText('autodidacte');
    await expect(page.locator('.hero__lead')).toContainText('backend');
    const facts = page.locator('.intro__facts li');
    await expect(facts).toHaveCount(3);
    await expect(facts.first()).toContainText('Formé en construisant');
    await expect(page.locator('.intro__link')).toHaveAttribute(
      'href',
      '#projects'
    );

    await page.locator('#lang-toggle').click();
    await expect(page.locator('.hero__tag').nth(1)).toContainText(
      'Self-taught'
    );
    await expect(page.locator('.hero__lead')).not.toContainText('Self-taught');
    await expect(facts.nth(2)).toContainText('Shipped, not just shown');
    await expect(page.locator('.intro__link')).toHaveText(
      'See the three products'
    );
  }
);

uiTest(
  'expertise : chaque famille relie ses technologies à une décision et à des produits',
  async ({ page }) => {
    await openPortfolioUI(page, '/#stack');
    const families = page.locator('#stack .stack-family');
    await expect(families).toHaveCount(4);
    for (const family of await families.all()) {
      await expect(family.locator('.stack-family__decision')).not.toBeEmpty();
      await expect(family.locator('.stack-node')).toHaveCount(6);
      const links = family.locator('.stack-family__proof a');
      expect(await links.count()).toBeGreaterThanOrEqual(2);
      for (const href of await links.evaluateAll((nodes) =>
        nodes.map((node) => node.getAttribute('href') ?? '')
      )) {
        expect(PROJECT_IDS).toContain(href.slice(1));
        await expect(page.locator(href)).toHaveCount(1);
      }
    }
    await page.locator('#lang-toggle').click();
    await expect(
      families.first().locator('.stack-family__proof')
    ).toContainText('Put into practice in');
  }
);

uiTest(
  'missions : résultat, preuves et contact préparé depuis chaque proposition',
  async ({ page }, testInfo) => {
    await page.addInitScript(() => {
      const original = HTMLAnchorElement.prototype.click;
      HTMLAnchorElement.prototype.click = function () {
        if (this.href.startsWith('mailto:')) {
          document.documentElement.dataset.testMailto = this.href;
          return;
        }
        original.call(this);
      };
    });
    await openPortfolioUI(page, '/#freelance');
    const cards = page.locator('#freelance .offer-card');
    await expect(cards).toHaveCount(4);
    for (const card of await cards.all()) {
      await expect(card.locator('.offer-card__cta')).toHaveAttribute(
        'href',
        '#contact'
      );
      for (const href of await card
        .locator('.offer-card__proof a')
        .evaluateAll((nodes) =>
          nodes.map((node) => node.getAttribute('href') ?? '')
        )) {
        expect(PROJECT_IDS).toContain(href.slice(1));
        await expect(page.locator(href)).toHaveCount(1);
      }
    }
    await page.screenshot({ path: testInfo.outputPath('missions.png') });

    // Une proposition prépare le formulaire : nature de la demande et ouverture.
    await cards
      .nth(1)
      .locator('.offer-card__cta')
      .evaluate((link: HTMLAnchorElement) => link.click());
    const mission = page.locator('.contact__intent[data-intent="mission"]');
    await expect(mission).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('.contact__disclosure')).toHaveJSProperty(
      'open',
      true
    );
    await page.locator('#contact-name').fill('Test');
    await page.locator('#contact-email').fill('test@example.invalid');
    await page.locator('#contact-message').fill('Besoin test');
    await page.locator('button[type=submit]').click();
    const mail = await page.locator('html').getAttribute('data-test-mailto');
    expect(decodeURIComponent(mail ?? '')).toContain('subject=Mission — Test');

    // Le choix reste modifiable et se désactive.
    await page.locator('.contact__intent[data-intent="role"]').click();
    await expect(mission).toHaveAttribute('aria-pressed', 'false');
    await page.locator('.contact__intent[data-intent="role"]').click();
    await expect(
      page.locator('.contact__intent[aria-pressed="true"]')
    ).toHaveCount(0);
  }
);

uiTest(
  'conversion : l’email reste le chemin principal et la confidentialité est énoncée',
  async ({ page }) => {
    await openPortfolioUI(page, '/#contact');
    await expect(page.locator('[data-contact-primary]')).toHaveAttribute(
      'href',
      'mailto:contact@adrianguichard.dev'
    );
    await page.locator('.contact__form-toggle').click();
    await expect(page.locator('.contact__form-note').last()).toContainText(
      'n’envoie rien à un serveur'
    );
    await page.locator('#lang-toggle').click();
    await expect(page.locator('.contact__form-note').last()).toContainText(
      'sends nothing to a server'
    );
    // Aucun champ nommé : rien n'est soumissible vers un serveur.
    await expect(page.locator('#contact-form [name]')).toHaveCount(0);
  }
);

uiTest(
  'mouvement réduit : identité, familles et missions sont lisibles sans animation',
  async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await openPortfolioUI(page);
    for (const selector of [
      '.intro__facts li:first-child',
      '#stack .stack-family:first-child',
      '#freelance .offer-card:first-child',
      '.contact__primary',
    ]) {
      const target = page.locator(selector);
      await target.evaluate((node) => node.scrollIntoView({ block: 'center' }));
      await expect(target).toBeVisible();
      await expect(target).toHaveCSS('opacity', '1');
    }
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth - innerWidth
      )
    ).toBeLessThanOrEqual(1);
  }
);

/** Intercepte le mailto sans ouvrir de client email. */
async function captureMailto(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const original = HTMLAnchorElement.prototype.click;
    HTMLAnchorElement.prototype.click = function () {
      if (this.href.startsWith('mailto:')) {
        document.documentElement.dataset.testMailto = this.href;
        return;
      }
      original.call(this);
    };
  });
}

uiTest(
  'missions et poste : le formulaire s’ouvre par une vraie interaction clavier ou toucher',
  async ({ page, hasTouch }) => {
    await captureMailto(page);
    await openPortfolioUI(page, '/#freelance');
    const intents: [string, string][] = [
      ['#freelance .offer-card:nth-child(3) .offer-card__cta', 'mission'],
      ['#freelance .offer-aside a', 'role'],
    ];
    for (const [selector, intent] of intents) {
      const cta = page.locator(selector);
      await cta.evaluate((node) => node.scrollIntoView({ block: 'center' }));
      if (hasTouch) {
        await cta.tap();
      } else {
        await cta.focus();
        await expect(cta).toBeFocused();
        await page.keyboard.press('Enter');
      }
      await expect(
        page.locator(`.contact__intent[data-intent="${intent}"]`)
      ).toHaveAttribute('aria-pressed', 'true');
      await expect(page.locator('.contact__disclosure')).toHaveJSProperty(
        'open',
        true
      );
      await expect(page.locator('#contact')).toBeInViewport({ ratio: 0.05 });
      await expect(page.locator('#contact-name')).toBeEnabled();
      // Retour aux missions pour la deuxième interaction.
      await page.evaluate(() =>
        document.getElementById('freelance')?.scrollIntoView()
      );
    }
  }
);

uiTest(
  'contact : l’action email est visible dès l’arrivée depuis le HUD et depuis le rail',
  async ({ page }) => {
    await openPortfolioUI(page);
    const entries = [
      '.hud__btn--link[href="#contact"]',
      '.rail__dot[data-rail="contact"]',
    ];
    for (const entry of entries) {
      await page.evaluate(() => window.scrollTo(0, 0));
      await expect(page.locator(entry)).toHaveCount(1);
      await page.locator(entry).evaluate((node: HTMLElement) => node.click());
      await expect(page.locator('#contact')).toBeInViewport();
      const cta = page.locator('[data-contact-primary]');
      await expect
        .poll(
          async () => {
            const box = await cta.boundingBox();
            const rail = await page.locator('.rail').boundingBox();
            const view = page.viewportSize()!;
            if (!box || !rail) return 'absent';
            const inside =
              box.y >= 0 &&
              box.y + box.height <= view.height &&
              box.x >= 0 &&
              box.x + box.width <= view.width;
            const overlaps =
              box.x < rail.x + rail.width &&
              box.x + box.width > rail.x &&
              box.y < rail.y + rail.height &&
              box.y + box.height > rail.y;
            return inside && !overlaps ? 'ok' : 'hors écran ou sous le rail';
          },
          { timeout: 15_000 }
        )
        .toBe('ok');
    }
  }
);

test('sans WebGL : identité, familles, missions et contact restent utilisables', async ({
  page,
}, testInfo) => {
  await captureMailto(page);
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
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#boot-loader')).toHaveCount(0, {
    timeout: 20_000,
  });
  // L'animation d'entrée du héros peut durer sous charge CPU : attente bornée explicite.
  await expect(page.locator('.hero__lead')).toBeVisible({ timeout: 15_000 });
  for (const selector of [
    '.intro__facts li:first-child',
    '#stack .stack-family:last-child',
    '#freelance .offer-card:first-child',
    '.contact__primary',
  ]) {
    const target = page.locator(selector);
    await target.evaluate((node) => node.scrollIntoView({ block: 'center' }));
    await expect(target).toBeVisible();
  }
  await page.screenshot({
    path: testInfo.outputPath('sans-webgl-contact.png'),
  });
  await page
    .locator('#freelance .offer-card:nth-child(2) .offer-card__cta')
    .evaluate((node: HTMLElement) => node.click());
  await expect(
    page.locator('.contact__intent[data-intent="mission"]')
  ).toHaveAttribute('aria-pressed', 'true');
  await page.locator('#contact-name').fill('Test');
  await page.locator('#contact-email').fill('test@example.invalid');
  await page.locator('#contact-message').fill('Sans WebGL');
  await page.locator('button[type=submit]').click();
  const mail = await page.locator('html').getAttribute('data-test-mailto');
  expect(decodeURIComponent(mail ?? '')).toContain('subject=Mission — Test');
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)
  ).toBeLessThanOrEqual(1);
});
