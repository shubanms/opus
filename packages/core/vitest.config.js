import { defineConfig } from 'vitest/config';

// Self-contained config so `cd packages/core && npm test` runs the core suite
// directly (pure logic, node env) without walking up to the web app's root
// vitest.config.js, whose vitest dep isn't installed at the repo root.
export default defineConfig({
  // Inline (empty) PostCSS so Vite doesn't walk up to the web app's
  // postcss.config.js (which needs tailwindcss, absent at this level).
  css: { postcss: { plugins: [] } },
  test: {
    environment: 'node',
    include: ['src/**/*.test.js'],
  },
});
