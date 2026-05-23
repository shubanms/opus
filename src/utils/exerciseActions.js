import { db } from '../db/db.js';

async function recomputeWorkoutTotals(workoutId) {
  const sets = (await db.sets.where('workoutId').equals(workoutId).toArray()).filter((s) => !s.isWarmup);
  await db.workouts.update(workoutId, {
    totalVolume: Math.round(sets.reduce((a, s) => a + s.weight * s.reps, 0)),
    totalSets: sets.length,
  });
}

// Fully removes a custom exercise: library entry, its logged sets, PRs,
// template references, and refreshes affected workout totals.
export async function deleteCustomExercise(exerciseId) {
  const ex = await db.exercises.get(exerciseId);
  if (!ex || !ex.isCustom) return false;

  const sets = await db.sets.where('exerciseId').equals(exerciseId).toArray();
  const affectedWorkouts = [...new Set(sets.map((s) => s.workoutId))];

  await db.sets.where('exerciseId').equals(exerciseId).delete();
  await db.prs.where('exerciseId').equals(exerciseId).delete();
  await db.templateExercises.where('exerciseId').equals(exerciseId).delete();
  await db.exercises.delete(exerciseId);

  for (const wId of affectedWorkouts) await recomputeWorkoutTotals(wId);
  return true;
}
