import { expect } from '@playwright/test';
import { openPortfolioUI, uiTest } from './entry-module';

const PROJECT_IDS = ['galaxy', 'ludora', 'magnotes', 'siteguardian'];

uiTest(
  'identité : héros et approche annoncent le profil sans promesse inventée',
  async ({ page }) => {
    await openPortfolioUI(page);
    await expect(page.locator('.hero__tag').first()).toHaveText(
      'Développeur full-stack JS/TS'
    );
    await expect(page.locator('.hero__lead')).toContainText('autodidacte');
    await expect(page.locator('.hero__lead')).toContainText('backend');
    const facts = page.locator('.intro__facts li');
    await expect(facts).toHaveCount(3);
    await expect(facts.first()).toContainText('Formé en construisant');
    await expect(page.locator('.intro__link')).toHaveAttribute(
      'href',
      '#projects'
    );

    await page.locator('#lang-toggle').click();
    await expect(page.locator('.hero__lead')).toContainText('Self-taught');
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
