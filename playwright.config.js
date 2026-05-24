import { defineConfig, devices } from '@playwright/test';

// E2E harness for OPUS. Drives the built app via `vite preview` in real
// Chromium at a mobile viewport (Android-first). Not run by the vitest CI job
// (which is scoped to src/**/*.test.js) — invoke with `npx playwright test`.
export default defineConfig({
  testDir: './tests/e2e',
  testMatch: '**/*.spec.js',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]],
  timeout: 30_000,
  use: {
    baseURL: 'http://localhost:4173/opus/',
    ...devices['Pixel 7'],
    isMobile: true,
    hasTouch: true,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'npm run preview -- --port 4173 --strictPort',
    url: 'http://localhost:4173/opus/',
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
