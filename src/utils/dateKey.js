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
//
// Rounded, not floored: across a spring-forward change the gap between two
// local midnights is 23 hours, and flooring that read "the day after the
// clocks changed" as zero days later — a streak that should have been at risk
// read as safe, and one that should have broken read as at risk.
export function daysBetween(aKey, bKey) {
  const a = parseKey(aKey);
  const b = parseKey(bKey);
  if (!a || !b) return null;
  const d = Math.round((b - a) / 86400000);
  return d > 0 ? d : 0;
}

// Shift a date key by whole local days. Goes through a local Date so month
// ends, leap days and DST transitions are the calendar's problem, not ours.
export function shiftKey(key, days) {
  const d = parseKey(key);
  if (!d) return null;
  d.setDate(d.getDate() + days);
  return todayKey(d);
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * A date key as a person would say it: "Today", "Yesterday", "5 Aug", and
 * "5 Aug 2025" once the year stops being obvious.
 *
 * Screens that group by day were printing the raw key — "2026-08-05" is a
 * storage format, not a date you read. Deliberately not `toLocaleDateString`:
 * the app formats numbers locale-free everywhere else (see cardLayout) so that
 * what ships is what was designed, rather than whatever the device decides.
 */
export function friendlyDate(key, now = new Date()) {
  const d = parseKey(key);
  if (!d) return '';
  const today = todayKey(now);
  if (key === today) return 'Today';
  const yesterdayKey = todayKey(new Date(parseKey(today).getTime() - 86400000));
  if (key === yesterdayKey) return 'Yesterday';
  const label = `${d.getDate()} ${MONTHS[d.getMonth()]}`;
  return d.getFullYear() === now.getFullYear() ? label : `${label} ${d.getFullYear()}`;
}

/**
 * "17 Aug" — the compact form, for chart axes and dense rows.
 *
 * Charts were labelling ticks "8/17" (month-first, which reads as the 8th of
 * the 17th month to most of the world) or "08-17", while every list said
 * "17 Aug". One format, everywhere a date is short. Never "Today": an axis
 * tick is a position, not a relative time.
 */
export function shortDate(key) {
  const d = parseKey(key);
  if (!d) return '';
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

/** "August 2026" — the heading a list of days is grouped under. */
export function monthLabel(key) {
  const d = parseKey(key);
  if (!d) return '';
  const full = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];
  return `${full[d.getMonth()]} ${d.getFullYear()}`;
}
