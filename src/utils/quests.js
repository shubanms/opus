// Deterministic weekly quests — no backend. Seeded by the Monday-aligned week
// index (whole weeks since the Unix epoch) so the same week always shows the
// same rotating set, and it changes every Monday. Volume targets are stored in
// kg (the internal unit); the UI converts them for display.

import { parseKey } from './dateKey.js';
import { RECORD_TYPES, beats, isRecordSet, recordValue } from './records.js';

export const QUEST_POOL = [
  { id: 'sessions3', metric: 'sessions',     target: 3,     xp: 120, icon: 'dumbbell',   title: 'Showed Up',       desc: 'Complete 3 workouts' },
  { id: 'pr1',       metric: 'prs',          target: 1,     xp: 100, icon: 'trophy',     title: 'New Heights',     desc: 'Set a personal record' },
  { id: 'vol5k',     metric: 'volumeKg',     target: 5000,  xp: 140, icon: 'weight',     title: 'Tonnage',         desc: '', volume: true },
  { id: 'legs2',     metric: 'legsSessions', target: 2,     xp: 120, icon: 'footprints', title: "Don't Skip Legs", desc: 'Train legs twice' },
  { id: 'sets25',    metric: 'sets',         target: 25,    xp: 110, icon: 'listChecks', title: 'Grind',           desc: 'Log 25 working sets' },
  { id: 'variety4',  metric: 'muscleVariety',target: 4,     xp: 120, icon: 'layers',     title: 'Well Rounded',    desc: 'Train 4 muscle groups' },
  { id: 'sessions4', metric: 'sessions',     target: 4,     xp: 180, icon: 'flame',      title: 'Relentless',      desc: 'Complete 4 workouts' },
  { id: 'vol10k',    metric: 'volumeKg',     target: 10000, xp: 220, icon: 'mountain',   title: 'Heavy Week',      desc: '', volume: true },
];

// Muscle groups that count as "legs" for the legs quest.
export const LEG_GROUPS = new Set(['quadriceps', 'hamstring', 'gluteal', 'calves']);

// Quest definition lookup by id (for reconciling claims against their def).
export const QUEST_BY_ID = Object.fromEntries(QUEST_POOL.map((q) => [q.id, q]));

// Per-metric quest stats from a week's already-filtered data. Inputs:
//   workouts — completed workouts in the week
//   sets     — non-warmup sets belonging to those workouts
//   prs      — PRs achieved in the week (or pass `prCount` directly)
//   exMuscle — { exerciseId: muscleGroup }
export function computeQuestStats({ workouts, sets, prs = [], prCount, exMuscle }) {
  const muscles = new Set(sets.map((s) => exMuscle[s.exerciseId]).filter(Boolean));
  const legWorkouts = new Set(
    sets.filter((s) => LEG_GROUPS.has(exMuscle[s.exerciseId])).map((s) => s.workoutId)
  );
  return {
    sessions: workouts.length,
    volumeKg: workouts.reduce((a, w) => a + (w.totalVolume || 0), 0),
    sets: sets.length,
    muscleVariety: muscles.size,
    legsSessions: legWorkouts.size,
    prs: prCount ?? prs.length,
  };
}

/**
 * The Monday week a stored date key falls in, read as a LOCAL day.
 *
 * `new Date('2026-10-05')` is UTC midnight, which west of UTC is still Sunday
 * evening — so every Monday session dropped out of its own week for anyone in
 * the Americas, on the quest board and in the claim reconcile alike.
 */
export function weekKeyOfDateKey(dateKey) {
  const d = parseKey(dateKey);
  return d ? weekKeyOf(d) : null;
}

const dayMs = (w) => parseKey(w?.date)?.getTime() ?? 0;

/**
 * Every personal record history says was set, in order: one event per
 * (session, exercise, record type) whose best set beat everything logged
 * before that session — the same unit the live save path rewards.
 *
 * Derived from sets rather than read from the `prs` table on purpose. A PR row
 * is mutable — beating your bench in week 3 rewrites the row from week 1 — so
 * "records set in week 1" read from the table forgot week 1's record the moment
 * it was beaten, and every later delete revoked a quest that was fairly won.
 */
