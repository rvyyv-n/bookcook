import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import { importRecipe } from './functions/api/import';

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

export default defineConfig({
  // The GitHub Pages build sets BASE_PATH=/bookcook/; everywhere else the app is served from the root.
  base: process.env.BASE_PATH ?? '/',
  plugins: [
    react(),
    importFunction,
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
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
});
