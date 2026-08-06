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
  const exercise = await db.exercises.get(exerciseId);
  if (!exercise || !exercise.isCustom) return null;

  const sets = await db.sets.where('exerciseId').equals(exerciseId).toArray();
  const prs = await db.prs.where('exerciseId').equals(exerciseId).toArray();
  const links = await db.templateExercises.where('exerciseId').equals(exerciseId).toArray();
  const affectedWorkouts = [...new Set(sets.map((s) => s.workoutId))];

  await db.sets.where('exerciseId').equals(exerciseId).delete();
  await db.prs.where('exerciseId').equals(exerciseId).delete();
  await db.templateExercises.where('exerciseId').equals(exerciseId).delete();
  await db.exercises.delete(exerciseId);

  for (const wId of affectedWorkouts) await recomputeWorkoutTotals(wId);
  return { exercise, sets, prs, links };
}

/**
 * Put a deleted custom exercise back, with the history that went with it.
 *
 * This is the heaviest of the restores: deleting a custom lift takes its sets
 * out of workouts that still exist, so the totals on those workouts have to be
 * recomputed on the way back as well as on the way out.
 */
export async function restoreCustomExercise(snapshot) {
  if (!snapshot?.exercise) return;
  await db.exercises.put(snapshot.exercise);
  if (snapshot.sets?.length) await db.sets.bulkPut(snapshot.sets);
  if (snapshot.prs?.length) await db.prs.bulkPut(snapshot.prs);
  if (snapshot.links?.length) await db.templateExercises.bulkPut(snapshot.links);
  const affected = [...new Set((snapshot.sets ?? []).map((s) => s.workoutId))];
  for (const wId of affected) await recomputeWorkoutTotals(wId);
}
