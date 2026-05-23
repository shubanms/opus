import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db.js';
import { getOverloadSuggestion, isDeloadDue } from '../utils/overload.js';

// Overload suggestion for an exercise from its last 3 sessions of working sets.
export function useOverload(exerciseId) {
  return useLiveQuery(async () => {
    if (!exerciseId) return null;
    const sets = await db.sets.where('exerciseId').equals(exerciseId).toArray();
    const working = sets.filter((s) => !s.isWarmup);
    if (working.length === 0) return getOverloadSuggestion([]);

    const byWorkout = {};
    for (const s of working) {
      (byWorkout[s.workoutId] ??= []).push({ weight: s.weight, reps: s.reps });
    }
    const sessions = Object.keys(byWorkout)
      .map(Number)
      .sort((a, b) => b - a)
      .slice(0, 3)
      .map((id) => byWorkout[id]);

    return getOverloadSuggestion(sessions);
  }, [exerciseId]) ?? null;
}

// Whether a deload is due (5+ consecutive training days).
export function useDeloadDue() {
  return useLiveQuery(async () => {
    const workouts = await db.workouts.toArray();
    return isDeloadDue(workouts.map((w) => w.date));
  }, []) ?? false;
}
