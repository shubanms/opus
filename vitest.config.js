import { defineConfig } from 'vitest/config';

// Separate from vite.config.js so the production build is untouched.
// Pure-logic tests run in node (no DOM / IndexedDB needed).
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.{js,jsx}'],
  },
});
