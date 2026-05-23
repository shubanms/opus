import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db.js';

async function loadExercises(templateId) {
  const links = await db.templateExercises
    .where('templateId').equals(templateId).sortBy('orderIndex');
  const exercises = [];
  for (const link of links) {
    const ex = await db.exercises.get(link.exerciseId);
    if (ex) {
      exercises.push({
        ...ex,
        targetSets: link.targetSets ?? null,
        targetReps: link.targetReps ?? null,
        targetWeight: link.targetWeight ?? null,
      });
    }
  }
  return exercises;
}

// All templates (newest first) with their exercise details + targets joined in.
export function useTemplatesWithExercises() {
  return useLiveQuery(async () => {
    const templates = await db.templates.orderBy('createdAt').reverse().toArray();
    const result = [];
    for (const t of templates) {
      result.push({ ...t, exercises: await loadExercises(t.id) });
    }
    return result;
  }, []) ?? [];
}

// Today's recommendation: assigned template, rest day, or fresh start.
export function useToday() {
  return useLiveQuery(async () => {
    const todayDow = new Date().getDay();
    const today = new Date().toISOString().slice(0, 10);

    // Consecutive training days ending today.
    const workouts = await db.workouts.toArray();
    const dates = new Set(workouts.map((w) => w.date));
    let consec = 0;
    let cursor = today;
    while (dates.has(cursor)) {
      consec++;
      cursor = new Date(new Date(cursor).getTime() - 86400000).toISOString().slice(0, 10);
    }
    if (consec >= 3) {
      return { type: 'rest', reason: `${consec} days trained in a row — let your body recover.` };
    }

    const assigned = await db.templates.where('dayOfWeek').equals(todayDow).first();
    if (assigned) {
      return {
        type: 'template',
        template: { ...assigned, exercises: await loadExercises(assigned.id) },
        reason: 'On your plan for today',
      };
    }

    return { type: 'fresh', reason: 'No plan today — start fresh.' };
  }, []) ?? { type: 'fresh', reason: '' };
}
