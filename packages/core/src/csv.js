import { toDisplay, unitLabel } from './units.js';

// CSV building with RFC-4180 escaping. Pure + unit-tested.
export function escapeCsv(v) {
  if (v == null) return '';
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(headers, rows) {
  const lines = [headers.map(escapeCsv).join(',')];
  for (const r of rows) lines.push(r.map(escapeCsv).join(','));
  return lines.join('\n');
}

// rows: [{ date, workout, exercise, setNumber, weightKg, reps, rpe, isWarmup, note }]
// Weights are stored in kg and converted to the display unit at the column edge.
export function setsToCsv(rows, unit = 'kg') {
  const headers = ['Date', 'Workout', 'Exercise', 'Set', `Weight (${unitLabel(unit)})`, 'Reps', 'RPE', 'Warmup', 'Note'];
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
  ]);
  return toCsv(headers, body);
}
