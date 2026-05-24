// Local notifications. Note: a static PWA can fire notifications while open
// (e.g. PR celebrations) and store scheduling preferences, but true background
// delivery (gym nudge, weekly summary) needs push infrastructure we don't have.
// Those toggles are preference-ready and fire on the relevant in-app event.

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

export function permission() {
  return typeof Notification !== 'undefined' ? Notification.permission : 'unsupported';
}

export async function requestPermission() {
  if (typeof Notification === 'undefined') return 'unsupported';
  if (Notification.permission !== 'default') return Notification.permission;
  return Notification.requestPermission();
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

export function notify(type, { title, body }) {
  const s = getSettings();
  if (!s.enabled || !s[type]) return;
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
  if (inDND(s)) return;
  try {
    new Notification(title, { body, icon: `${import.meta.env.BASE_URL}lifter.png` });
  } catch {
    /* ignore */
  }
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
