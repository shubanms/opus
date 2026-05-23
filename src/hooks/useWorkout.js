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

// Workout sets grouped by exercise, with names. Pass null to skip loading.
export function useWorkoutDetail(workoutId) {
  return useLiveQuery(async () => {
    if (!workoutId) return [];
    const sets = await db.sets.where('workoutId').equals(workoutId).sortBy('setNumber');
    const groups = {};
    for (const s of sets) (groups[s.exerciseId] ??= []).push(s);
    const result = [];
    for (const [exId, exSets] of Object.entries(groups)) {
      const ex = await db.exercises.get(Number(exId));
      result.push({ exerciseId: Number(exId), name: ex?.name ?? 'Exercise', sets: exSets });
    }
    return result;
  }, [workoutId]) ?? [];
}
