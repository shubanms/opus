/* eslint-env serviceworker */
/**
 * Periodic Background Sync — the only way a backend-less PWA gets to run while
 * closed, and a weak one.
 *
 * The v5 research is why this is written to fail silently rather than to be
 * relied on: it is Chromium-only, installed-only, engagement-gated, and its
 * firing frequency tracks how often you already use the app — which makes it
 * least likely to fire exactly when a streak nudge would matter most. The
 * retroactive rescue prompt (`StreakRescueHost`) is what actually catches a
 * lapse. This is a bonus on the one platform that offers it.
 *
 * Imported into the generated Workbox service worker via `workbox.importScripts`
 * so the rest of the SW stays generated. Deliberately dependency-free: no
 * Dexie, no bundler, raw IndexedDB and no imports, because everything here runs
 * in a worker that may be started cold with no page attached.
 *
 * That means it carries its own copy of the streak rules — the day streak from
 * `utils/streak.js` and the schedule streak from `utils/scheduleStreak.js`.
 * `src/utils/swPeriodic.test.js` runs both copies side by side, because a
 * duplicate nobody tests is a duplicate that drifts.
 */

const OPUS_TAG = 'opus-streak-check';
const DB_NAME = 'OpusDB';
const DAY_MS = 86400000;
/** How far back the schedule walk looks — mirrors scheduleStreak's lookback. */
const LOOKBACK_SLOTS = 200;

function openDb() {
  return new Promise((resolve, reject) => {
    // No version: never trigger an upgrade from the worker. If the app has not
    // created the database yet there is nothing to nudge about anyway.
    const req = indexedDB.open(DB_NAME);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
    req.onblocked = () => reject(new Error('blocked'));
  });
}

function readRow(db, store, key) {
  return new Promise((resolve, reject) => {
    if (!db.objectStoreNames.contains(store)) { resolve(null); return; }
    const tx = db.transaction([store], 'readonly');
    const req = tx.objectStore(store).get(key);
    req.onsuccess = () => resolve(req.result ?? null);
    tx.onerror = () => reject(tx.error);
  });
}

function readAll(db, store) {
  return new Promise((resolve, reject) => {
    if (!db.objectStoreNames.contains(store)) { resolve([]); return; }
    const tx = db.transaction([store], 'readonly');
    const req = tx.objectStore(store).getAll();
    req.onsuccess = () => resolve(req.result ?? []);
    tx.onerror = () => reject(tx.error);
  });
}

/** Every distinct workout date, read from the index without loading rows. */
function readWorkoutDates(db) {
  return new Promise((resolve, reject) => {
    if (!db.objectStoreNames.contains('workouts')) { resolve([]); return; }
    const tx = db.transaction(['workouts'], 'readonly');
    const store = tx.objectStore('workouts');
    if (!store.indexNames.contains('date')) {
      const req = store.getAll();
      req.onsuccess = () => resolve([...new Set((req.result ?? []).map((w) => w.date))]);
      tx.onerror = () => reject(tx.error);
      return;
    }
    const dates = [];
    const req = store.index('date').openKeyCursor(null, 'nextunique');
    req.onsuccess = () => {
      const cursor = req.result;
      if (!cursor) { resolve(dates); return; }
      dates.push(cursor.key);
      cursor.continue();
    };
    tx.onerror = () => reject(tx.error);
  });
}

