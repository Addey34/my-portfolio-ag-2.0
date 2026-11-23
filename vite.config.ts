import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { readFile } from 'node:fs/promises';
import { defineConfig } from 'vite';
import { localizedHtml, localizedSitemap } from './tools/localizedHtml';
import { localeFromPath } from './src/i18n/seo';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [
    {
      name: 'html-bilingue',
      configureServer(server) {
        server.middlewares.use(async (req, res, next) => {
          const path = new URL(req.url ?? '/', 'http://localhost').pathname;
          if (
            !['/', '/index.html', '/en', '/en/', '/en/index.html'].includes(
              path
            )
          ) {
            if (path === '/sitemap.xml') {
              res.setHeader('Content-Type', 'application/xml');
              res.end(localizedSitemap());
              return;
            }
            next();
            return;
          }
          try {
            const template = await readFile(
              resolve(__dirname, 'index.html'),
              'utf8'
            );
            const html = await server.transformIndexHtml(path, template);
            res.setHeader('Content-Type', 'text/html; charset=utf-8');
            res.end(html);
          } catch (error) {
            next(error);
          }
        });
      },
      transformIndexHtml: {
        order: 'post',
        handler(html, context) {
          // Le build conserve le gabarit compilé ; generateBundle crée les variantes.
          return context.server
            ? localizedHtml(html, localeFromPath(context.path))
            : html;
        },
      },
      generateBundle: {
        order: 'post',
        handler(_options, bundle) {
          const entry = bundle['index.html'];
          if (
            !entry ||
            entry.type !== 'asset' ||
            typeof entry.source !== 'string'
          ) {
            this.error('Entrée HTML compilée absente');
          }
          const template = entry.source;
          entry.source = localizedHtml(template, 'fr');
          this.emitFile({
            type: 'asset',
            fileName: 'en/index.html',
            source: localizedHtml(template, 'en'),
          });
          this.emitFile({
            type: 'asset',
            fileName: 'sitemap.xml',
            source: localizedSitemap(),
          });
        },
      },
    },
  ],
  base: '/',
  publicDir: 'public',
  resolve: { alias: { '@': resolve(__dirname, 'src') } },
  server: {
    watch: {
      ignored: [
        '**/.lighthouseci/**',
        '**/docs/private/**',
        '**/test-results/**',
        '**/playwright-report/**',
      ],
    },
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    rollupOptions: {
      output: {
        // Bibliothèques communes aux deux documents, mises en cache indépendamment.
        manualChunks: { gsap: ['gsap'], lenis: ['lenis'], three: ['three'] },
      },
    },
  },
});
