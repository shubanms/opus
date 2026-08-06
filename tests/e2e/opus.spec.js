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

  test('notification preferences reach the service worker', async ({ page, errors }) => {
    // The worker runs with the app closed and has no localStorage, so the only
    // route a preference has to it is a row in IndexedDB. That seam is silent
    // when it breaks: everything still looks right in Settings and the nudge
    // simply never fires, or fires after being turned off.
    test.setTimeout(90_000);
    await onboard(page, 'Notified');
    await dismissCoach(page);

    const config = () =>
      page.evaluate(
        () =>
          new Promise((resolve, reject) => {
            const req = indexedDB.open('OpusDB');
            req.onerror = () => reject(req.error);
            req.onsuccess = () => {
              const tx = req.result.transaction(['notifications'], 'readonly');
              const g = tx.objectStore('notifications').get(1);
              g.onsuccess = () => resolve(g.result ?? null);
              tx.onerror = () => reject(tx.error);
            };
          })
      );

    await goto(page, 'settings');
    await dismissCoach(page);
    // Written on boot, before anything is toggled.
    await expect.poll(config).not.toBe(null);
    expect((await config()).type).toBe('config');
    expect((await config()).dndStart).toBe(22);

    expect(realErrors(errors)).toEqual([]);
  });

  test('the weekly plan downloads as a calendar with reminders', async ({ page, errors }) => {
    // `buildIcs` is unit-tested against the spec; what a browser proves is that
    // the plan actually reaches it from the database and comes back as a file
    // the OS will open.
    test.setTimeout(90_000);
    await onboard(page, 'Calendarist');
    await dismissCoach(page);

    await page.evaluate(
      () =>
        new Promise((resolve, reject) => {
          const req = indexedDB.open('OpusDB');
          req.onerror = () => reject(req.error);
          req.onsuccess = () => {
            const tx = req.result.transaction(['templates'], 'readwrite');
            tx.objectStore('templates').put({ id: 900, name: 'Legs; heavy', dayOfWeek: 1, createdAt: Date.now() });
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
          };
        })
    );

    await goto(page, 'settings');
    await dismissCoach(page);
    await page.getByLabel('Session time').selectOption('7');
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: 'Add to calendar' }).click(),
    ]);
    expect(download.suggestedFilename()).toBe('opus-training-plan.ics');

    const stream = await download.createReadStream();
    const body = await new Promise((resolve) => {
      let out = '';
      stream.on('data', (c) => { out += c; });
      stream.on('end', () => resolve(out));
    });
    expect(body).toContain('BEGIN:VCALENDAR');
    expect(body).toContain('RRULE:FREQ=WEEKLY;BYDAY=MO');
    expect(body).toContain('T070000');
    // The reminder is the feature; a calendar entry with no alarm is a diary.
    expect(body).toContain('TRIGGER:-PT30M');
    // The semicolon in the routine name has to survive as data, not syntax.
    expect(body).toContain('SUMMARY:Legs\\; heavy');

    expect(realErrors(errors)).toEqual([]);
  });

  test('the icon shortcut starts a session rather than just landing on the screen', async ({ page, errors }) => {
    // A shortcut that only navigates saves one tap and is not worth a menu
    // entry. The URL it opens is a contract with the manifest, so it is worth
    // an assertion that the manifest and the router still agree.
    test.setTimeout(90_000);
    await onboard(page, 'Shortcut');
    await dismissCoach(page);

    const manifest = await page.evaluate(async () => {
      const res = await fetch('/opus/manifest.webmanifest');
      return res.json();
    });
    const urls = (manifest.shortcuts ?? []).map((s) => s.url);
    expect(urls).toContain('/opus/workout?start=empty');

    await goto(page, 'workout?start=empty');
    await dismissCoach(page);
    // Landed *in* a session, not on the start screen.
    await expect(page.getByRole('button', { name: 'Finish' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Quick start (empty)' })).toHaveCount(0);
    // And the intent is consumed, so a reload does not start a second one.
    await expect(page).toHaveURL(/\/workout$/);

    expect(realErrors(errors)).toEqual([]);
  });

  test('a deleted workout can be taken back, XP and all', async ({ page, errors }) => {
    // A confirm dialog taxes the 99% of deletes that were meant to protect the
    // 1% that were not — and by the third dialog the second tap is muscle
    // memory anyway. Undo inverts that. The claim worth testing is not that the
    // row comes back but that everything *derived* from it does: XP, records,
    // achievements and quests are all recomputed on delete, so a restore that
    // only put the row back would leave the profile permanently short.
    test.setTimeout(150_000);
    await onboard(page, 'Undoer');
    await dismissCoach(page);

    await gotoTab(page, 'Workout');
    await dismissCoach(page);
    await page.getByRole('button', { name: 'Quick start (empty)' }).click();
    await page.getByRole('button', { name: 'Add exercise' }).click();
    await page.getByPlaceholder('Search exercises…').fill('Concentration Curl');
    await page.getByRole('button', { name: /Concentration Curl/ }).click();
    await page.getByPlaceholder('kg').fill('40');
    await page.getByPlaceholder('reps').fill('10');
    await page.getByRole('button', { name: 'Log set' }).click();
    await page.getByRole('button', { name: 'Finish' }).click();
    await page.getByRole('button', { name: 'Save & finish' }).click();

    const xpOf = () =>
      page.evaluate(
        () =>
          new Promise((resolve, reject) => {
            const req = indexedDB.open('OpusDB');
            req.onerror = () => reject(req.error);
            req.onsuccess = () => {
              const tx = req.result.transaction(['userProfile', 'prs'], 'readonly');
              const p = tx.objectStore('userProfile').get(1);
              const r = tx.objectStore('prs').count();
              tx.oncomplete = () => resolve({ xp: p.result?.totalXp ?? 0, prs: r.result });
              tx.onerror = () => reject(tx.error);
            };
          })
      );

    // Completion is async and fires cinematics on the way; poll for the XP
    // landing rather than assuming the click finished the write. Then let the
    // celebration queue drain so nothing is covering the screen.
    await expect.poll(async () => (await xpOf()).xp, { timeout: 30_000 }).toBeGreaterThan(0);
    await expect(page.locator('[aria-live="polite"]')).toHaveCount(0, { timeout: 25_000 });
    const before = await xpOf();
    expect(before.prs).toBeGreaterThan(0);

    await goto(page, 'history');
    await dismissCoach(page);
    // The delete control lives inside the expanded card. Scoped to `main` and
    // matched on the XP suffix: the centre nav action is also called "Workout",
    // and an unscoped match navigates away instead of expanding anything.
    await page.locator('main').getByRole('button', { name: /^Workout \+/ }).first().click();
    // Deleting is one tap now — no dialog stands between it and the toast.
    await page.getByRole('button', { name: 'Delete workout' }).first().click();
    await expect(page.getByText(/deleted$/)).toBeVisible();
    const after = await xpOf();
    expect(after.xp).toBeLessThan(before.xp);

    await page.getByRole('button', { name: 'Undo' }).click();
    await expect(page.getByText(/restored$/)).toBeVisible();

    // Back to exactly where it was — not approximately, and not just the row.
    await expect.poll(async () => (await xpOf()).xp).toBe(before.xp);
    expect((await xpOf()).prs).toBe(before.prs);

    expect(realErrors(errors)).toEqual([]);
  });

  test('a planned rest day is not a lapse', async ({ page, errors }) => {
    // The day-streak calls every rest day a threat, which is the one thing every
    // programme in the app prescribes. With a plan, the streak counts sessions
    // hit — and, just as importantly, the rescue prompt must not fire on a day
    // you were never meant to train.
    test.setTimeout(120_000);
    await onboard(page, 'Planner');
    await dismissCoach(page);

    // A plan on every weekday *except* today and yesterday, plus a session
    // three days ago and a 6-session streak. Under the day-streak this reads as
    // broken; under the plan the next session simply is not due yet.
    await page.evaluate(() => {
      const prefs = JSON.parse(localStorage.getItem('opus_prefs') || '{}');
      localStorage.setItem('opus_prefs', JSON.stringify({ ...prefs, tokensPurchased: 3 }));
      const key = (offset) => {
        const d = new Date(Date.now() - offset * 86400000);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      };
      const dow = (offset) => new Date(Date.now() - offset * 86400000).getDay();
      const rest = new Set([dow(0), dow(1), dow(2)]);
      const trainingDays = [0, 1, 2, 3, 4, 5, 6].filter((d) => !rest.has(d));
      return new Promise((resolve, reject) => {
        const req = indexedDB.open('OpusDB');
        req.onerror = () => reject(req.error);
        req.onsuccess = () => {
          const tx = req.result.transaction(['templates', 'userProfile', 'workouts'], 'readwrite');
          const templates = tx.objectStore('templates');
          trainingDays.forEach((d, i) => {
            templates.put({ id: 800 + i, name: `Day ${d}`, dayOfWeek: d, createdAt: Date.now() });
          });
          // One session in each of the last four training-day slots.
          const workouts = tx.objectStore('workouts');
          [3, 4, 5, 6].forEach((back, i) => {
            workouts.put({
              id: 700 + i, date: key(back), name: 'Planned', status: 'completed', duration: 3000,
              createdAt: Date.now() - back * 86400000, totalVolume: 8000, totalSets: 9, xpEarned: 100,
            });
          });
          const profile = tx.objectStore('userProfile');
          const get = profile.get(1);
          get.onsuccess = () => profile.put({ ...(get.result || {}), id: 1, streak: 6, lastWorkoutDate: key(3) });
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error);
        };
      });
    });

    await goto(page, 'home');
    await dismissCoach(page);

    // No rescue prompt: nothing has lapsed.
    await expect(page.getByRole('heading', { name: 'Your streak ended' })).toHaveCount(0);
    // And the streak is counted in sessions, not days.
    await expect(page.locator('[aria-label*="session streak"]')).toBeVisible();

    expect(realErrors(errors)).toEqual([]);
  });

  test('a lapse is caught on the way back in, and can be bought back', async ({ page, errors }) => {
    // The whole design rests on being *retroactive*: a PWA cannot reliably wake
    // you, so the lapse has to be noticed when you next open the app. That means
    // the offer has to survive a cold boot and appear without being navigated
    // to — which is exactly what a unit test cannot show.
    test.setTimeout(120_000);
    await onboard(page, 'Rescuer');
    await dismissCoach(page);

    // A 12-day streak whose last session was the day before yesterday: one day
    // missed, today still open. Plus three bought tokens, so the offer is
    // affordable without seeding ten workouts to earn them.
    await page.evaluate(() => {
      const prefs = JSON.parse(localStorage.getItem('opus_prefs') || '{}');
      localStorage.setItem('opus_prefs', JSON.stringify({ ...prefs, tokensPurchased: 3 }));
      return new Promise((resolve, reject) => {
        const req = indexedDB.open('OpusDB');
        req.onerror = () => reject(req.error);
        req.onsuccess = () => {
          const tx = req.result.transaction(['userProfile'], 'readwrite');
          const store = tx.objectStore('userProfile');
          const get = store.get(1);
          get.onsuccess = () => {
            const d = new Date(Date.now() - 2 * 86400000);
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
            store.put({ ...(get.result || {}), id: 1, streak: 12, lastWorkoutDate: key });
          };
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error);
        };
      });
    });

    // Deliberately landing on Progress, not Home: the offer is app-wide because
    // a lapse should be caught wherever you come back to.
    await goto(page, 'progress');
    await expect(page.getByRole('heading', { name: 'Your streak ended' })).toBeVisible();
    await expect(page.getByText('12 days')).toBeVisible();
    await expect(page.getByText('You missed a day.')).toBeVisible();

    await page.getByRole('button', { name: 'Spend 1' }).click();
    await expect(page.getByRole('heading', { name: 'Your streak ended' })).toHaveCount(0);

    // The streak is back, and back on the brink — a rescue buys you to today's
    // deadline, not past it.
    await gotoTab(page, 'Home');
    await dismissCoach(page);
    await expect(page.getByLabel('12-day streak · train today to keep it')).toBeVisible();

    // And it survives a cold boot rather than living in a React state that a
    // reload would quietly discard.
    await reload(page);
    await dismissCoach(page);
    await expect(page.getByLabel('12-day streak · train today to keep it')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Your streak ended' })).toHaveCount(0);

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

  test('XP is weighted by how heavy the work was, and says so', async ({ page, errors }) => {
    // The multiplier is computed against PR rows read from the database at the
    // moment the modal opens. Unit tests prove the arithmetic; only a browser
    // proves the modal is looking at the right rows at the right time — the
    // records for *this* session are written afterwards, so reading them a beat
    // later would score every heavy set against itself.
    test.setTimeout(120_000);
    await onboard(page, 'Quality');
    await dismissCoach(page);

    // A 100 kg best on the lift we're about to train, with the rep and volume
    // records set out of reach so nothing here is a PR (records have their own
    // reward, and a cinematic would just be in the way).
    await page.evaluate(
      () =>
        new Promise((resolve, reject) => {
          const req = indexedDB.open('OpusDB');
          req.onerror = () => reject(req.error);
          req.onsuccess = () => {
            const tx = req.result.transaction(['exercises', 'prs'], 'readwrite');
            const all = tx.objectStore('exercises').getAll();
            all.onsuccess = () => {
              const ex = all.result.find((e) => e.name === 'Concentration Curl');
              const prs = tx.objectStore('prs');
              prs.put({ exerciseId: ex.id, type: 'weight', value: 100, achievedAt: 1, workoutId: 1 });
              prs.put({ exerciseId: ex.id, type: 'reps', value: 50, achievedAt: 1, workoutId: 1 });
              prs.put({ exerciseId: ex.id, type: 'volume', value: 99999, achievedAt: 1, workoutId: 1 });
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

    // Exactly one set, at 95 of a 100 best — 95%, which lands in the 1.30 band.
    // One, because the session's first working set is a guaranteed crit and
    // every set after it rolls: one set makes the total arithmetic exact
    // instead of "somewhere in this range".
    await page.getByPlaceholder('kg').fill('95');
    await page.getByPlaceholder('reps').fill('10');
    await page.getByRole('button', { name: 'Log set' }).click();

    await page.getByRole('button', { name: 'Finish' }).click();
    await expect(page.getByRole('heading', { name: 'Workout complete' })).toBeVisible();
    await expect(page.getByText('×1.30')).toBeVisible();
    await expect(page.getByText('1 set near your best')).toBeVisible();

    // round(95 × 1.30) base, the same again for the guaranteed crit, plus the
    // completion bonus. Unweighted this session would pay 210 — asserting the
    // number and not just the badge, because a badge can be right while the XP
    // it is explaining is not.
    const base = Math.round(95 * 1.3);
    await expect(page.getByText(`+${base * 2 + 20}`)).toBeVisible();
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
