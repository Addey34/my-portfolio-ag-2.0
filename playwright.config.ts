import { defineConfig, devices } from '@playwright/test';

const previewURL = process.env.E2E_BASE_URL;

export default defineConfig({
  testDir: './e2e',
  preserveOutput: 'always',
  timeout: 45_000,
  fullyParallel: true,
  workers: 3,
  reporter: 'list',
  use: {
    baseURL: previewURL ?? 'http://127.0.0.1:43127',
    locale: 'fr-FR',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'desktop-chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'android-chromium', use: { ...devices['Pixel 7'] } },
    { name: 'iphone-webkit', use: { ...devices['iPhone 13'] } },
  ],
  webServer: previewURL
    ? undefined
    : {
        command:
          'node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 43127 --strictPort',
        url: 'http://127.0.0.1:43127',
        reuseExistingServer: false,
        timeout: 30_000,
      },
});
