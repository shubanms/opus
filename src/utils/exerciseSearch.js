// Finding an exercise by typing. Pure + unit-tested; shared by the Exercises
// page, and exported for every other picker.
//
// The old filter was `name.toLowerCase().includes(query.toLowerCase())`, and an
// Android keyboard's autocomplete adds a space after every word — so "squat "
// found nothing, and so did "press bench", "dumbbell chest" and "glutes".
// Every word now has to match somewhere (name, muscle, equipment, or the names
// people actually call the muscles), in any order, accents ignored.

/** Lowercase, accents stripped, whitespace collapsed and trimmed. */
export function normalize(text) {
  return String(text ?? '')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/** The words of a query, normalized. "  Squat " → ["squat"]. */
export function queryWords(query) {
  const q = normalize(query);
  return q ? q.split(' ') : [];
}

// What people type for a muscle group, beyond its own token.
const MUSCLE_WORDS = {
  chest: 'pecs pectorals',
  triceps: 'tris arms',
  biceps: 'bis arms',
  forearm: 'forearms grip arms',
  'front-deltoids': 'front delts shoulders',
  'back-deltoids': 'rear delts shoulders',
  'upper-back': 'lats back',
  'lower-back': 'lower back erectors',
  trapezius: 'traps',
  abs: 'abdominals core',
  obliques: 'core',
  quadriceps: 'quads legs',
  hamstring: 'hamstrings hams legs',
  gluteal: 'glutes butt legs',
  calves: 'calf legs',
};

function haystack(ex) {
  const muscle = ex?.muscleGroup ?? '';
  return normalize([ex?.name, muscle.replace(/-/g, ' '), MUSCLE_WORDS[muscle], ex?.equipment].filter(Boolean).join(' '));
}

/** Does every word of `query` appear in the exercise's name, muscle or equipment? */
export function matchesExercise(ex, query) {
  const words = Array.isArray(query) ? query : queryWords(query);
  if (!words.length) return true;
  const hay = haystack(ex);
  return words.every((w) => hay.includes(w));
}

/**
 * Filter (and lightly rank) a list. Exercises whose NAME carries every word
 * come first — "chest" should open on Chest Dip before every pec exercise in
 * alphabetical order — otherwise the incoming order is kept.
 */
export function searchExercises(list, query) {
  const words = queryWords(query);
  const all = list ?? [];
  if (!words.length) return all;
  const byName = [];
  const other = [];
  for (const ex of all) {
    if (!matchesExercise(ex, words)) continue;
    const name = normalize(ex?.name);
    (words.every((w) => name.includes(w)) ? byName : other).push(ex);
  }
  return [...byName, ...other];
}

/**
 * The exercise in `list` already called `name` (trimmed, case- and
 * accent-insensitive), other than `excludeId`; null if the name is free. Two
 * "Bench Press" rows split history between them and broke program installs.
 */
export function findNameClash(list, name, excludeId = null) {
  const wanted = normalize(name);
  if (!wanted) return null;
  return (list ?? []).find((ex) => ex && ex.id !== excludeId && normalize(ex.name) === wanted) ?? null;
}
