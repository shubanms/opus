import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db.js';

// All templates (newest first) with their exercise details joined in.
export function useTemplatesWithExercises() {
  return useLiveQuery(async () => {
    const templates = await db.templates.orderBy('createdAt').reverse().toArray();
    const result = [];
    for (const t of templates) {
      const links = await db.templateExercises
        .where('templateId').equals(t.id).sortBy('orderIndex');
      const exercises = [];
      for (const link of links) {
        const ex = await db.exercises.get(link.exerciseId);
        if (ex) exercises.push(ex);
      }
      result.push({ ...t, exercises });
    }
    return result;
  }, []) ?? [];
}
