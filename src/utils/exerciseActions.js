import { db } from '../db/db.js';
import { computeVolume } from './volume.js';

export async function toggleFavorite(exerciseId) {
  const ex = await db.exercises.get(exerciseId);
  if (ex) await db.exercises.update(exerciseId, { favorite: !ex.favorite });
}

export async function setExerciseColor(exerciseId, color) {
  await db.exercises.update(exerciseId, { color: color ?? null });
}

async function recomputeWorkoutTotals(workoutId) {
  const workout = await db.workouts.get(workoutId);
  const sets = (await db.sets.where('workoutId').equals(workoutId).toArray()).filter((s) => !s.isWarmup);
  await db.workouts.update(workoutId, {
    totalVolume: await computeVolume(sets, workout?.bodyweightKg),
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
