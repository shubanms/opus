import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db.js';

export const ALL_MUSCLES = [
  'chest', 'triceps', 'biceps', 'front-deltoids', 'back-deltoids',
  'upper-back', 'lower-back', 'trapezius', 'abs', 'obliques',
  'quadriceps', 'hamstring', 'gluteal', 'calves', 'forearm',
];

// Per-muscle days-since-last-trained + the most neglected muscle.
export function useRecovery() {
  return useLiveQuery(async () => {
    const sets = (await db.sets.toArray()).filter((s) => !s.isWarmup);
    const workouts = await db.workouts.toArray();
    const exercises = await db.exercises.toArray();
    const wDate = Object.fromEntries(workouts.map((w) => [w.id, w.date]));
    const exMuscle = Object.fromEntries(exercises.map((e) => [e.id, e.muscleGroup]));

    const last = {};
    for (const s of sets) {
      const m = exMuscle[s.exerciseId];
      const d = wDate[s.workoutId];
      if (!m || !d) continue;
      if (!last[m] || d > last[m]) last[m] = d;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const byMuscle = {};
    for (const m of ALL_MUSCLES) {
      if (last[m]) {
        const days = Math.max(0, Math.floor((today - new Date(last[m])) / 86400000));
        byMuscle[m] = { daysSince: days, lastDate: last[m] };
      } else {
        byMuscle[m] = { daysSince: null, lastDate: null };
      }
    }

    let neglected = null;
    for (const m of ALL_MUSCLES) {
      const score = byMuscle[m].daysSince == null ? Infinity : byMuscle[m].daysSince;
      if (!neglected || score > neglected.score) neglected = { muscle: m, daysSince: byMuscle[m].daysSince, score };
    }

    return { byMuscle, neglected };
  }, []) ?? { byMuscle: {}, neglected: null };
}
