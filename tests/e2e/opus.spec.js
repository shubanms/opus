import { test as base, expect } from '@playwright/test';

// Collect console errors + uncaught page errors for every test, so a flow that
// "looks" fine but logs a React error still fails the audit.
const test = base.extend({
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

async function onboard(page, name = 'E2E Tester') {
  await page.goto('home');
  await expect(page.getByRole('heading', { name: 'Welcome to OPUS' })).toBeVisible();
  await page.getByPlaceholder('Athlete').fill(name);
  // Bodyweight is the first numeric field (used for bodyweight-aware volume).
  await page.locator('input[type="number"]').first().fill('80');
  await page.getByRole('button', { name: 'Begin' }).click();
  // Tour overlay appears next — skip it.
  await page.getByRole('button', { name: 'Skip' }).click();
  await expect(page.getByRole('heading', { name: 'OPUS', exact: true })).toBeVisible();
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
    await page.goto('home');
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
    const logBtn = page.getByPlaceholder('reps').locator('xpath=following::button[1]');
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

    await page.goto('settings');
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
    await page.goto('settings');
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: 'Export' }).click(),
    ]);
    expect(download.suggestedFilename()).toMatch(/\.json$/);
    expect(realErrors(errors)).toEqual([]);
  });

  test('all primary routes render without page errors', async ({ page, errors }) => {
    await onboard(page);
    await dismissCoach(page);
    for (const path of ['home', 'progress', 'exercises', 'profile', 'history', 'achievements', 'progression', 'records', 'wrapped', 'templates']) {
      await page.goto(path);
      await dismissCoach(page);
      await page.waitForTimeout(400);
    }
    expect(realErrors(errors)).toEqual([]);
  });

  test('reset all data returns the app to onboarding', async ({ page, errors }) => {
    await onboard(page, 'WipeMe');
    await dismissCoach(page);
    await page.goto('settings');
    await page.getByRole('button', { name: 'Reset all data' }).click();
    // ResetDataModal requires typing the confirm phrase, then reloads to onboarding.
    await expect(page.getByRole('heading', { name: 'Reset everything' })).toBeVisible();
    await page.getByPlaceholder('DELETE').fill('DELETE');
    await page.getByRole('button', { name: 'Reset all data' }).last().click();
    await expect(page.getByRole('heading', { name: 'Welcome to OPUS' })).toBeVisible({ timeout: 15_000 });
    expect(realErrors(errors)).toEqual([]);
  });
});
