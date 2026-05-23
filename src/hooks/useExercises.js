import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect } from 'react';
import { db } from '../db/db.js';
import { syncExercises, seedDatabase } from '../utils/wger.js';

export function useExercises({ muscleGroup = null, search = '' } = {}) {
  // Seed DB on first mount if empty, then kick off background Wger sync
  useEffect(() => {
    seedDatabase().then(() => syncExercises());
  }, []);

  const exercises = useLiveQuery(async () => {
    let query = db.exercises;
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
