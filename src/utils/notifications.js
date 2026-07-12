// Local notifications. Note: a static PWA can fire notifications while open
// (e.g. PR celebrations) and store scheduling preferences, but true background
// delivery (gym nudge, weekly summary) needs push infrastructure we don't have.
// Those toggles are preference-ready and fire on the relevant in-app event.
//
// Two delivery paths, transparent to callers:
// - PWA / browser: navigator.serviceWorker.ready.showNotification(...) (required
//   on Android; the `new Notification(...)` constructor is forbidden there).
// - Capacitor APK: @capacitor/local-notifications via the native bridge —
//   Service Workers don't register inside the WebView so the SW path hangs.

import { Capacitor } from '@capacitor/core';

const isNative = () => Capacitor?.isNativePlatform?.() ?? false;
const loadLN = () => import('@capacitor/local-notifications').then((m) => m.LocalNotifications);

const SETTINGS_KEY = 'opus_notif_settings';
const PROMPTED_KEY = 'opus_notif_prompted';

export const NOTIF_TYPES = [
  { key: 'prCelebration', label: 'PR celebrations' },
  { key: 'streakRisk', label: 'Streak at risk' },
  { key: 'gymNudge', label: 'Daily gym reminder' },
  { key: 'weeklySummary', label: 'Weekly summary' },
  { key: 'staleRoutine', label: 'Switch up a stale routine' },
];

const DEFAULTS = {
  enabled: false,
  prCelebration: true,
  streakRisk: true,
  gymNudge: true,
  weeklySummary: true,
  staleRoutine: true,
  dndStart: 22,
  dndEnd: 7,
};

export function getSettings() {
  try {
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}') };
  } catch {
    return { ...DEFAULTS };
  }
}

export function saveSettings(s) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
}

// Synchronous best-effort — used by the Settings UI to decide whether to
// show the "Blocked in browser settings" hint. On native, we can't check
// synchronously; assume 'default' so the toggle is usable. The actual
// permission is requested at request/show time.
export function permission() {
  if (isNative()) return 'default';
  return typeof Notification !== 'undefined' ? Notification.permission : 'unsupported';
}

// Async, accurate current permission — on native the sync `permission()` can't
// read the real state (it returns 'default'), which left the Settings toggle
// stuck off even when Android had already granted it. Callers resolve this on
// mount to reflect the true state. No prompt is shown.
export async function currentPermission() {
  if (isNative()) {
    try {
      const LN = await loadLN();
      const res = await LN.checkPermissions();
      return res?.display === 'granted' ? 'granted'
           : res?.display === 'denied'  ? 'denied'
           : 'default';
    } catch {
      return 'default';
    }
  }
  if (typeof Notification === 'undefined') return 'unsupported';
  return Notification.permission;
}

export async function requestPermission() {
  if (isNative()) {
    try {
      const LN = await loadLN();
      // If the OS already granted it, checkPermissions returns 'granted' without
      // a dialog — so an already-allowed app enables cleanly instead of stalling.
      let res = await LN.checkPermissions();
      if (res?.display !== 'granted') res = await LN.requestPermissions();
      return res?.display === 'granted' ? 'granted'
           : res?.display === 'denied'  ? 'denied'
           : 'default';
    } catch {
      return 'default'; // plugin hiccup — don't hard-block the toggle
    }
  }
  if (typeof Notification === 'undefined') return 'unsupported';
  if (Notification.permission !== 'default') return Notification.permission;
  try { return await Notification.requestPermission(); } catch { return 'default'; }
}

// Whether `now` falls in the do-not-disturb window (handles midnight wrap).
// Exported so in-app reminders share the exact same quiet-hours logic.
export function inQuietHours(s, now = new Date()) {
  const h = now.getHours();
  if (s.dndStart === s.dndEnd) return false;
  return s.dndStart < s.dndEnd
    ? h >= s.dndStart && h < s.dndEnd
    : h >= s.dndStart || h < s.dndEnd; // window wraps midnight
}

function inDND(s) {
  return inQuietHours(s);
}

// Sends one notification through the right runtime:
// - Native (Capacitor): @capacitor/local-notifications schedules immediately
//   via Android NotificationManager. No SW, no constructor.
// - PWA / browser: navigator.serviceWorker.ready.showNotification(...). Falls
//   back to the constructor for desktop browsers without a SW.
export async function showNotification(title, opts = {}) {
  if (isNative()) {
    const LN = await loadLN();
    // Permissions are user-driven on native; if denied, schedule() will reject.
    await LN.schedule({
      notifications: [{
        id: Math.floor(Math.random() * 2147483647),
        title,
        body: opts.body ?? '',
      }],
    });
    return;
  }
  if (typeof Notification === 'undefined') throw new Error('unsupported');
  if (Notification.permission !== 'granted') throw new Error('not-granted');
  const full = { icon: `${import.meta.env.BASE_URL}lifter.png`, ...opts };
  if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
    try {
      const reg = await navigator.serviceWorker.ready;
      await reg.showNotification(title, full);
      return;
    } catch { /* fall through to direct constructor */ }
  }
  new Notification(title, full);
}

export async function notify(type, { title, body }) {
  const s = getSettings();
  if (!s.enabled || !s[type]) return;
  if (inDND(s)) return;
  try { await showNotification(title, { body }); } catch { /* ignore */ }
}

export function notifyPR(text) {
  notify('prCelebration', { title: 'New personal record!', body: text });
}

// One-time permission prompt after the first completed workout.
export async function maybePromptPermission() {
  if (localStorage.getItem(PROMPTED_KEY)) return;
  localStorage.setItem(PROMPTED_KEY, '1');
  const perm = await requestPermission();
  if (perm === 'granted') {
    saveSettings({ ...getSettings(), enabled: true });
  }
}
