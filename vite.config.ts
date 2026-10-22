import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { defineConfig } from 'vite';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
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
