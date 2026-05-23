import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db.js';

// All completed workouts newest-first.
export function useWorkouts() {
  return useLiveQuery(
    () => db.workouts.orderBy('createdAt').reverse().toArray(),
    []
  ) ?? [];
}

// Sets from the most recent session for a given exercise (for ghost text).
export function useLastSets(exerciseId) {
  return useLiveQuery(async () => {
    if (!exerciseId) return [];
    const sets = await db.sets.where('exerciseId').equals(exerciseId).toArray();
    if (sets.length === 0) return [];
    const maxId = sets.reduce((m, s) => (s.workoutId > m ? s.workoutId : m), 0);
    return sets
      .filter((s) => s.workoutId === maxId)
      .sort((a, b) => a.setNumber - b.setNumber);
  }, [exerciseId]) ?? [];
}

// All sets for a specific workout.
export function useWorkoutSets(workoutId) {
  return useLiveQuery(
    () => (workoutId ? db.sets.where('workoutId').equals(workoutId).toArray() : []),
    [workoutId]
  ) ?? [];
}
