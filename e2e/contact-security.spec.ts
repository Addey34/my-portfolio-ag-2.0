import { test, expect, type Page } from '@playwright/test';
import { blockEntryModule } from './entry-module';

const marker = 'SYNTHETIC_PORT_SEC_001';
const address = 'synthetic@example.invalid';

async function guard(page: Page) {
  const leaks: string[] = [];
  await page.route('**/*', async (route) => {
    const request = route.request();
    const value = request.url() + (request.postData() ?? '');
    if (value.includes(marker) || value.includes(address) || value.includes('synthetic%40example.invalid')) {
      leaks.push(value);
      await route.abort();
    } else {
      await route.continue();
    }
  });
  return leaks;
}

async function checkFallback(page: Page) {
  await expect(page.locator('[data-contact-email]')).toHaveAttribute('href', 'mailto:contact@adrianguichard.dev');
  await expect(page.locator('#contact-form fieldset')).toHaveAttribute('disabled', '');
  for (const selector of ['#contact-name', '#contact-email', '#contact-message', 'button[type=submit]']) {
    await expect(page.locator('#contact-form').locator(selector)).toBeDisabled();
  }
  await expect(page.locator('#contact-form [name]')).toHaveCount(0);
}

test('parcours normal FR et EN, bouton et clavier sans envoi réel', async ({ page }) => {
  const leaks = await guard(page);
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
  await page.goto('/');
  await expect(page.locator('#boot-loader')).toHaveCount(0, { timeout: 60000 });
  const summary = page.locator('.contact__form-toggle');
  await summary.scrollIntoViewIfNeeded();
  await summary.click();
  const form = page.locator('#contact-form');
  await expect(form.locator('#contact-name')).toBeEnabled();
  await form.locator('#contact-name').fill(marker);
  await form.locator('#contact-email').fill(address);
  await form.locator('#contact-message').fill(marker);
  await form.locator('button[type=submit]').click();
  let mail = await page.locator('html').getAttribute('data-test-mailto');
  expect(mail).toContain('mailto:contact@adrianguichard.dev?');
  expect(decodeURIComponent(mail ?? '')).toContain(marker);
  expect(decodeURIComponent(mail ?? '')).toContain(address);
  await page.locator('#lang-toggle').click();
  await expect(form.locator('button[type=submit]')).toHaveText('Prepare the message');
  await page.evaluate(() => { delete document.documentElement.dataset.testMailto; });
  await form.locator('#contact-name').focus();
  await page.keyboard.press('Enter');
  mail = await page.locator('html').getAttribute('data-test-mailto');
  expect(decodeURIComponent(mail ?? '')).toContain(marker);
  expect(leaks).toEqual([]);
});

for (const mode of ['no-js', 'module-blocked', 'failure-before', 'failure-after'] as const) {
  test('repli sûr : ' + mode, async ({ browser, baseURL }, testInfo) => {
    const u = testInfo.project.use;
    const context = await browser.newContext({ baseURL, javaScriptEnabled: mode !== 'no-js', viewport: u.viewport, isMobile: u.isMobile, hasTouch: u.hasTouch, deviceScaleFactor: u.deviceScaleFactor, userAgent: u.userAgent });
    const page = await context.newPage();
    const leaks = await guard(page);
    let entryBlocked: (() => number) | undefined;
    if (mode === 'module-blocked') {
      entryBlocked = await blockEntryModule(page);
    }
    if (mode === 'failure-before') {
      await page.addInitScript(() => {
        const original = Document.prototype.getElementById;
        Document.prototype.getElementById = function (id) {
          if (id === 'contact-form') { document.documentElement.dataset.injectedFailure = 'before'; throw new Error('synthetic failure before contact setup'); }
          return original.call(this, id);
        };
      });
    }
    if (mode === 'failure-after') {
      await page.addInitScript(() => {
        const original = EventTarget.prototype.addEventListener;
        EventTarget.prototype.addEventListener = function (type, listener, options) {
          if (this instanceof HTMLFormElement && this.id === 'contact-form' && type === 'submit') {
            document.documentElement.dataset.injectedFailure = 'after';
            throw new Error('synthetic failure during handler installation');
          }
          return original.call(this, type, listener, options);
        };
      });
    }
    await page.goto('/');
    if (entryBlocked) expect(entryBlocked()).toBe(1);
    if (mode === 'failure-before') await expect(page.locator('html')).toHaveAttribute('data-injected-failure', 'before');
    if (mode === 'failure-after') await expect(page.locator('html')).toHaveAttribute('data-injected-failure', 'after');
    await checkFallback(page);
    // Un appel DOM forcé est adversarial : aucune donnée ne doit être sérialisée.
    const navigation = page.waitForEvent('framenavigated', { predicate: frame => frame === page.mainFrame() });
    await page.evaluate(({ marker, address }) => {
      const form = document.querySelector<HTMLFormElement>('#contact-form')!;
      form.querySelector<HTMLInputElement>('#contact-name')!.value = marker;
      form.querySelector<HTMLInputElement>('#contact-email')!.value = address;
      form.querySelector<HTMLTextAreaElement>('#contact-message')!.value = marker;
      form.submit();
    }, { marker, address });
    await navigation;
    expect(leaks).toEqual([]);
    expect(page.url()).not.toContain(marker);
    expect(page.url()).not.toContain('synthetic');
    await context.close();
  });
}

test('form.submit natif après initialisation ne sérialise aucun champ', async ({ page }) => {
  const leaks = await guard(page);
  await page.goto('/');
  await expect(page.locator('#contact-name')).toBeEnabled({ timeout: 30000 });
  const navigation = page.waitForEvent('framenavigated', { predicate: frame => frame === page.mainFrame() });
  await page.evaluate(({ marker, address }) => {
    const form = document.querySelector<HTMLFormElement>('#contact-form')!;
    form.querySelector<HTMLInputElement>('#contact-name')!.value = marker;
    form.querySelector<HTMLInputElement>('#contact-email')!.value = address;
    form.querySelector<HTMLTextAreaElement>('#contact-message')!.value = marker;
    form.submit();
  }, { marker, address });
  await navigation;
  expect(leaks).toEqual([]);
  expect(page.url()).not.toContain(marker);
  expect(page.url()).not.toContain('synthetic');
});
