import { toDisplay, unitLabel } from './units.js';

// CSV building with RFC-4180 escaping. Pure + unit-tested.

/**
 * Prepended to the file so Excel reads it as UTF-8. Without it, "Farmer's
 * Walk" survives but any accented or emoji note turns into mojibake.
 */
export const CSV_BOM = String.fromCharCode(0xfeff);

// A cell a spreadsheet would execute rather than display. Exercise names,
// workout names and notes are free text, and "=HYPERLINK(…)" typed into a set
// note is a formula the moment the export is opened in Sheets or Excel.
const FORMULA_START = /^[=+\-@\t\r]/;

export function escapeCsv(v) {
  if (v == null) return '';
  let s = String(v);
  // Text only: a negative number is a number, not an injection.
  if (typeof v === 'string' && FORMULA_START.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(headers, rows) {
  const lines = [headers.map(escapeCsv).join(',')];
  for (const r of rows) lines.push(r.map(escapeCsv).join(','));
  return lines.join('\n');
}

const round2 = (n) => Math.round(n * 100) / 100;

/**
 * One row per logged set, in the order it happened: by day, then session
 * (two sessions on one day stay apart instead of merging), then the order the
 * exercises were done in, then set number.
 *
 * Sorting by date and set number alone interleaved every exercise of a session
 * — Bench set 1, Squat set 1, Bench set 2… — because set numbers restart per
 * exercise. Exercise order is the first id each exercise owns in its session,
 * since sets are written exercise by exercise as the session ran.
 */
export function buildSetRows({ sets = [], workouts = [], exercises = [] } = {}) {
  const wById = new Map(workouts.map((w) => [w.id, w]));
  const nameById = new Map(exercises.map((e) => [e.id, e.name]));
  const firstId = new Map(); // `${workoutId}:${exerciseId}` → first set id
  for (const s of sets) {
    const key = `${s.workoutId}:${s.exerciseId}`;
    if (!firstId.has(key) || s.id < firstId.get(key)) firstId.set(key, s.id);
  }
  const rows = sets.map((s) => {
    const w = wById.get(s.workoutId) ?? {};
    return {
      date: w.date ?? '',
      createdAt: w.createdAt ?? 0,
      workoutId: s.workoutId ?? 0,
      order: firstId.get(`${s.workoutId}:${s.exerciseId}`) ?? 0,
      id: s.id ?? 0,
      workout: w.name ?? '',
      exercise: nameById.get(s.exerciseId) ?? '',
      setNumber: s.setNumber,
      weightKg: s.isCardio ? null : s.weight,
      reps: s.isCardio ? null : s.reps,
      rpe: s.rpe ?? '',
      isWarmup: s.isWarmup,
      note: s.note ?? '',
      isCardio: !!s.isCardio,
      durationSec: s.durationSec ?? null,
      distanceKm: s.distanceKm ?? null,
      calories: s.isCardio ? (s.calories ?? null) : null,
    };
  });
  return rows.sort(
    (a, b) =>
      (a.date < b.date ? -1 : a.date > b.date ? 1 : 0) ||
      a.createdAt - b.createdAt ||
      a.workoutId - b.workoutId ||
      a.order - b.order ||
      (a.setNumber ?? 0) - (b.setNumber ?? 0) ||
      a.id - b.id
  );
}

// rows: [{ date, workout, exercise, setNumber, weightKg, reps, rpe, isWarmup, note,
//          durationSec, distanceKm, calories }]
// Weights are stored in kg and converted to the display unit at the column edge.
export function setsToCsv(rows, unit = 'kg') {
  const headers = [
    'Date', 'Workout', 'Exercise', 'Set', `Weight (${unitLabel(unit)})`, 'Reps', 'RPE', 'Warmup', 'Note',
    'Duration (min)', 'Distance (km)', 'Calories (kcal)',
  ];
  const body = rows.map((r) => [
    r.date ?? '',
    r.workout ?? '',
    r.exercise ?? '',
    r.setNumber ?? '',
    r.weightKg != null ? Math.round(toDisplay(r.weightKg, unit) * 100) / 100 : '',
    r.reps ?? '',
    r.rpe ?? '',
    r.isWarmup ? 'yes' : '',
    r.note ?? '',
    r.durationSec > 0 ? round2(r.durationSec / 60) : '',
    r.distanceKm > 0 ? round2(r.distanceKm) : '',
    r.calories > 0 ? Math.round(r.calories) : '',
  ]);
  return toCsv(headers, body);
}
