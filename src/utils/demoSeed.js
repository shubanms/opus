// Dev-only demo data: the pure half. Builds ~3 weeks of believable sessions
// (push / pull / legs), ending with a 12-day run. Nothing here touches the
// database; src/dev/demoLoader.js writes it through the real helpers so every
// derived number (profile, records, badges) is computed, not faked.
//
// Never imported from app code outside an `import.meta.env.DEV` guard.

import { shiftKey, parseKey } from './dateKey.js';
import { calcWorkoutXP } from './rpg.js';

export const DEMO_PREFIX = 'demo-';
export const STREAK_DAYS = 12;

// name, base working kg, reps per set, set count. Names are stock catalogue rows.
const PUSH = [
  ['Bench Press', 70, 8, 4],
  ['Overhead Press', 42.5, 8, 3],
  ['Incline Bench Press', 52.5, 10, 3],
  ['Lateral Raise', 10, 12, 3],
  ['Tricep Pushdown', 30, 12, 3],
];
const PULL = [
  ['Barbell Row', 62.5, 8, 4],
  ['Lat Pulldown', 55, 10, 3],
  ['Pull-Up', 0, 8, 3],
  ['Barbell Curl', 30, 10, 3],
  ['Hammer Curl', 14, 12, 3],
];
const LEGS = [
  ['Back Squat', 92.5, 6, 4],
  ['Romanian Deadlift', 80, 8, 3],
  ['Leg Press', 160, 10, 3],
  ['Leg Extension', 45, 12, 3],
];

const SPLITS = [
  { name: 'Push Day', lifts: PUSH },
  { name: 'Pull Day', lifts: PULL },
  { name: 'Leg Day', lifts: LEGS },
];

const round25 = (kg) => Math.round(kg / 2.5) * 2.5;

/** Offsets (days before `today`) of every demo session, oldest first. */
export function demoOffsets() {
  // The 12-day run: yesterday back to 12 days ago, one rest-free session a day.
  const run = Array.from({ length: STREAK_DAYS }, (_, i) => STREAK_DAYS - i);
  // One rest day (13), then older sessions every other day.
  return [21, 19, 17, 15, 14, ...run];
}

/**
 * The sessions to seed, oldest first. `today` is a date key. Each carries its
 * sets (no ids), computed totals and XP. Strength rises ~1.5% a session so the
 * newest sets are the records.
 */
export function buildDemoWorkouts(today) {
  const offsets = demoOffsets();
  const last = offsets.length - 1;
  return offsets.map((off, i) => {
    const date = shiftKey(today, -off);
    const split = SPLITS[i % SPLITS.length];
    const lift = 1 + 0.015 * i;
    const start = (parseKey(date)?.getTime() ?? 0) + 18 * 3600 * 1000;
    const sets = [];
    let t = 0;
    for (const [exercise, base, reps, count] of split.lifts) {
      for (let n = 0; n < count; n++) {
        t += 150 * 1000;
        const drop = n === count - 1 && count > 3 ? 1 : 0;
        sets.push({
          exercise,
          setNumber: n + 1,
          weight: base === 0 ? 0 : Math.max(2.5, round25(base * lift)),
          reps: reps + (n === count - 1 ? 1 : 0) - drop,
          rpe: n === count - 1 ? 9 : 8,
          completedAt: start + t,
        });
      }
    }
    const working = sets.map((s) => ({ ...s, isWarmup: false }));
    return {
      date,
      name: split.name,
      sessionId: `${DEMO_PREFIX}${date}`,
      createdAt: start + t + 60 * 1000,
      startedAt: start,
      duration: Math.round(t / 1000) + 600,
      sets,
      totalSets: sets.length,
      totalVolume: Math.round(sets.reduce((a, s) => a + s.weight * s.reps, 0)),
      totalCalories: 260 + sets.length * 6,
      xpEarned: calcWorkoutXP(working),
      // The most recent Leg Day clears that day's dungeon.
      dungeon: split.name === 'Leg Day' && off <= 6 && i > last - 3,
    };
  });
}

/** Of the sessions, the one that clears its dungeon (the newest flagged), or null. */
export function dungeonSessionDate(workouts) {
  return [...workouts].reverse().find((w) => w.dungeon)?.date ?? null;
}

/** Distinct exercise names the seed needs, so the loader can resolve ids. */
export function demoExerciseNames() {
  return [...new Set(SPLITS.flatMap((s) => s.lifts.map((l) => l[0])))];
}
