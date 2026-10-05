// Finding a session in History.
//
// After a few months the list is long enough that scrolling is guesswork:
// "when did I last do front squats?" meant opening cards one by one. Search
// reads what a person remembers — the session's name, its note, its tags, and
// the lifts in it — and the month headings re-total over whatever is showing,
// so a filtered month says what *those* sessions added up to.
//
// Pure + unit-tested.

import { monthLabel } from './dateKey.js';

/** Lower-case, accent-free, so "Café" finds "cafe". */
export function normalize(text) {
  return String(text ?? '')
    .normalize('NFKD')
    // Drop the combining marks NFKD split off ("é" → "e" + U+0301).
    .replace(/\p{M}/gu, '')
    .toLowerCase();
}

/** The searchable text of one session. */
export function haystackFor(workout, exerciseNames = []) {
  return normalize(
    [workout?.name, workout?.notes, ...(workout?.tags ?? []), ...(exerciseNames ?? [])].filter(Boolean).join(' \u0001 ')
  );
}

/**
 * Sessions matching every word of `query` (in any field) and carrying `tag`
 * when one is chosen. `namesByWorkout` maps workout id → exercise names; until
 * it has loaded, only the session's own fields are searched.
 */
export function filterHistory(workouts, { query = '', tag = null } = {}, namesByWorkout = null) {
  const words = normalize(query).split(/\s+/).filter(Boolean);
  return (workouts ?? []).filter((w) => {
    if (tag && !(w.tags ?? []).includes(tag)) return false;
    if (!words.length) return true;
    const hay = haystackFor(w, namesByWorkout?.get?.(w.id) ?? []);
    return words.every((word) => hay.includes(word));
  });
}

/** Tags in use, most used first (ties alphabetical), for the filter chips. */
export function historyTags(workouts) {
  const counts = new Map();
  for (const w of workouts ?? []) for (const t of w.tags ?? []) counts.set(t, (counts.get(t) ?? 0) + 1);
  return [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([t]) => t);
}

/**
 * Newest-first sessions grouped by calendar month, each with its own totals.
 * Expects the list newest-first already (as `useWorkouts` returns it).
 */
export function groupByMonth(workouts) {
  const months = [];
  const byKey = new Map();
  for (const w of workouts ?? []) {
    const key = (w.date ?? '').slice(0, 7);
    if (!byKey.has(key)) {
      const group = { key, label: monthLabel(w.date) || 'Undated', items: [], volume: 0, sets: 0 };
      byKey.set(key, group);
      months.push(group);
    }
    const g = byKey.get(key);
    g.items.push(w);
    g.volume += w.totalVolume ?? 0;
    g.sets += w.totalSets ?? 0;
  }
  return months;
}
