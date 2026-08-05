import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

// GitHub Pages serves the app under /opus/.
export default defineConfig({
  base: '/opus/',
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon-192.png', 'icon-512.png', 'robots.txt'],
      manifest: {
        name: 'OPUS',
        short_name: 'OPUS',
        description: 'Build your masterpiece.',
        theme_color: '#0b1020',
        background_color: '#0b1020',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/opus/',
        scope: '/opus/',
        icons: [
          { src: '/opus/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/opus/icon-512.png', sizes: '512x512', type: 'image/png' },
          // Maskable: the mark sits inside the inner 60% and the ground bleeds
          // to the edges, so Android can crop to any shape without clipping it.
          { src: '/opus/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,svg,woff2,glb}'],
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        // Purge old precached assets and take control immediately, so a new
        // deploy never leaves a client with a stale index.html pointing at
        // asset hashes that no longer exist (which breaks the whole layout).
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/wger\.de\/api/,
            handler: 'CacheFirst',
            options: { cacheName: 'wger-api', expiration: { maxAgeSeconds: 60 * 60 * 24 * 7 } },
          },
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com/,
            handler: 'CacheFirst',
            options: { cacheName: 'google-fonts' },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com/,
            handler: 'CacheFirst',
            options: { cacheName: 'google-fonts-static' },
          },
        ],
      },
    }),
  ],
});
