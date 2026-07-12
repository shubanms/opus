// Local-calendar date keys. The app stores workout dates as `YYYY-MM-DD`
// strings; these helpers make sure we *write* and *parse* them against the
// user's LOCAL calendar, not UTC. A bare `new Date("2026-07-11")` parses as
// UTC midnight, which for non-UTC users is a different calendar day than local
// midnight — that mismatch made recovery day-counts lag ~24h. Pure + tested.

// Today's local calendar date as `YYYY-MM-DD`.
export function todayKey(now = new Date()) {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// Parse a `YYYY-MM-DD` key as LOCAL midnight (mirrors decay.js). Returns null
// for empty/invalid input so callers can guard.
export function parseKey(key) {
  if (!key || typeof key !== 'string') return null;
  const d = new Date(`${key}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

// Whole local days between two date keys (b - a). Negative clamped to 0.
export function daysBetween(aKey, bKey) {
  const a = parseKey(aKey);
  const b = parseKey(bKey);
  if (!a || !b) return null;
  const d = Math.floor((b - a) / 86400000);
  return d > 0 ? d : 0;
}