export function recordEvents({ workouts, sets }) {
  const byId = new Map((workouts ?? []).map((w) => [w.id, w]));
  const bests = new Map(); // workoutId → Map(exerciseId → { weight, reps, volume })
  for (const s of sets ?? []) {
    if (!byId.has(s.workoutId) || !isRecordSet(s)) continue;
    if (!bests.has(s.workoutId)) bests.set(s.workoutId, new Map());
    const perEx = bests.get(s.workoutId);
    const b = perEx.get(s.exerciseId) ?? { weight: 0, reps: 0, volume: 0 };
    for (const type of RECORD_TYPES) b[type] = Math.max(b[type], recordValue(s, type));
    perEx.set(s.exerciseId, b);
  }
  const ordered = [...bests.keys()]
    .map((id) => byId.get(id))
    .sort((a, b) => dayMs(a) - dayMs(b) || (a.createdAt ?? 0) - (b.createdAt ?? 0) || a.id - b.id);

  const standing = new Map(); // `${exerciseId}:${type}` → record value
  const events = [];
  for (const w of ordered) {
    for (const [exerciseId, b] of bests.get(w.id)) {
      for (const type of RECORD_TYPES) {
        const key = `${exerciseId}:${type}`;
        // Only a beaten record moves, exactly as the stored record only moves
        // when a session beats it — a near-miss inside rounding noise is not a
        // new bar for the next session to clear.
        if (beats(b[type], standing.get(key), type)) {
          standing.set(key, b[type]);
          events.push({ workoutId: w.id, exerciseId, type, date: w.date });
        }
      }
    }
  }
  return events;
}

/**
 * Quest stats for one week, from the whole history. `events` is
 * `recordEvents(...)` over the same workouts and sets, passed in so a caller
 * checking several weeks derives it once.
 */
export function weekQuestStats({ weekKey, workouts, sets, exMuscle, events }) {
  const inWeek = (workouts ?? []).filter(
    (w) => w.status === 'completed' && weekKeyOfDateKey(w.date) === weekKey
  );
  const ids = new Set(inWeek.map((w) => w.id));
  return computeQuestStats({
    workouts: inWeek,
    sets: (sets ?? []).filter((s) => ids.has(s.workoutId) && !s.isWarmup),
    prCount: (events ?? recordEvents({ workouts, sets })).filter((e) => ids.has(e.workoutId)).length,
    exMuscle,
  });
}

const WEEK_MS = 7 * 86400000;

function mondayOf(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = (d.getDay() + 6) % 7; // 0 = Monday
  d.setDate(d.getDate() - day);
  return d;
}

// Stable per-week key (the Monday's local date, YYYY-MM-DD) used to scope claims.
export function weekKeyOf(date = new Date()) {
  const m = mondayOf(date);
  const y = m.getFullYear();
  const mo = String(m.getMonth() + 1).padStart(2, '0');
  const da = String(m.getDate()).padStart(2, '0');
  return `${y}-${mo}-${da}`;
}

// Epoch-ms of this week's Monday (for filtering timestamped records like PRs).
export function weekStartMs(date = new Date()) {
  return mondayOf(date).getTime();
}

// Epoch-ms of the Monday named by a stored weekKey ('YYYY-MM-DD'), parsed as
// local midnight so it matches weekStartMs.
export function weekStartMsFromKey(weekKey) {
  const [y, m, d] = weekKey.split('-').map(Number);
  return new Date(y, m - 1, d).getTime();
}

// Monotonic integer week counter, used to seed the rotation.
export function weekIndex(date = new Date()) {
  return Math.floor(mondayOf(date).getTime() / WEEK_MS);
}

// Deterministically pick `count` distinct-metric quests for the given week.
export function weeklyQuests(date = new Date(), count = 3) {
  const len = QUEST_POOL.length;
  const start = ((weekIndex(date) % len) + len) % len;
  const picked = [];
  const seenMetrics = new Set();
  for (let i = 0; i < len && picked.length < count; i++) {
    const def = QUEST_POOL[(start + i) % len];
    if (seenMetrics.has(def.metric)) continue;
    seenMetrics.add(def.metric);
    picked.push(def);
  }
  return picked;
}
