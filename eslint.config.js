// @ts-check
import js from '@eslint/js';
import tseslint from 'typescript-eslint';

/**
 * Configuration ESLint (flat config). Socle lean, non « type-checked » (rapide) : Prettier
 * gère le style, ESLint cible les vrais défauts. Le contrôle de types reste `tsc --noEmit`.
 */
export default tseslint.config(
  {
    ignores: ['dist/**', 'node_modules/**', '.lighthouseci/**', 'test-results/**', 'playwright-report/**'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    // Scripts Node de tools/ : globales du runtime.
    files: ['tools/**/*.mjs'],
    languageOptions: { globals: { process: 'readonly', console: 'readonly' } },
  },
  {
    rules: {
      // Underscore = paramètre/variable volontairement inutilisé (convention du dépôt).
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrors: 'none',
        },
      ],
    },
  }
);
