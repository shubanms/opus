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
 */

const OPUS_TAG = 'opus-streak-check';
const DB_NAME = 'OpusDB';

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

function daysBetween(aKey, bKey) {
  const a = new Date(`${aKey}T00:00:00`);
  const b = new Date(`${bKey}T00:00:00`);
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return null;
  const d = Math.floor((b - a) / 86400000);
  return d > 0 ? d : 0;
}

/** Mirrors `utils/streak.js` — a rescued lapse must not be nagged about. */
function effectiveLast(profile) {
  const last = profile && profile.lastWorkoutDate;
  const grace = profile && profile.streakGrace;
  if (!last || !grace || !grace.through || grace.for !== last) return last || null;
  return grace.through > last ? grace.through : last;
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
    const streak = Math.max(0, Math.trunc((profile && profile.streak) || 0));
    const last = effectiveLast(profile);
    if (!streak || !last) return;
    // Exactly one day since the last session: today is the deadline. Zero means
    // already trained, two or more means it is gone and a nudge is just salt.
    if (daysBetween(last, today) !== 1) return;

    await writeRow(db, 'notifications', { ...config, id: 1, lastNudge: today });
    await self.registration.showNotification('Your streak ends tonight', {
      body: `${streak} days. One session keeps it.`,
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

self.addEventListener('notificationclick', (event) => {
  const url = (event.notification.data && event.notification.data.url) || '/opus/';
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      // Focus the app if it is already open rather than opening a second copy.
      for (const client of list) {
        if (client.url.includes('/opus/') && 'focus' in client) return client.focus();
      }
      return self.clients.openWindow(url);
    })
  );
});
