// Working-set volume math — framework-agnostic (no DB). The web util
// (src/utils/volume.js) looks equipment up from Dexie; here the caller passes an
// `isBodyweight` predicate so the same math serves web (Dexie) and native
// (SQLite). Weights are kg, per the project rule.

// Effective load for a set: bodyweight exercises add the trainee's bodyweight to
// any added weight; everything else is just the loaded weight.
export function setLoad(weight, isBodyweight, bodyweightKg) {
  return isBodyweight ? (bodyweightKg || 0) + (weight || 0) : (weight || 0);
}

// Total working-set volume (kg) for a list of sets, counting bodyweight.
// `isBodyweight` may be a predicate `(exerciseId) => boolean`, a Set of
// bodyweight exerciseIds, or an object map `{ [exerciseId]: boolean }`.
export function computeVolume(sets, bodyweightKg, isBodyweight) {
  const isBw = toPredicate(isBodyweight);
  let total = 0;
  for (const s of sets || []) {
    if (s.isWarmup) continue;
    total += setLoad(s.weight, isBw(s.exerciseId), bodyweightKg) * (s.reps || 0);
  }
  return Math.round(total);
}

function toPredicate(isBodyweight) {
  if (typeof isBodyweight === 'function') return isBodyweight;
  if (isBodyweight instanceof Set) return (id) => isBodyweight.has(id);
  if (isBodyweight && typeof isBodyweight === 'object') return (id) => !!isBodyweight[id];
  return () => false;
}
