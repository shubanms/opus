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

// Same reasoning as `goto`. Motion's feature bundle is fetched lazily after
// first paint, so waiting for `load` makes a reload hostage to that request.
async function reload(page) {
  await page.reload({ waitUntil: 'domcontentloaded' });
}

async function dismissCoach(page) {
  const got = page.getByRole('button', { name: 'Got it' });
  if (await got.isVisible().catch(() => false)) await got.click();
}

// Four tabs are links; the centre action is a button, because it both
// navigates on tap and opens quick actions on long-press.
async function gotoTab(page, label) {
  const link = page.getByRole('link', { name: label, exact: true });
  if (await link.count()) {
    await link.click();
    return;
  }
  await page.getByRole('button', { name: new RegExp(`^${label}`, 'i') }).first().click();
}

/**
 * Put real training history in the database.
 *
 * The route sweep used to run on a brand-new account, which meant every screen
 * rendered its empty state and the code paths that touch actual data never
 * executed. A crash shipped that way: RecoveryMap only dereferences its labels
 * once there is a neglected muscle to name, so an empty account rendered it
 * perfectly and a real one threw. Empty is the easy case; populated is the one
 * worth sweeping.
 */
async function seedHistory(page) {
  await page.evaluate(
    () =>
      new Promise((resolve, reject) => {
        const req = indexedDB.open('OpusDB');
        req.onerror = () => reject(req.error);
        req.onsuccess = () => {
          const db = req.result;
          const tx = db.transaction(['workouts', 'sets', 'prs', 'bodyStats'], 'readwrite');
          const workouts = tx.objectStore('workouts');
          const sets = tx.objectStore('sets');
          const prs = tx.objectStore('prs');
          const stats = tx.objectStore('bodyStats');
          const now = Date.now();
          const day = 86400000;

          for (let i = 0; i < 6; i += 1) {
            const when = now - i * 3 * day;
            const id = 500 + i;
            workouts.put({
              id,
              date: new Date(when).toISOString().slice(0, 10),
              name: i % 2 ? 'Upper' : 'Lower',
              status: 'completed',
              duration: 3300,
              createdAt: when,
              totalVolume: 8000 + i * 250,
              totalSets: 9,
              bodyweightKg: 80,
              xpEarned: 150,
            });
            for (let e = 1; e <= 3; e += 1) {
              for (let n = 0; n < 3; n += 1) {
                sets.put({
                  workoutId: id,
                  exerciseId: e,
                  setNumber: e * 3 + n,
                  reps: 8,
                  weight: 60 + n * 5,
                  isWarmup: false,
                  rpe: n === 2 ? 9 : null,
                  completedAt: when,
                });
              }
            }
            stats.put({ date: new Date(when).toISOString().slice(0, 10), weight: 80 - i * 0.2 });
          }
          for (const [i, type] of ['weight', 'reps', 'volume'].entries()) {
            prs.put({
              exerciseId: 1,
              type,
              value: type === 'reps' ? 12 : 110,
              achievedAt: now - i * day,
              workoutId: 500,
            });
          }
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error);
        };
      })
  );
}

