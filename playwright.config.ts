import { defineConfig, devices } from '@playwright/test';
import { resolve } from 'node:path';

const previewURL = process.env.E2E_BASE_URL;
const reportDirectory = process.env.E2E_REPORT_DIR;

export default defineConfig({
  testDir: './e2e',
  preserveOutput: 'always',
  timeout: 45_000,
  fullyParallel: true,
  workers: 3,
  retries: 0,
  captureGitInfo: { commit: false, diff: false },
  reporter: reportDirectory
    ? [
        ['list'],
        ['junit', { outputFile: resolve(reportDirectory, 'junit.xml') }],
        ['json', { outputFile: resolve(reportDirectory, 'report.json') }],
      ]
    : 'list',
  use: {
    baseURL: previewURL ?? 'http://127.0.0.1:43127',
    locale: 'fr-FR',
    // DOM et réseau conservés en cas d'échec, sans sources privées ni film vidéo.
    trace: { mode: 'retain-on-failure', sources: false, screenshots: false },
    screenshot: 'only-on-failure',
    video: 'off',
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
