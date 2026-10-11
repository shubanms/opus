import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect } from 'react';
import { db } from '../db/db.js';
import { seedDatabase } from '../utils/wger.js';
import { searchExercises } from '../utils/exerciseSearch.js';
import { buildExerciseHistory } from '../utils/exerciseHistory.js';

const EMPTY = [];

/**
 * The catalogue, filtered by muscle group and/or a search (utils/exerciseSearch
 * — every word must match, trailing spaces and accents ignored). `undefined`
 * while the first query is still loading, so a list can show a skeleton
 * instead of flashing "No exercises found."
 */
export function useExerciseList({ muscleGroup = null, search = '' } = {}) {
  useEffect(() => {
    seedDatabase();
  }, []);

  return useLiveQuery(async () => {
    const list = muscleGroup
      ? await db.exercises.where('muscleGroup').equals(muscleGroup).sortBy('name')
      : await db.exercises.orderBy('name').toArray();
    return searchExercises(list, search);
  }, [muscleGroup, search]);
}

/** As useExerciseList, but always an array (empty while loading). */
export function useExercises(opts) {
  return useExerciseList(opts) ?? EMPTY;
}

/** One exercise: `undefined` while loading, `null` when there is no such exercise. */
export function useExercise(id) {
  return useLiveQuery(async () => {
    if (id == null || !Number.isFinite(Number(id))) return null;
    return (await db.exercises.get(Number(id))) ?? null;
  }, [id]);
}

// Sticky coaching note text for an exercise ('' if none).
export function useExerciseNote(id) {
  return useLiveQuery(
    () => (id ? db.exerciseNotes.where('exerciseId').equals(id).first().then((n) => n?.text ?? '') : ''),
    [id]
  ) ?? '';
}

/**
 * Every session this exercise was logged in, newest first, sets in order and
 * record-setting sets marked (utils/exerciseHistory). `undefined` while loading.
 */
export function useExerciseHistory(id) {
  return useLiveQuery(async () => {
    if (id == null || !Number.isFinite(Number(id))) return [];
    const sets = await db.sets.where('exerciseId').equals(Number(id)).toArray();
    if (!sets.length) return [];
    const workouts = await db.workouts.bulkGet([...new Set(sets.map((s) => s.workoutId))]);
    return buildExerciseHistory(sets, workouts);
  }, [id]);
}
