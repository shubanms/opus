import { db } from '../db/db.js';

// Deletes a completed workout and its logged sets.
export async function deleteWorkout(workoutId) {
  await db.sets.where('workoutId').equals(workoutId).delete();
  await db.workouts.delete(workoutId);
}
