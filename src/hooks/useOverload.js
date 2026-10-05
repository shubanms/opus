import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db.js';
import { getOverloadSuggestion, isDeloadDue } from '../utils/overload.js';
import { usePlateIncrement } from './usePlateIncrement.js';

// Overload suggestion for an exercise from its last 3 sessions of working sets.
//
// The step is the same plate-aware increment the weight stepper uses, so a
// suggestion is always a weight the stepper can reach. Unit and increment are
// dependencies: switching to pounds re-words the line instead of leaving the
// kg sentence on screen until the next database change.
export function useOverload(exerciseId, { equipment = null } = {}) {
  const { unit, incrementKg } = usePlateIncrement();
  return useLiveQuery(async () => {
    if (!exerciseId) return null;
    const sets = await db.sets.where('exerciseId').equals(exerciseId).toArray();
    const working = sets.filter((s) => !s.isWarmup && !s.isCardio);
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

    return getOverloadSuggestion(sessions, { unit, weightStep: incrementKg, equipment });
  }, [exerciseId, unit, incrementKg, equipment]) ?? null;
}

// Whether a deload is due (5+ consecutive training days).
export function useDeloadDue() {
  return useLiveQuery(async () => {
    const workouts = await db.workouts.toArray();
    return isDeloadDue(workouts.map((w) => w.date));
  }, []) ?? false;
}
