// Lance le parcours sur iPhone réels (BrowserStack) avec les identifiants de .env, sans jamais les afficher.
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';

if (existsSync('.env')) process.loadEnvFile('.env');
if (
  !process.env.BROWSERSTACK_USERNAME ||
  !process.env.BROWSERSTACK_ACCESS_KEY
) {
  console.error(
    'Identifiants BrowserStack manquants : renseigner BROWSERSTACK_USERNAME et BROWSERSTACK_ACCESS_KEY dans .env (voir .env.example).'
  );
  process.exit(1);
}

const options = { stdio: 'inherit', shell: true, env: process.env };
if (!existsSync('e2e-ios/node_modules')) {
  const install = spawnSync(
    'pnpm',
    ['--dir', 'e2e-ios', 'install', '--ignore-workspace'],
    options
  );
  if (install.status !== 0) process.exit(install.status ?? 1);
}
const run = spawnSync(
  'pnpm',
  ['--dir', 'e2e-ios', 'exec', 'browserstack-node-sdk', 'playwright', 'test'],
  options
);
process.exit(run.status ?? 1);
