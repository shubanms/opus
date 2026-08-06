import { db } from '../db/db.js';
import { getSettings } from './notifications.js';

// Registering the streak nudge with the browser. Not pure — DB + SW registry.
//
// Every branch here is a "no" on most devices, and that is the design. Periodic
// Background Sync is Chromium-only, installed-only, and gated on an
// engagement score the browser will not show you; on iOS and Firefox the API
// simply does not exist. So this feature-detects everything, never prompts,
// never throws, and never reports failure to the user — the retroactive rescue
// prompt is what actually catches a lapse (see `utils/streak.js`).
//
// See `public/sw-periodic.js` for the worker side.

export const STREAK_TAG = 'opus-streak-check';
/** Twelve hours. The browser treats this as a floor, not a promise. */
const MIN_INTERVAL_MS = 12 * 60 * 60 * 1000;

/** Is the API even here? Used by Settings to decide whether to say anything. */
export function periodicSyncSupported() {
  return (
    typeof navigator !== 'undefined' &&
    'serviceWorker' in navigator &&
    typeof ServiceWorkerRegistration !== 'undefined' &&
    'periodicSync' in ServiceWorkerRegistration.prototype
  );
}

/**
 * Mirror the notification preferences into IndexedDB.
 *
 * The worker has no localStorage, so this is the only way settings reach it.
 * Kept to the single row the worker reads, rather than mirroring the whole settings blob:
 * a preference the worker cannot act on has no business being duplicated.
 */
export async function syncNotificationConfig(settings = getSettings()) {
  try {
    const existing = await db.notifications.get(1);
    await db.notifications.put({
      ...existing,
      id: 1,
      type: 'config',
      enabled: !!settings.enabled,
      streakRisk: settings.streakRisk !== false,
      dndStart: settings.dndStart ?? 22,
      dndEnd: settings.dndEnd ?? 7,
    });
  } catch {
    /* a nudge is not worth an error */
  }
}

/**
 * Register (or drop) the periodic sync, following the user's own setting.
 *
 * Safe to call on every boot and after every settings change — registering the
 * same tag twice is a no-op, and dropping one that was never registered is too.
 */
export async function updateStreakSync(settings = getSettings()) {
  await syncNotificationConfig(settings);
  if (!periodicSyncSupported()) return 'unsupported';

  try {
    const reg = await navigator.serviceWorker.ready;
    const wanted = !!settings.enabled && settings.streakRisk !== false;

    if (!wanted) {
      await reg.periodicSync.unregister(STREAK_TAG).catch(() => {});
      return 'off';
    }

    // Permission is granted silently or not at all — there is no prompt for
    // this one, so asking is not an option and refusing is not an error.
    const status = await navigator.permissions
      ?.query({ name: 'periodic-background-sync' })
      .catch(() => null);
    if (status && status.state !== 'granted') return 'denied';

    await reg.periodicSync.register(STREAK_TAG, { minInterval: MIN_INTERVAL_MS });
    return 'registered';
  } catch {
    // Thrown when the app is not installed, among other reasons. Nothing to
    // report: this was always the bonus path.
    return 'unavailable';
  }
}
