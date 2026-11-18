import { expect, test, type BrowserContextOptions } from '@playwright/test';
import { blockEntryModule } from './entry-module';

const name = 'NomSynthétique & é';
const email = 'qualification@example.invalid';
const message = 'MessageSynthétique & élève\nDeuxième ligne';

test('validation native, trim, encodage exact et clavier FR/EN', async ({ page }) => {
  test.setTimeout(120_000);
  page.setDefaultTimeout(25_000);
  await page.route('**/*', async (route) => {
    const data = route.request().url() + (route.request().postData() ?? '');
    if (/NomSynth|MessageSynth|qualification(?:%40|@)example/i.test(data)) throw new Error('Données synthétiques sur le réseau');
    await route.continue();
  });
  await page.addInitScript(() => {
    const original = HTMLAnchorElement.prototype.click;
    HTMLAnchorElement.prototype.click = function () {
      if (this.href.startsWith('mailto:')) { document.documentElement.dataset.testMail = this.href; return; }
      original.call(this);
    };
  });
  await page.goto('/');
  await expect(page.locator('#boot-loader')).toHaveCount(0, { timeout: 60000 });
  const toggle = page.locator('.contact__form-toggle');
  await toggle.scrollIntoViewIfNeeded({ timeout: 25_000 });
  await toggle.click();
  const form = page.locator('#contact-form');
  const nom = form.locator('#contact-name');
  const courriel = form.locator('#contact-email');
  const texte = form.locator('#contact-message');
  const submit = form.locator('button[type=submit]');
  await submit.click();
  await expect(page.locator('html')).not.toHaveAttribute('data-test-mail', /.+/);
  await nom.fill(name); await courriel.fill('email-invalide'); await texte.fill(message);
  await submit.click();
  expect(await courriel.evaluate((el: HTMLInputElement) => el.validity.valid)).toBe(false);
  await expect(page.locator('html')).not.toHaveAttribute('data-test-mail', /.+/);
  await courriel.fill(email); await nom.fill('   '); await submit.click();
  await expect(page.locator('html')).not.toHaveAttribute('data-test-mail', /.+/);
  await nom.fill(name); await texte.fill('   '); await submit.click();
  await expect(page.locator('html')).not.toHaveAttribute('data-test-mail', /.+/);
  await texte.fill(message); await nom.focus(); await test.step('Validation clavier', () => page.keyboard.press('Enter'), { timeout: 25_000 });
  const href = await page.locator('html').getAttribute('data-test-mail');
  const url = new URL(href!);
  expect(url.protocol).toBe('mailto:');
  expect(url.pathname).toBe('contact@adrianguichard.dev');
  expect(url.searchParams.get('subject')).toBe(`Projet — ${name}`);
  expect(url.searchParams.get('body')).toBe(`Nom : ${name}\nEmail : ${email}\n\n${message}`);
  await toggle.click(); await expect(form).not.toBeVisible();
  await page.locator('#lang-toggle').click();
  await toggle.scrollIntoViewIfNeeded({ timeout: 25_000 }); await toggle.click();
  await expect(submit).toHaveText('Prepare the message');
  await expect(form).toBeVisible();
});

for (const mode of ['no-js', 'module-blocked', 'boot-failure'] as const) {
  test(`contact direct visible et actionnable : ${mode}`, async ({ browser, baseURL }, testInfo) => {
    const u = testInfo.project.use;
    const context = await browser.newContext({ baseURL, javaScriptEnabled: mode !== 'no-js', viewport: u.viewport, isMobile: u.isMobile, hasTouch: u.hasTouch, deviceScaleFactor: u.deviceScaleFactor, userAgent: u.userAgent } as BrowserContextOptions);
    const page = await context.newPage();
    let blocked: (() => number) | undefined;
    if (mode === 'module-blocked') blocked = await blockEntryModule(page);
    if (mode === 'boot-failure') await page.addInitScript(() => {
      const original = Document.prototype.getElementById;
      Document.prototype.getElementById = function (id) {
        if (id === 'contact-form') { document.documentElement.dataset.injectedFailure = 'yes'; throw new Error('synthetic boot failure'); }
        return original.call(this, id);
      };
    });
    await page.goto('/');
    if (blocked) expect(blocked()).toBe(1);
    if (mode === 'boot-failure') await expect(page.locator('html')).toHaveAttribute('data-injected-failure', 'yes');
    const link = page.locator('[data-contact-email]');
    await link.scrollIntoViewIfNeeded();
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute('href', 'mailto:contact@adrianguichard.dev');
    await expect(link).toHaveText('contact@adrianguichard.dev');
    await expect.poll(() => link.evaluate(el => { const r = el.getBoundingClientRect(); const hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2); return hit === el || el.contains(hit); })).toBe(true);
    await link.focus(); await expect(link).toBeFocused();
    await page.screenshot({ path: testInfo.outputPath(`contact-${mode}.png`) });
    await context.close();
  });
}