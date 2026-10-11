// An exercise's history, session by session — what a lifter opens an exercise
// page for ("what did I do last time, and the time before?"). The page had
// records and two charts but no way to read the actual sets. Pure +
// unit-tested; useExerciseHistory (hooks/useExercises) feeds it.
//
// Record marks use the app's one definition of a record (records.js): within
// each session the first set to reach that session's best, if it beats the
// best that stood before the session. That is exactly what the finish screen
// celebrated at the time, so a trophy here is never a surprise.

import { RECORD_TYPES, isRecordSet, recordValue, beats } from './records.js';
import { toDisplay } from './units.js';
import { formatClock } from './duration.js';

const bySetOrder = (a, b) =>
  (a.setNumber ?? 0) - (b.setNumber ?? 0) || (a.completedAt ?? 0) - (b.completedAt ?? 0) || (a.id ?? 0) - (b.id ?? 0);

// Oldest first: by calendar day, then by when the session was saved.
const byWhen = (a, b) =>
  String(a.date ?? '').localeCompare(String(b.date ?? '')) ||
  (a.createdAt ?? 0) - (b.createdAt ?? 0) ||
  (a.workoutId ?? 0) - (b.workoutId ?? 0);

/**
 * sets: every logged set of ONE exercise. workouts: the workouts they belong
 * to. Returns sessions NEWEST first:
 *   [{ workoutId, date, name, sets: [{ ...set, records: ['weight'|'reps'|'volume'] }] }]
 * Sets whose workout no longer exists are dropped (an orphan has no date).
 */
export function buildExerciseHistory(sets, workouts) {
  const wById = new Map((workouts ?? []).filter(Boolean).map((w) => [w.id, w]));
  const groups = new Map();
  for (const s of sets ?? []) {
    const w = wById.get(s?.workoutId);
    if (!w) continue;
    if (!groups.has(w.id)) groups.set(w.id, { workoutId: w.id, date: w.date ?? null, name: w.name ?? '', createdAt: w.createdAt ?? 0, sets: [] });
    groups.get(w.id).sets.push({ ...s, records: [] });
  }

  const sessions = [...groups.values()].sort(byWhen);
  const standing = {};
  for (const session of sessions) {
    session.sets.sort(bySetOrder);
    for (const type of RECORD_TYPES) {
      let holder = null;
      for (const s of session.sets) {
        if (!isRecordSet(s)) continue;
        const v = recordValue(s, type);
        if (v > 0 && (!holder || v > recordValue(holder, type))) holder = s;
      }
      if (!holder) continue;
      const v = recordValue(holder, type);
      if (beats(v, standing[type], type)) {
        holder.records.push(type);
        standing[type] = v;
      }
    }
  }

  return sessions.reverse().map(({ createdAt, ...rest }) => rest);
}

const num = (n) => {
  const r = Math.round(Number(n) * 10) / 10;
  return Number.isInteger(r) ? String(r) : r.toFixed(1);
};

/**
 * One set as a chip: "77.5×8", "BW×12" for bodyweight, "15:00 · 2 km" for
 * cardio. Weight in the display unit (stored in kg).
 */
export function setChipLabel(set, unit = 'kg') {
  if (set?.isCardio) {
    const parts = [];
    if (set.durationSec) parts.push(formatClock(set.durationSec));
    if (set.distanceKm) parts.push(`${num(set.distanceKm)} km`);
    return parts.join(' · ') || 'Cardio';
  }
  const reps = Number(set?.reps) || 0;
  const w = Number(set?.weight) || 0;
  return w > 0 ? `${num(toDisplay(w, unit))}×${reps}` : `BW×${reps}`;
}

const RECORD_WORD = { weight: 'weight', reps: 'reps', volume: 'volume' };

/** "Weight & volume record" — the accessible name of a record mark. */
export function recordLabel(types) {
  const list = (types ?? []).map((t) => RECORD_WORD[t]).filter(Boolean);
  if (!list.length) return '';
  const words = list.length > 1 ? `${list.slice(0, -1).join(', ')} & ${list[list.length - 1]}` : list[0];
  return `${words.charAt(0).toUpperCase()}${words.slice(1)} record`;
}
