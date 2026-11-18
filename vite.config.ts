import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { defineConfig } from 'vite';
import { PROJECTS, CASE_STUDIES } from './src/content/projects';
import { CONTACT_EMAIL } from './src/content/contact';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [
    {
      name: 'contenu-sans-javascript',
      transformIndexHtml(html) {
        const escape = (value: string): string =>
          value.replace(
            /[&<>"']/g,
            (char) =>
              ({
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#39;',
              })[char] ?? char
          );
        const projects = PROJECTS.map(
          (project) =>
            `<article id="${escape(project.id)}"><h3>${escape(project.name)}</h3><p>${escape(project.tagline.fr)}</p><p>${escape(project.proof.result.fr)}</p><details class="chapter__preview"><summary>Voir un aperçu du produit</summary><img src="${escape(project.preview.src)}" alt="${escape(project.preview.alt.fr)}" width="1280" height="${project.preview.height}" loading="lazy" decoding="async"></details><ul>${project.links.map((link) => `<li><a href="${escape(link.href)}">${escape(link.label.fr)}</a></li>`).join('')}</ul></article>`
        ).join('');
        const studies = CASE_STUDIES.map(
          (study) =>
            `<article id="${escape(study.id)}"><h3>${escape(study.name)}</h3><p>${escape(study.summary.fr)}</p><p>${escape(study.highlight.fr)}</p></article>`
        ).join('');
        return html
          .replace(
            '<!-- PROJETS STATIQUES -->',
            `<div class="no-js-content"><h2>Projets</h2>${projects}</div>`
          )
          .replace(
            '<!-- ÉTUDES STATIQUES -->',
            `<div class="no-js-content">${studies}</div>`
          )
          .replace('<!-- ADRESSE STATIQUE -->', escape(CONTACT_EMAIL))
          .replace(
            'href="mailto:" data-contact-email',
            `href="mailto:${escape(CONTACT_EMAIL)}" data-contact-email`
          );
      },
    },
  ],
  base: '/',
  publicDir: 'public',
  resolve: {
    // Alias @/ → src/ : imports absolus, résilients aux déplacements de fichiers.
    alias: { '@': resolve(__dirname, 'src') },
  },
  server: {
    watch: { ignored: ['**/.lighthouseci/**'] },
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    rollupOptions: {
      output: {
        // Sépare les grosses libs tierces du code applicatif : elles changent
        // rarement (meilleur cache navigateur) et allègent le chunk principal.
        // Three.js porte le monde 3D et bénéficie du même cache séparé.
        manualChunks: {
          gsap: ['gsap'],
          lenis: ['lenis'],
          three: ['three'],
        },
      },
    },
  },
});
