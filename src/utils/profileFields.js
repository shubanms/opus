// What a typed profile field means. Pure + unit-tested; shared by onboarding and
// Settings so the two cannot accept different things.
//
// Both used to take whatever the number input produced: an age of "-5" was
// saved as a birth year in the future and the Profile read "-5 yrs", a height
// of 0 or 9000 went straight in, and a cleared barbell field saved a 0 kg bar —
// which silently broke every plate calculation after it.
//
// Each parser returns `{ ok, value }`. `ok: false` means "not a usable answer —
// keep what was there"; `ok: true, value: null` means the field was cleared on
// purpose. Out-of-range numbers are clamped rather than rejected, because a
// fat-fingered extra digit is far more common than a 130-year-old lifter.

import { LB_PER_KG } from './units.js';

export const AGE_RANGE = [13, 100];
export const HEIGHT_RANGE_CM = [100, 250];
export const BODYWEIGHT_RANGE_KG = [20, 400];
export const BAR_RANGE_KG = [1, 50];

/** The empty bar people actually load: 20 kg, or 45 lb (not 20 lb). */
export function defaultBar(unit) {
  return unit === 'lbs' ? 45 : 20;
}

const clamp = (n, [lo, hi]) => Math.min(hi, Math.max(lo, n));

function readNumber(raw) {
  const text = String(raw ?? '').trim();
  if (text === '') return { empty: true };
  const n = Number(text);
  return Number.isFinite(n) ? { n } : { bad: true };
}

/** Age in years → `{ ok, value: birthYear | null }`. */
export function parseAge(raw, year = new Date().getFullYear()) {
  const r = readNumber(raw);
  if (r.empty) return { ok: true, value: null };
  if (r.bad || r.n <= 0) return { ok: false, value: null };
  return { ok: true, value: year - Math.round(clamp(r.n, AGE_RANGE)) };
}

/** Age shown for a stored birth year, or '' when there is none. */
export function ageFromBirthYear(birthYear, year = new Date().getFullYear()) {
  if (!Number.isFinite(birthYear)) return '';
  const age = year - birthYear;
  return age > 0 ? age : '';
}

/** Height in cm → `{ ok, value: cm | null }`. */
export function parseHeight(raw) {
  const r = readNumber(raw);
  if (r.empty) return { ok: true, value: null };
  if (r.bad || r.n <= 0) return { ok: false, value: null };
  return { ok: true, value: Math.round(clamp(r.n, HEIGHT_RANGE_CM)) };
}

const toKgRaw = (n, unit) => (unit === 'lbs' ? n / LB_PER_KG : n);
const fromKgRaw = (kg, unit) => (unit === 'lbs' ? kg * LB_PER_KG : kg);

/**
 * Bodyweight typed in the display unit → `{ ok, value: kg | null }`.
 * Clearing the field is not "weigh nothing": it is no answer (`ok: false`).
 */
export function parseBodyweight(raw, unit) {
  const r = readNumber(raw);
  if (r.empty || r.bad || r.n <= 0) return { ok: false, value: null };
  const lo = fromKgRaw(BODYWEIGHT_RANGE_KG[0], unit);
  const hi = fromKgRaw(BODYWEIGHT_RANGE_KG[1], unit);
  return { ok: true, value: toKgRaw(clamp(r.n, [lo, hi]), unit) };
}

/** Empty-bar weight typed in the display unit → `{ ok, value: kg }`; blank → the unit's default bar. */
export function parseBar(raw, unit) {
  const r = readNumber(raw);
  if (r.empty) return { ok: true, value: toKgRaw(defaultBar(unit), unit) };
  if (r.bad || r.n <= 0) return { ok: false, value: null };
  const lo = fromKgRaw(BAR_RANGE_KG[0], unit);
  const hi = fromKgRaw(BAR_RANGE_KG[1], unit);
  return { ok: true, value: toKgRaw(clamp(r.n, [lo, hi]), unit) };
}

/**
 * Whether a typed value differs from the one on screen.
 *
 * The bodyweight field logged a new body-stat row on every blur — including a
 * blur that changed nothing, and (after a kg→lbs switch, while it still showed
 * the kg number) one that converted 80 "lbs" into a 36 kg bodyweight.
 */
export function changedFrom(raw, shown) {
  const a = Number(String(raw ?? '').trim());
  const b = Number(shown);
  if (String(raw ?? '').trim() === '' || !Number.isFinite(a)) return false;
  if (shown == null || shown === '' || !Number.isFinite(b)) return true;
  return Math.abs(a - b) > 1e-9;
}
