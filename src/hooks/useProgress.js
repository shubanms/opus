import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db.js';

// Returns personal records for an exercise, newest first.
export function usePRs(exerciseId) {
  return useLiveQuery(
    () => exerciseId
      ? db.prs.where('exerciseId').equals(exerciseId).reverse().sortBy('achievedAt')
      : [],
    [exerciseId]
  ) ?? [];
}

// Returns body stat entries newest-first.
export function useBodyStats() {
  return useLiveQuery(
    () => db.bodyStats.orderBy('date').reverse().toArray(),
    []
  ) ?? [];
}

// Per-session volume for an exercise (last `limit` sessions, oldest→newest).
export function useExerciseVolume(exerciseId, limit = 10) {
  return useLiveQuery(async () => {
    if (!exerciseId) return [];
    const sets = await db.sets.where('exerciseId').equals(exerciseId).toArray();
    const byWorkout = {};
    for (const s of sets) {
      if (s.isWarmup) continue;
      byWorkout[s.workoutId] = (byWorkout[s.workoutId] ?? 0) + s.weight * s.reps;
    }
    const ids = Object.keys(byWorkout).map(Number).sort((a, b) => a - b);
    const result = [];
    for (const id of ids) {
      const w = await db.workouts.get(id);
      result.push({
        label: w?.date ? w.date.slice(5) : String(id),
        volume: Math.round(byWorkout[id]),
      });
    }
    return result.slice(-limit);
  }, [exerciseId]) ?? [];
}

// Stub — weekly volume aggregation implemented in Sprint 8
export function useVolumeByWeek() { return []; }
