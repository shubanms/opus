// Finding a stand-in for an exercise you cannot do right now.
//
// Swapping already existed, but it opened the full 82-entry picker and left you
// to search — which is the whole problem, because the moment you need a swap is
// the moment someone else is on the bench and you want to keep moving.
//
// The ranking rests on one observation: you rarely swap because you dislike the
// movement. You swap because the *equipment* is unavailable. So an alternative
// on a different implement is more useful than a near-identical one on the same
// implement, which is the opposite of a naive "most similar" sort.

const DIFFICULTY_ORDER = ['beginner', 'intermediate', 'advanced'];

function difficultyGap(a, b) {
  const i = DIFFICULTY_ORDER.indexOf(a);
  const j = DIFFICULTY_ORDER.indexOf(b);
  if (i < 0 || j < 0) return 1;
  return Math.abs(i - j);
}

/**
 * Score one candidate as a replacement for `current`. Higher is better.
 *
 * Exported for the tests: the ordering rules are the substance of this file,
 * and asserting them through the sorted output alone hides which rule fired.
 */
export function swapScore(current, candidate) {
  let score = 0;
  // The usual reason for swapping: that implement is taken.
  if (candidate.equipment !== current.equipment) score += 3;
  const gap = difficultyGap(current.difficulty, candidate.difficulty);
  if (gap === 0) score += 2;
  else if (gap === 1) score += 1;
  // Something you already train is a safer substitute than something novel.
  if (candidate.favorite) score += 2;
  return score;
}

/**
 * Alternatives for an exercise, best first.
 *
 * Same muscle group is a hard requirement rather than a ranking factor — a
 * "substitute" that trains something else is not a substitute, it is a
 * different workout.
 */
export function rankAlternatives(current, catalogue, { exclude = [], limit = 6 } = {}) {
  if (!current?.muscleGroup) return [];
  const skip = new Set([current.id, ...exclude]);

  return (catalogue ?? [])
    .filter((ex) => ex && !skip.has(ex.id) && ex.muscleGroup === current.muscleGroup)
    .map((ex) => ({ ex, score: swapScore(current, ex) }))
    .sort((a, b) => b.score - a.score || String(a.ex.name).localeCompare(String(b.ex.name)))
    .slice(0, Math.max(0, limit))
    .map((r) => r.ex);
}