function writeRow(db, store, value) {
  return new Promise((resolve, reject) => {
    if (!db.objectStoreNames.contains(store)) { resolve(); return; }
    const tx = db.transaction([store], 'readwrite');
    tx.objectStore(store).put(value);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

function dayKey(d) {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function parseDay(key) {
  if (typeof key !== 'string') return null;
  const d = new Date(`${key}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

function shiftDay(key, n) {
  const d = parseDay(key);
  if (!d) return null;
  d.setDate(d.getDate() + n);
  return dayKey(d);
}

/**
 * Mirrors `dateKey.daysBetween`: rounded, because two local midnights across a
 * spring-forward change are 23 hours apart and flooring that read the day after
 * the change as no day at all — so a streak ending tonight got no nudge.
 */
function daysBetween(aKey, bKey) {
  const a = parseDay(aKey);
  const b = parseDay(bKey);
  if (!a || !b) return null;
  const d = Math.round((b - a) / DAY_MS);
  return d > 0 ? d : 0;
}

/** Mirrors `utils/streak.js` — a rescued lapse must not be nagged about. */
function effectiveLast(profile) {
  const last = profile && profile.lastWorkoutDate;
  const grace = profile && profile.streakGrace;
  if (!last || !grace || !grace.through || grace.for !== last) return last || null;
  return grace.through > last ? grace.through : last;
}

/** Mirrors `scheduleStreak.planDays`. */
function planDays(templates) {
  const days = new Set();
  for (const t of templates || []) {
    const d = t && t.dayOfWeek;
    if (Number.isInteger(d) && d >= 0 && d <= 6) days.add(d);
  }
  return days;
}

function weekdayOf(key) {
  const d = parseDay(key);
  return d ? d.getDay() : null;
}

function nextScheduled(key, days) {
  for (let i = 1; i <= 7; i += 1) {
    const k = shiftDay(key, i);
    if (k && days.has(weekdayOf(k))) return k;
  }
  return null;
}

function scheduledOnOrBefore(key, days) {
  for (let i = 0; i <= 7; i += 1) {
    const k = shiftDay(key, -i);
    if (k && days.has(weekdayOf(k))) return k;
  }
  return null;
}

/**
 * Mirrors `scheduleStreak` for the one question the worker asks: is a session
 * owed, and is today the last day it can be paid? Same window rule — each
 * scheduled day owns the days up to the next one, late counts, two sessions in
 * one window are one hit. Returns null with no plan.
 */
function scheduleState(days, dates, today) {
  if (!days || !days.size) return null;
  const trained = [...new Set(dates || [])].filter((k) => parseDay(k)).sort().reverse();
  const hit = (slot, next) => trained.some((d) => d >= slot && (next === null || d < next));

  const slots = [];
  let cursor = scheduledOnOrBefore(today, days);
  for (let i = 0; i < LOOKBACK_SLOTS && cursor; i += 1) {
    const next = nextScheduled(cursor, days);
    slots.push({ slot: cursor, next, open: next === null || next > today, hit: hit(cursor, next) });
    cursor = shiftDay(cursor, -1);
    cursor = cursor ? scheduledOnOrBefore(cursor, days) : null;
  }
  const open = slots[0] && slots[0].open ? slots[0] : null;
  const closed = open ? slots.slice(1) : slots;
  let run = 0;
  while (run < closed.length && closed[run].hit) run += 1;

  if (open && open.hit) return { count: run + 1, state: 'safe', nextDue: open.next, deadline: null };
  if (run > 0) {
    return {
      count: run,
      state: 'atRisk',
      nextDue: open ? open.slot : null,
      deadline: open && open.next ? shiftDay(open.next, -1) : null,
    };
  }
  return { count: 0, state: 'broken', nextDue: null, deadline: null };
}

const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

/**
 * What to say today, or null to stay quiet. Pure, so it is tested directly.
 *
 * With a plan, rest days are never nagged about: a nudge goes out only when a
 * session is actually owed — on the scheduled day, or on the last day its
 * window still accepts one. The day streak only ever has one deadline: the day
 * after your last session.
 */
function nudgeFor({ profile, plan, dates, today }) {
  const days = plan instanceof Set ? plan : new Set(plan || []);
  if (days.size) {
    const credited = (profile && profile.creditedDays) || [];
    const s = scheduleState(days, [...(dates || []), ...credited], today);
    if (!s || s.state !== 'atRisk' || s.count <= 0) return null;
    if (s.deadline === today) {
      return { title: 'Your streak ends tonight', body: `${plural(s.count, 'session')}. One session keeps it.` };
    }
    if (s.nextDue === today) {
      return { title: 'Session day', body: `A session is due today — keep your ${plural(s.count, 'session')} going.` };
    }
    return null;
  }

  const streak = Math.max(0, Math.trunc((profile && profile.streak) || 0));
  const last = effectiveLast(profile);
  if (!streak || !last) return null;
  // Exactly one day since the last session: today is the deadline. Zero means
  // already trained, two or more means it is gone and a nudge is just salt.
  if (daysBetween(last, today) !== 1) return null;
  return { title: 'Your streak ends tonight', body: `${plural(streak, 'day')}. One session keeps it.` };
}

function inQuietHours(hour, start, end) {
  if (start == null || end == null || start === end) return false;
  // Wraps midnight when start > end, which is the normal case (22 → 7).
  return start > end ? hour >= start || hour < end : hour >= start && hour < end;
}

async function checkStreak() {
  const db = await openDb();
  try {
    // Written by the app whenever notification settings change — the worker has
    // no localStorage, so preferences have to reach it through the database.
    const config = await readRow(db, 'notifications', 1);
    if (!config || !config.enabled || !config.streakRisk) return;

    const now = new Date();
    const today = dayKey(now);
    // At most one nudge a day, however often the browser decides to run us.
    if (config.lastNudge === today) return;
    if (inQuietHours(now.getHours(), config.dndStart, config.dndEnd)) return;

    const profile = await readRow(db, 'userProfile', 1);
    const plan = planDays(await readAll(db, 'templates'));
    // Only a plan needs the history; the day streak is all in the profile.
    const dates = plan.size ? await readWorkoutDates(db) : [];
    const nudge = nudgeFor({ profile, plan, dates, today });
    if (!nudge) return;

    await writeRow(db, 'notifications', { ...config, id: 1, lastNudge: today });
    await self.registration.showNotification(nudge.title, {
      body: nudge.body,
      icon: '/opus/icon-192.png',
      badge: '/opus/icon-192.png',
      tag: 'opus-streak',
      data: { url: '/opus/workout?start=today' },
    });
  } finally {
    db.close();
  }
}

self.addEventListener('periodicsync', (event) => {
  if (event.tag !== OPUS_TAG) return;
  // Never let this reject: a failing periodic sync can get the registration
  // dropped by the browser, and this is a bonus rather than a feature anything
  // depends on.
  event.waitUntil(checkStreak().catch(() => {}));
});

/** Where a tapped notification should land: its own URL, kept inside the app. */
function targetUrl(data) {
  const url = data && typeof data.url === 'string' ? data.url : '';
  return url.startsWith('/opus/') ? url : '/opus/';
}

self.addEventListener('notificationclick', (event) => {
  const url = targetUrl(event.notification.data);
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(async (list) => {
      const client = list.find((c) => c.url.includes('/opus/'));
      if (!client) return self.clients.openWindow(url);
      // Focus first, while the tap still counts as a user gesture, then take
      // the app to where the notification promised. It used to focus whatever
      // screen was open and drop the destination on the floor.
      const focused = 'focus' in client ? await client.focus().catch(() => client) : client;
      const target = new URL(url, self.location.origin).href;
      if (focused && focused.url !== target && 'navigate' in focused) {
        // Rejects for a window this worker does not control; focusing it is
        // then the best that can be done.
        await focused.navigate(target).catch(() => {});
      }
      return focused;
    })
  );
});
