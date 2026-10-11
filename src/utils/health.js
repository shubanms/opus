// Body, sleep and activity entries: parsing, validation, editing, and the
// numbers the Body tab draws from them. Pure + unit-tested; the database writes
// live in healthActions.js.
//
// Storage units never change: weight in kg, circumferences in cm, sleep in
// hours, steps and glasses as whole counts. The user's unit setting only
// changes what a field *shows* and *accepts*.

import { shiftKey, daysBetween } from './dateKey.js';
import { toDisplay, toKg, unitLabel } from './units.js';

export const CM_PER_IN = 2.54;

/** Circumferences, stored in cm. */
export const MEASUREMENTS = ['chest', 'waist', 'hips', 'arms', 'thighs'];
export const BODY_FIELDS = ['weight', 'bodyFat', ...MEASUREMENTS];
export const SLEEP_FIELDS = ['hours', 'quality'];
export const ACTIVITY_FIELDS = ['steps', 'water'];

/**
 * What a real entry can be, in storage units.
 *
 * A typo is the common case and it is not harmless: "-80" became the current
 * bodyweight and every bodyweight set after it subtracted volume, and one
 * "800" spikes the weight chart for good. Ranges are wide on purpose — they
 * are there to catch slips of the thumb, not to have opinions about bodies.
 */
export const LIMITS = {
  weight: { min: 20, max: 400 }, // kg
  bodyFat: { min: 2, max: 70 }, // %
  chest: { min: 40, max: 250 }, // cm
  waist: { min: 40, max: 250 },
  hips: { min: 40, max: 250 },
  arms: { min: 10, max: 100 },
  thighs: { min: 20, max: 150 },
  hours: { min: 0, max: 24 },
  steps: { min: 0, max: 100000 },
  water: { min: 0, max: 40 },
};

/** "cm" or "in": imperial weight users get imperial tape measurements too. */
export function lengthUnit(unit) {
  return unit === 'lbs' ? 'in' : 'cm';
}

/** cm (stored) → the user's length unit, to one decimal. */
export function lengthToDisplay(cm, unit) {
  if (cm == null || !Number.isFinite(Number(cm))) return null;
  const v = unit === 'lbs' ? Number(cm) / CM_PER_IN : Number(cm);
  return Math.round(v * 10) / 10;
}

/** A length typed in the user's unit → cm (stored). */
export function lengthToCm(value, unit) {
  return unit === 'lbs' ? value * CM_PER_IN : value;
}

/** Trim a display number: 72 → "72", 72.25 → "72.3". */
function short(n) {
  const r = Math.round(n * 10) / 10;
  return Number.isInteger(r) ? String(r) : r.toFixed(1);
}

