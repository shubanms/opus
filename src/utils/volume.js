import { db } from '../db/db.js';

// Effective load for a set: bodyweight exercises add the trainee's bodyweight
// to any added weight; everything else is just the loaded weight.
export function setLoad(weight, isBodyweight, bodyweightKg) {
  const base = isBodyweight ? (bodyweightKg || 0) + (weight || 0) : (weight || 0);
  return base;
}

// Total working-set volume (kg) for a list of sets, counting bodyweight.
// Looks up each exercise's equipment once.
export async function computeVolume(sets, bodyweightKg) {
  const working = sets.filter((s) => !s.isWarmup);
  if (!working.length) return 0;
  const exIds = [...new Set(working.map((s) => s.exerciseId))];
  const isBw = {};
  for (const id of exIds) {
    const ex = await db.exercises.get(id);
    isBw[id] = ex?.equipment === 'bodyweight';
  }
  let total = 0;
  for (const s of working) {
    total += setLoad(s.weight, isBw[s.exerciseId], bodyweightKg) * (s.reps || 0);
  }
  return Math.round(total);
}
