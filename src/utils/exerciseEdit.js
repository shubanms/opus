// Creating and editing custom exercises. Not pure — this writes the database.
//
// A custom exercise could be added but never changed: a typo in the name, or
// the wrong muscle group (which feeds the muscle maps, weekly sets and the
// generator), was permanent short of deleting it with its whole history. And
// nothing stopped a second "Bench Press": two rows with one name split your
// history between them, and a program install picked whichever came last.
//
// Names are compared trimmed, case- and accent-insensitive (exerciseSearch's
// `findNameClash`), against the whole catalogue — stock rows included. Editing
// is safe for derived data: sets, records and routines point at the id, and
// muscle totals are computed from the current row when they're read.

import { db } from '../db/db.js';
import { findNameClash } from './exerciseSearch.js';

export const EQUIPMENT = ['barbell', 'dumbbell', 'bodyweight', 'cable', 'machine'];

/** Thrown for a name that is empty or already taken; `.message` is user-facing. */
export class ExerciseNameError extends Error {
  constructor(message, clash = null) {
    super(message);
    this.name = 'ExerciseNameError';
    this.clash = clash;
  }
}

function cleanName(name) {
  return String(name ?? '').replace(/\s+/g, ' ').trim();
}

async function assertNameFree(name, excludeId = null) {
  if (!name) throw new ExerciseNameError('Name is required.');
  const clash = findNameClash(await db.exercises.toArray(), name, excludeId);
  if (clash) throw new ExerciseNameError(`“${clash.name}” is already in your library.`, clash);
}

/** Add a custom exercise. Returns its id; throws ExerciseNameError for a bad name. */
export async function createCustomExercise({ name, muscleGroup, equipment }) {
  const clean = cleanName(name);
  return db.transaction('rw', db.exercises, async () => {
    await assertNameFree(clean);
    return db.exercises.add({
      name: clean,
      muscleGroup,
      equipment,
      secondaryMuscles: [],
      description: '',
      isCustom: true,
      wgerId: null,
    });
  });
}

/**
 * Edit a custom exercise's name, muscle group and equipment. Stock exercises
 * are not editable (they're re-seeded and shared by every backup). Throws
 * ExerciseNameError for a bad name; returns false when there's nothing to edit.
 */
export async function updateCustomExercise(id, { name, muscleGroup, equipment }) {
  const clean = cleanName(name);
  return db.transaction('rw', db.exercises, async () => {
    const ex = await db.exercises.get(id);
    if (!ex || !ex.isCustom) return false;
    await assertNameFree(clean, id);
    await db.exercises.update(id, { name: clean, muscleGroup, equipment });
    return true;
  });
}
