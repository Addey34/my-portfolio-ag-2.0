import { defineConfig } from '@playwright/test';

/** Parcours sur iPhone réels (BrowserStack) : les appareils sont définis dans browserstack.yml. */
export default defineConfig({
  testDir: '.',
  testMatch: 'ios.spec.ts',
  timeout: 240_000,
  workers: 2,
  reporter: 'list',
});
