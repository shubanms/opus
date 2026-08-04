import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect } from 'react';
import { db } from '../db/db.js';
import { seedDatabase } from '../utils/wger.js';

export function useExercises({ muscleGroup = null, search = '' } = {}) {
  useEffect(() => {
    seedDatabase();
  }, []);

  const exercises = useLiveQuery(async () => {
    const query = db.exercises;
    if (muscleGroup) {
      return query.where('muscleGroup').equals(muscleGroup).sortBy('name');
    }
    const all = await query.orderBy('name').toArray();
    if (!search) return all;
    const q = search.toLowerCase();
    return all.filter(e => e.name.toLowerCase().includes(q));
  }, [muscleGroup, search]);

  return exercises ?? [];
}

export function useExercise(id) {
  return useLiveQuery(() => (id ? db.exercises.get(id) : null), [id]);
}

// Sticky coaching note text for an exercise ('' if none).
export function useExerciseNote(id) {
  return useLiveQuery(
    () => (id ? db.exerciseNotes.where('exerciseId').equals(id).first().then((n) => n?.text ?? '') : ''),
    [id]
  ) ?? '';
}
