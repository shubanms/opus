import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db.js';

// Returns all completed workouts newest-first.
export function useWorkouts() {
  return useLiveQuery(
    () => db.workouts.orderBy('createdAt').reverse().toArray(),
    []
  ) ?? [];
}

// Returns all sets for a given workoutId.
export function useWorkoutSets(workoutId) {
  return useLiveQuery(
    () => workoutId ? db.sets.where('workoutId').equals(workoutId).toArray() : [],
    [workoutId]
  ) ?? [];
}
