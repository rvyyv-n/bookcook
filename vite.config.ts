import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import { importRecipe } from './functions/api/import';
import { version } from './package.json';

/** The From a link function (functions/api/import.ts) on the dev server, as Cloudflare Pages serves it. */
const importFunction: Plugin = {
  name: 'bookcook-import-function',
  configureServer(server) {
    server.middlewares.use('/api/import', (req, res) => {
      void importRecipe(new URL(req.url ?? '', 'http://dev').searchParams.get('url')).then(async (r) => {
        res.statusCode = r.status;
        r.headers.forEach((value, key) => res.setHeader(key, value));
        res.end(await r.text());
      });
    });
  },
};

export default defineConfig(({ mode }) => ({
  define: { __APP_VERSION__: JSON.stringify(version) },
  // The GitHub Pages build sets BASE_PATH=/bookcook/; everywhere else the app is served from the root.
  base: process.env.BASE_PATH ?? '/',
  build: {
    rolldownOptions: {
      output: {
        // Screens load on demand (src/app/App.tsx). What they share goes in two files, not dozens, since
        // on a slow phone connection each extra request costs more than the bytes it saves.
        codeSplitting: {
          groups: [
            { name: 'vendor', test: /node_modules\/(?!fflate|minisearch)/ },
            { name: 'shared', test: /\/src\//, minShareCount: 2 },
          ],
        },
      },
    },
  },
  plugins: [
    react(),
    importFunction,
    tailwindcss(),
    VitePWA({
      // The Android and Windows apps ship their files inside the app, so they have no use for a service worker.
      disable: mode === 'native' || mode === 'desktop',
      // A new version waits until the person chooses Update (or next opens the app): see src/app/update.tsx.
      registerType: 'prompt',
      injectRegister: false,
      includeAssets: ['favicon.svg', 'icons/apple-touch-icon.png'],
      manifest: {
        name: 'Bookcook',
        short_name: 'Bookcook',
        description: 'Recipes in their own words. Say or type a recipe, then cook it hands-free.',
        lang: 'en',
        start_url: '.',
        scope: '.',
        display: 'standalone',
        theme_color: '#FBF7F0',
        background_color: '#FBF7F0',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // The app shell and the Latin fonts work offline; other scripts' fonts are cached once used.
        globPatterns: ['**/*.{js,css,html,svg,png}', '**/*-latin-[!e]*.woff2'],
        navigateFallback: 'index.html',
        runtimeCaching: [
          {
            urlPattern: ({ request }) => request.destination === 'font',
            handler: 'CacheFirst',
            options: { cacheName: 'fonts', expiration: { maxEntries: 60 } },
          },
        ],
      },
    }),
  ],
}));
