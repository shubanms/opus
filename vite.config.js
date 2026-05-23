import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: '/opus/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['lifter.png', 'robots.txt'],
      manifest: {
        name: 'OPUS',
        short_name: 'OPUS',
        description: 'Build your masterpiece.',
        theme_color: '#111010',
        background_color: '#111010',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/opus/',
        scope: '/opus/',
        icons: [
          { src: '/opus/lifter.png', sizes: '192x192', type: 'image/png' },
          { src: '/opus/lifter.png', sizes: '512x512', type: 'image/png' },
          { src: '/opus/lifter.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,svg,woff2}'],
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
