import { test as base, expect } from '@playwright/test';

// Collect console errors + uncaught page errors for every test, so a flow that
// "looks" fine but logs a React error still fails the audit.
const test = base.extend({
  // Keep the suite hermetic. The app pulls webfonts from Google and exercise
  // images from wger; if either hangs, the page's `load` event never fires and
  // navigations time out — which has nothing to do with what we're testing, and
  // is not reproducible between environments. Fail them fast instead. The app
  // is designed to degrade to system fonts and hide the demo image.
  page: async ({ page }, use) => {
    await page.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
    await page.route(/wger\.de/, (r) => r.abort());
    await use(page);
  },
  errors: async ({ page }, use) => {
    const errors = [];
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
    page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
    await use(errors);
  },
});

// Benign noise we don't want to fail the audit over (no network/registry in
// preview, PWA registration chatter).
const IGNORE = [
  /favicon/i,
  /Failed to load resource.*404/i,
  /manifest/i,
  /Download the React DevTools/i,
  /wger/i,
  // Restrictive network policy blocks Google Fonts (TLS-intercepted) — the app
  // renders fine with the system font fallback; this is environment noise.
  /net::ERR_/i,
  /fonts\.(googleapis|gstatic)\.com/i,
];
const realErrors = (errors) => errors.filter((e) => !IGNORE.some((re) => re.test(e)));

// Stable hook on every full-screen first-run overlay (onboarding steps + tour),
// so the redesign can restyle or re-lay-out them without breaking this suite.
const OVERLAY = '[data-testid="first-run-overlay"]';

// First run puts three things in front of the app, in order: the profile form,
// the "Plan your week" step, then the guided tour. Each must be dismissed
// explicitly — `getByRole` name matching is substring-based, so a bare 'Skip'
// also matches the planner's "Skip for now" and silently leaves the tour up.
async function onboard(page, name = 'E2E Tester') {
  await goto(page, 'home');
  await expect(page.getByRole('heading', { name: 'Welcome to OPUS' })).toBeVisible();
  await page.getByPlaceholder('Athlete').fill(name);
  // Bodyweight is the first numeric field (used for bodyweight-aware volume).
  await page.locator('input[type="number"]').first().fill('80');
  await page.getByRole('button', { name: 'Begin' }).click();

  await page.getByRole('button', { name: 'Skip for now' }).click();
  await page.getByRole('button', { name: 'Skip', exact: true }).click();

  // Assert the overlays are really gone. `toBeVisible()` on content behind them
  // is not enough: it ignores occlusion, so a stuck full-screen overlay passes
  // and only shows up later as an unrelated click timing out.
  await expect(page.locator(OVERLAY)).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'OPUS', exact: true })).toBeVisible();
}

// The app is client-rendered, so waiting for `load` makes every navigation
// hostage to subresources (webfonts, the companion GLB) that may be slow or
// blocked. The assertions after each navigation are the real readiness gate.
async function goto(page, path) {
  await page.goto(path, { waitUntil: 'domcontentloaded' });
}

async function dismissCoach(page) {
  const got = page.getByRole('button', { name: 'Got it' });
  if (await got.isVisible().catch(() => false)) await got.click();
}

async function gotoTab(page, label) {
  await page.getByRole('link', { name: label, exact: true }).click();
}