/** Group thousands without asking the device's locale: 100000 → "100,000". */
function grouped(n) {
  return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/**
 * A decimal from what a person typed: "72.5", "72,5" (comma-decimal keypads),
 * " 72 ". Null for blank; NaN for anything that is not a plain number —
 * including grouped digits, which in a weight field are more likely a typo
 * than a thousand-kilo lift.
 */
export function parseDecimal(text) {
  if (text == null) return null;
  const s = String(text).trim().replace(',', '.');
  if (s === '') return null;
  if (!/^[+-]?(\d+\.?\d*|\.\d+)$/.test(s)) return Number.NaN;
  return Number(s);
}

/**
 * A whole count from what a person typed. Steps arrive as "8,000", "8 000",
 * "8.000" or "8k" — parseInt read "8,000" as 8, and the button then *set* the
 * day's total to it. Group separators are dropped; anything else that isn't a
 * digit makes the input invalid rather than silently truncated.
 *
 * `grouped: false` is for small counts (glasses of water), where "8.5" is a
 * fraction someone meant, not eighty-five.
 */
export function parseCount(text, { grouped: allowGroups = true } = {}) {
  if (text == null) return null;
  let s = String(text).trim();
  if (s === '') return null;
  if (allowGroups) {
    const k = /^(\d+(?:[.,]\d+)?)\s*k$/i.exec(s);
    if (k) return Math.round(Number(k[1].replace(',', '.')) * 1000);
    s = s.replace(/[\s,.'’_  ]/g, '');
  }
  if (!/^\d+$/.test(s)) return Number.NaN;
  return Number(s);
}

/** The range a field accepts, as the user would read it ("44–882 lbs"). */
export function rangeHint(field, unit) {
  const lim = LIMITS[field];
  if (!lim) return '';
  if (field === 'weight') {
    return `${Math.ceil(toDisplay(lim.min, unit))}–${Math.floor(toDisplay(lim.max, unit))} ${unitLabel(unit)}`;
  }
  if (MEASUREMENTS.includes(field)) {
    return `${Math.ceil(lengthToDisplay(lim.min, unit))}–${Math.floor(lengthToDisplay(lim.max, unit))} ${lengthUnit(unit)}`;
  }
  if (field === 'bodyFat') return `${lim.min}–${lim.max}%`;
  if (field === 'hours') return `${lim.min}–${lim.max} h`;
  if (field === 'steps') return `up to ${grouped(lim.max)}`;
  if (field === 'water') return `${lim.min}–${lim.max} glasses`;
  return '';
}

/**
 * One field from the form → `{ value, error }` in storage units.
 *
 * `value` is null for a blank field. Out-of-range and unparseable input give an
 * error and no value, so nothing invalid reaches the database.
 */
export function readField(field, text, unit = 'kg') {
  if (field === 'quality') {
    const q = Number(text) || 0;
    return q >= 1 && q <= 5 ? { value: Math.round(q), error: null } : { value: null, error: null };
  }
  const isCount = field === 'steps' || field === 'water';
  const raw = isCount ? parseCount(text, { grouped: field === 'steps' }) : parseDecimal(text);
  if (raw === null) return { value: null, error: null };
  if (Number.isNaN(raw)) {
    return { value: null, error: isCount ? 'Whole numbers only' : 'Not a number' };
  }
  let stored = raw;
  if (field === 'weight') stored = toKg(raw, unit);
  else if (MEASUREMENTS.includes(field)) stored = lengthToCm(raw, unit);
  const lim = LIMITS[field];
  // A hair of tolerance so the converted bounds themselves (e.g. 44 lbs) pass.
  const eps = 1e-6;
  if (lim && (stored < lim.min - eps || stored > lim.max + eps)) {
    return { value: null, error: `Enter ${rangeHint(field, unit)}` };
  }
  return { value: stored, error: null };
}

/** A stored value as the form shows it, in the user's units ('' when unset). */
export function fieldText(field, value, unit = 'kg') {
  if (value == null || value === '') return '';
  const n = Number(value);
  if (!Number.isFinite(n)) return '';
  if (field === 'quality') return n > 0 ? String(n) : '';
  if (field === 'weight') return short(toDisplay(n, unit));
  if (MEASUREMENTS.includes(field)) return short(lengthToDisplay(n, unit));
  if (field === 'steps' || field === 'water') return String(Math.round(n));
  return short(n);
}

/** Every field of a stored row as form text — what an edit form opens with. */
export function formFromRow(row, fields, unit = 'kg') {
  return Object.fromEntries(fields.map((f) => [f, fieldText(f, row?.[f], unit)]));
}

/**
 * What to write: only the fields the person actually changed.
 *
 * Saving used to write every field, so re-saving the Sleep form to add a star
 * rating wiped the hours you'd left blank, and "Log a day" turned a blank
 * water field into 0 glasses over the 6 you had. The form opens prefilled with
 * the day's row; anything still matching it is left alone, and a field the
 * person cleared is written as null (removed), not ignored.
 *
 * Returns `{ patch, errors, changed }`. `errors` is keyed by field; nothing
 * should be saved while it has any.
 */
export function buildPatch(original, form, fields, unit = 'kg') {
  const patch = {};
  const errors = {};
  for (const f of fields) {
    const before = fieldText(f, original?.[f], unit);
    const now = form?.[f] == null ? '' : String(form[f]).trim();
    if (now === before) continue;
    const { value, error } = readField(f, now, unit);
    if (error) errors[f] = error;
    else patch[f] = value;
  }
  return { patch, errors, changed: Object.keys(patch).length > 0 };
}

/**
 * The form after switching it to another day.
 *
 * Fields the person had already typed into are kept (picking the date last is
 * a normal order to fill a form in); everything else shows the new day's row.
 * `prevOriginal === undefined` means the form has just opened: nothing typed
 * yet, take the row as it is.
 */
export function carryOver(prevForm, prevOriginal, nextRow, fields, unit = 'kg') {
  const out = {};
  for (const f of fields) {
    const typed = prevForm?.[f] == null ? '' : String(prevForm[f]);
    const dirty = prevOriginal !== undefined && typed.trim() !== fieldText(f, prevOriginal?.[f], unit);
    out[f] = dirty ? typed : fieldText(f, nextRow?.[f], unit);
  }
  return out;
}

/** True when a row holds nothing worth keeping (every field blank or zero). */
export function isEmptyEntry(row, fields) {
  return fields.every((f) => row?.[f] == null || row[f] === '' || Number(row[f]) === 0);
}

/**
 * The newest recorded value of each field, with the date it is from.
 *
 * "Latest measurements" read only the newest row, and most rows are a morning
 * weigh-in with nothing else — so someone who weighs daily and measures monthly
 * saw a row of dashes. Each field now reports its own most recent value.
 */
export function latestByField(rows, fields) {
  const out = {};
  for (const f of fields) {
    let best = null;
    for (const r of rows ?? []) {
      const v = r?.[f];
      if (v == null || v === '' || !Number.isFinite(Number(v))) continue;
      if (!best || r.date > best.date) best = { value: Number(v), date: r.date };
    }
    out[f] = best;
  }
  return out;
}

/**
 * One row per date — the last one written (highest id) wins.
 *
 * The forms keep a single row per day, but imported or older data can hold
 * two, and a chart that plots both draws a vertical spike on that day. Lists
 * should still show every row, so the stray one can be found and deleted.
 */
export function latestPerDay(rows) {
  const byDate = new Map();
  for (const r of rows ?? []) {
    if (!r?.date) continue;
    const prev = byDate.get(r.date);
    if (!prev || (r.id ?? 0) > (prev.id ?? 0)) byDate.set(r.date, r);
  }
  return [...byDate.values()];
}

/**
 * Trailing average over the last `days` calendar days at each point.
 *
 * By date, not by index: three weigh-ins in a week and seven are both "the
 * last week", and an index window would average a month for the infrequent
 * weigher. `points` are `{ date, value }`; the result is aligned to them after
 * sorting oldest first.
 */
export function rollingAverage(points, days = 7) {
  const sorted = [...(points ?? [])]
    .filter((p) => p?.date && Number.isFinite(p.value))
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  return sorted.map((p, i) => {
    const from = shiftKey(p.date, -(days - 1));
    let sum = 0;
    let n = 0;
    for (let j = i; j >= 0 && sorted[j].date >= from; j -= 1) {
      sum += sorted[j].value;
      n += 1;
    }
    return { date: p.date, value: p.value, avg: sum / n };
  });
}

/**
 * The body-weight headline: how much the smoothed weight moved over about the
 * last `days` days. Answers "am I actually going down?" without day-to-day
 * water noise deciding it.
 *
 * Measured back from the latest entry. The start is the last entry at least
 * `days` before it, or the first entry when there is less history than that —
 * the span reported is the real one, never an implied 30. Needs a week of
 * history; anything shorter is noise with a sign on it. Returns
 * `{ delta, days, from, to }` (delta in the points' unit) or null.
 */
export function weightTrend(points, { days = 30, smooth = 7, minDays = 7 } = {}) {
  const series = rollingAverage(points, smooth);
  if (series.length < 2) return null;
  const end = series[series.length - 1];
  const target = shiftKey(end.date, -days);
  let start = series[0];
  for (const p of series) {
    if (p.date <= target) start = p;
    else break;
  }
  const span = daysBetween(start.date, end.date);
  if (!(span >= minDays)) return null;
  return { delta: end.avg - start.avg, days: span, from: start.date, to: end.date };
}