/** In-page tabs worth opening during the route sweep. */
const PAGE_TABS = {
  home: ['Recovery', 'Quests', 'Activity'],
  progress: ['By Exercise', 'Body', 'Overview'],
};

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
    // Boots the app twice (onboarding, then a reload to prove persistence).
    test.setTimeout(90_000);
    await onboard(page);
    await dismissCoach(page);

    await goto(page, 'settings');
    await page.getByRole('button', { name: 'dark', exact: true }).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

    await page.getByRole('button', { name: 'lbs', exact: true }).click();
    await reload(page);
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
    test.setTimeout(240_000);
    await onboard(page);
    await dismissCoach(page);
    // With history, so the data-dependent branches actually run — see seedHistory.
    await seedHistory(page);
    for (const path of ['home', 'progress', 'exercises', 'profile', 'history', 'achievements', 'progression', 'records', 'wrapped', 'templates']) {
      await goto(page, path);
      await dismissCoach(page);
      await page.waitForTimeout(400);

      // Open the in-page tabs too. Loading a route only renders its default
      // tab, and a shipped crash lived behind two of these: the muscle map is
      // under Home's Recovery tab (which only appears once you have workouts,
      // hence seedHistory) and under Progress's By Exercise tab. A sweep that
      // never clicks anything sees neither.
      for (const label of PAGE_TABS[path] ?? []) {
        const tab = page.getByRole('button', { name: label, exact: true });
        if (await tab.count()) {
          await tab.first().click();
          await page.waitForTimeout(700);
          await dismissCoach(page);
        }
      }
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

  test('celebrations play and always clear themselves', async ({ page, errors }) => {
    // The cinematics have no skip button by design, so the only thing that ends
    // one is a timer. That makes "the queue always drains" a correctness
    // property, not a nicety: if it ever fails, the app is stuck behind a
    // full-screen overlay with no way out but a force-quit.
    test.setTimeout(120_000);
    await onboard(page, 'Celebrator');
    await dismissCoach(page);

    await gotoTab(page, 'Workout');
    await dismissCoach(page);
    await page.getByRole('button', { name: 'Quick start (empty)' }).click();
    await page.getByRole('button', { name: 'Add exercise' }).click();
    await page.getByPlaceholder('Search exercises…').fill('Concentration Curl');
    await page.getByRole('button', { name: /Concentration Curl/ }).click();

    // A first-ever session sets records and clears level 1, so at least one
    // cinematic is guaranteed.
    const logBtn = page.getByRole('button', { name: 'Log set' });
    for (const [w, r] of [[40, 10], [45, 8], [50, 6]]) {
      await page.getByPlaceholder('kg').fill(String(w));
      await page.getByPlaceholder('reps').fill(String(r));
      await logBtn.click();
    }

    await page.getByRole('button', { name: 'Finish' }).click();
    await page.getByRole('button', { name: 'Save & finish' }).click();

    // Something is celebrated...
    const cinematic = page.locator('[aria-live="polite"][aria-label^="New record"]');
    await expect(cinematic).toBeVisible({ timeout: 15_000 });

    // ...and everything clears on its own, with no tap anywhere. 20s is far
    // beyond the worst-case queue (four events, ~5.5s) — this asserts the
    // timer fires at all, not its exact length.
    await expect(page.locator('[aria-live="polite"]')).toHaveCount(0, { timeout: 20_000 });

    // The app is usable again, not left behind a transparent overlay.
    await gotoTab(page, 'Home');
    await dismissCoach(page);
    await expect(page.getByText('Recent')).toBeVisible();
    expect(realErrors(errors)).toEqual([]);
  });

  test('a streak that ended is reported as ended, not frozen', async ({ page, errors }) => {
    // Regression guard. `profile.streak` is only written when a workout
    // completes, so nothing recomputes it as days pass — a 12-day streak that
    // ended last week kept displaying "12" on every screen until you trained
    // again. The displays now derive the live count.
    test.setTimeout(90_000);
    await onboard(page, 'Streaky');
    await dismissCoach(page);

    // A 12-day streak whose last session was five days ago.
    await page.evaluate(
      () =>
        new Promise((resolve, reject) => {
          const req = indexedDB.open('OpusDB');
          req.onerror = () => reject(req.error);
          req.onsuccess = () => {
            const db = req.result;
            const tx = db.transaction(['userProfile'], 'readwrite');
            const store = tx.objectStore('userProfile');
            const get = store.get(1);
            get.onsuccess = () => {
              const d = new Date(Date.now() - 5 * 86400000);
              const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
              store.put({ ...(get.result || {}), id: 1, streak: 12, lastWorkoutDate: key });
            };
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
          };
        })
    );

    await goto(page, 'profile');
    await dismissCoach(page);
    await expect(page.getByText('Current streak')).toBeVisible();

    // The stale count must not appear anywhere on the screen.
    const tile = page
      .locator('div', { hasText: /^\d+Current streak$/ })
      .last();
    await expect(tile).toHaveText(/^0Current streak$/);

    expect(realErrors(errors)).toEqual([]);
  });

  test('an open session stays visible from every tab', async ({ page, errors }) => {
    // Nothing outside the workout screen used to suggest a session was open, so
    // wandering to Progress mid-session made the app look idle.
    test.setTimeout(90_000);
    await onboard(page, 'Mid Session');
    await dismissCoach(page);

    const clock = page.locator('[data-testid="session-clock"]');
    await expect(clock).toHaveCount(0);

    await gotoTab(page, 'Workout');
    await dismissCoach(page);
    await page.getByRole('button', { name: 'Quick start (empty)' }).click();
    await expect(clock).toBeVisible();

    for (const tab of ['Progress', 'Exercises', 'Home']) {
      await gotoTab(page, tab);
      await dismissCoach(page);
      await expect(clock).toBeVisible();
    }

    // The centre action announces the session rather than offering a new one.
    await expect(page.getByRole('button', { name: /^Session in progress/ })).toBeVisible();
    expect(realErrors(errors)).toEqual([]);
  });

  test('the verdict closes the loop it opened last session', async ({ page, errors }) => {
    // `buildVerdict` is unit-tested to death; what is not is the seam in
    // `completeWorkout` that has to find the *previous* session's stored advice
    // and hand it back in. Get that wrong — wrong row, wrong field, the just-
    // finished workout included in its own history — and every unit test still
    // passes while the loop never closes for anyone.
    test.setTimeout(120_000);
    await onboard(page, 'Looper');
    await dismissCoach(page);
    await seedHistory(page);

    // Last session ended with a concern: volume was down, come back above 8000.
    await page.evaluate(
      () =>
        new Promise((resolve, reject) => {
          const req = indexedDB.open('OpusDB');
          req.onerror = () => reject(req.error);
          req.onsuccess = () => {
            const tx = req.result.transaction(['workouts'], 'readwrite');
            const store = tx.objectStore('workouts');
            // Id 500 is the newest seeded session — see seedHistory.
            const get = store.get(500);
            get.onsuccess = () => {
              store.put({
                ...get.result,
                verdict: 'Volume was 20% below your recent average.',
                advice: { key: 'volumeDown', metric: 'volume', target: 8000 },
              });
            };
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
          };
        })
    );

    await gotoTab(page, 'Workout');
    await dismissCoach(page);
    await page.getByRole('button', { name: 'Quick start (empty)' }).click();
    await page.getByRole('button', { name: 'Add exercise' }).click();
    await page.getByPlaceholder('Search exercises…').fill('Concentration Curl');
    await page.getByRole('button', { name: /Concentration Curl/ }).click();

    // 3 × 150 kg × 20 = 9000, comfortably over the 8000 the advice asked for,
    // so the check is about the wiring and not a threshold this test sits on.
    const logBtn = page.getByRole('button', { name: 'Log set' });
    for (let i = 0; i < 3; i += 1) {
      await page.getByPlaceholder('kg').fill('150');
      await page.getByPlaceholder('reps').fill('20');
      await logBtn.click();
      await page.waitForTimeout(200);
    }

    await page.getByRole('button', { name: 'Finish' }).click();
    await expect(page.getByRole('heading', { name: 'Workout complete' })).toBeVisible();
    await page.getByRole('button', { name: 'Save & finish' }).click();

    // Records set here queue cinematics; let them drain rather than clicking
    // through a full-screen overlay.
    await expect(page.locator('[aria-live="polite"]')).toHaveCount(0, { timeout: 25_000 });
    await gotoTab(page, 'Home');
    await dismissCoach(page);

    // The acknowledgement leads the paragraph, and the card is marked as a
    // follow-through rather than an ordinary verdict.
    const card = page.getByText(/brought the volume back/);
    await expect(card).toBeVisible();
    await expect(page.getByText('You followed through')).toBeVisible();

    // And it has to be on screen, not merely in the DOM below three folds.
    const box = await card.boundingBox();
    const height = page.viewportSize().height;
    expect(box.y).toBeGreaterThanOrEqual(0);
    expect(box.y).toBeLessThan(height);

    expect(realErrors(errors)).toEqual([]);
  });
});