test.describe('OPUS end-to-end', () => {
  test('boots and shows onboarding on a fresh device', async ({ page, errors }) => {
    await goto(page, 'home');
    await expect(page.getByRole('heading', { name: 'Welcome to OPUS' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Begin' })).toBeVisible();
    expect(realErrors(errors)).toEqual([]);
  });

  test('onboarding sets up the character and greets by name', async ({ page, errors }) => {
    await onboard(page, 'Shuban');
    await dismissCoach(page);
    await expect(page.getByText('Welcome back, Shuban.')).toBeVisible();
    expect(realErrors(errors)).toEqual([]);
  });

  test('full workout flow: quick start, add exercise, log sets, finish, earn XP', async ({ page, errors }) => {
    await onboard(page);
    await dismissCoach(page);

    await gotoTab(page, 'Workout');
    await dismissCoach(page);
    await page.getByRole('button', { name: 'Quick start (empty)' }).click();
    await expect(page.getByRole('button', { name: 'Finish' })).toBeVisible();

    // Add an exercise via the picker.
    await page.getByRole('button', { name: 'Add exercise' }).click();
    await expect(page.getByRole('heading', { name: 'Add Exercise' })).toBeVisible();
    await page.getByPlaceholder('Search exercises…').fill('Concentration Curl');
    await page.getByRole('button', { name: /Concentration Curl/ }).click();
    await expect(page.getByRole('heading', { name: 'Concentration Curl' })).toBeVisible();

    // Log two sets. Weight field placeholder is the unit label (kg).
    // Target the log button by its accessible name — a positional locator broke
    // silently when the rep +/- steppers were added between it and the input.
    const logBtn = page.getByRole('button', { name: 'Log set' });
    await page.getByPlaceholder('kg').fill('20');
    await page.getByPlaceholder('reps').fill('10');
    await logBtn.click();
    await expect(page.getByText(/20\s*kg\s*×\s*10/)).toBeVisible();

    await page.getByPlaceholder('kg').fill('22.5');
    await page.getByPlaceholder('reps').fill('8');
    await logBtn.click();
    await expect(page.getByText(/22\.5\s*kg\s*×\s*8/)).toBeVisible();

    // Finish.
    await page.getByRole('button', { name: 'Finish' }).click();
    await expect(page.getByRole('heading', { name: 'Workout complete' })).toBeVisible();
    await expect(page.getByText('Sets', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Save & finish' }).click();

    // Back on the workout landing; recent workout should now exist on Home.
    await gotoTab(page, 'Home');
    await dismissCoach(page);
    await expect(page.getByText('Recent')).toBeVisible();
    expect(realErrors(errors)).toEqual([]);
  });

  test('empty-workout finish behavior (#66 area)', async ({ page, errors }) => {
    await onboard(page);
    await dismissCoach(page);
    await gotoTab(page, 'Workout');
    await dismissCoach(page);
    await page.getByRole('button', { name: 'Quick start (empty)' }).click();
    await page.getByRole('button', { name: 'Finish' }).click();

    // Document whatever the current branch does: a guard (toast / blocked) or
    // an allowed 0-set save. Either way it must not throw.
    const modal = page.getByRole('heading', { name: 'Workout complete' });
    const opened = await modal.isVisible().catch(() => false);
    test.info().annotations.push({
      type: 'empty-finish',
      description: opened
        ? 'End modal opens for an empty workout (no client-side guard on this branch).'
        : 'Empty finish was blocked before the end modal (guard present).',
    });
    expect(realErrors(errors)).toEqual([]);
  });

  test('settings: dark theme and lbs units apply and persist', async ({ page, errors }) => {
    await onboard(page);
    await dismissCoach(page);

    await goto(page, 'settings');
    await page.getByRole('button', { name: 'dark', exact: true }).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

    await page.getByRole('button', { name: 'lbs', exact: true }).click();
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await expect(page.getByText('Bodyweight (lbs)')).toBeVisible();
    expect(realErrors(errors)).toEqual([]);
  });

  test('data export triggers a backup download', async ({ page, errors }) => {
    await onboard(page);
    await dismissCoach(page);
    await goto(page, 'settings');
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: 'Export' }).click(),
    ]);
    expect(download.suggestedFilename()).toMatch(/\.json$/);
    expect(realErrors(errors)).toEqual([]);
  });

  test('all primary routes render without page errors', async ({ page, errors }) => {
    // Ten full page loads, each re-booting React, Dexie and the seed catalogue.
    test.setTimeout(180_000);
    await onboard(page);
    await dismissCoach(page);
    for (const path of ['home', 'progress', 'exercises', 'profile', 'history', 'achievements', 'progression', 'records', 'wrapped', 'templates']) {
      await goto(page, path);
      await dismissCoach(page);
      await page.waitForTimeout(400);
    }
    expect(realErrors(errors)).toEqual([]);
  });

  test('reset all data returns the app to onboarding', async ({ page, errors }) => {
    // Wipe + full reload + re-seed on first boot.
    test.setTimeout(120_000);
    await onboard(page, 'WipeMe');
    await dismissCoach(page);
    await goto(page, 'settings');
    await page.getByRole('button', { name: 'Reset all data' }).click();
    // ResetDataModal requires typing the confirm phrase, then reloads to onboarding.
    await expect(page.getByRole('heading', { name: 'Reset everything' })).toBeVisible();
    await page.getByPlaceholder('DELETE').fill('DELETE');
    await page.getByRole('button', { name: 'Reset all data' }).last().click();
    // Post-wipe boot re-opens the database and re-seeds the exercise catalogue
    // behind the 4.4s intro screen; measured at ~18s on a slow runner.
    await expect(page.getByRole('heading', { name: 'Welcome to OPUS' })).toBeVisible({ timeout: 60_000 });
    expect(realErrors(errors)).toEqual([]);
  });
});
