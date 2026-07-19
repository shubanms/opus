import { db } from '../db/db.js';

// Sticky coaching note per exercise (one per exercise, upserted).
export async function setExerciseNote(exerciseId, text) {
  const existing = await db.exerciseNotes.where('exerciseId').equals(exerciseId).first();
  const trimmed = (text ?? '').trim();
  if (existing) {
    if (!trimmed) await db.exerciseNotes.delete(existing.id);
    else await db.exerciseNotes.update(existing.id, { text: trimmed, updatedAt: Date.now() });
  } else if (trimmed) {
    await db.exerciseNotes.add({ exerciseId, text: trimmed, updatedAt: Date.now() });
  }
}

// Whole-session note on a saved workout.
export async function setWorkoutNote(workoutId, notes) {
  await db.workouts.update(workoutId, { notes: notes ?? '' });
}

// Color label on a saved workout (token name or null).
export async function setWorkoutColor(workoutId, color) {
  await db.workouts.update(workoutId, { color: color ?? null });
}

// Rename a saved workout. Empty names are ignored (a workout always has a name).
export async function setWorkoutName(workoutId, name) {
  const trimmed = (name ?? '').trim();
  if (trimmed) await db.workouts.update(workoutId, { name: trimmed });
}

// Muscle-group tags on a saved workout (array of tag strings; unindexed field).
export async function setWorkoutTags(workoutId, tags) {
  await db.workouts.update(workoutId, { tags: Array.isArray(tags) ? tags : [] });
}

// Per-set note on a saved set.
export async function setSetNote(setId, note) {
  await db.sets.update(setId, { note: (note ?? '').trim() || null });
}
