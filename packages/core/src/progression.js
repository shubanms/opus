// Auto progressive-overload. A routine can carry a progression scheme; after a
// session logged against that routine each exercise's target advances: hit all
// working sets at/above target reps (at the target weight) → bump the target
// weight by the step; miss → hold, and in 'linear' mode after `deloadAfterMisses`
// consecutive misses → deload 10%. Bodyweight targets (weight 0) progress reps.
// Forward-only: it edits routine *targets* (suggestions), never workout history,
// so deleting a past workout never needs to un-bump. Pure + unit-tested.

export const PROGRESSION_MODES = ['off', 'linear', 'double'];
export const PROGRESSION_DEFAULTS = { mode: 'off', weightStep: 2.5, deloadAfterMisses: 2 };

const round = (n) => Math.round(n * 100) / 100;

// current: { targetSets, targetReps, targetWeight, misses }. workingSets: [{ weight, reps }].
// Returns the next target + `action` ('increase' | 'hold' | 'deload' | 'off').
export function decideProgression(current = {}, workingSets = [], scheme = {}) {
  const cfg = { ...PROGRESSION_DEFAULTS, ...scheme };
  const targetSets = current.targetSets ?? null;
  const targetReps = current.targetReps ?? null;
  const targetWeight = current.targetWeight ?? null;
  const misses = current.misses ?? 0;

  if (cfg.mode === 'off' || !workingSets.length) {
    return { targetSets, targetReps, targetWeight, misses, action: 'off' };
  }

  const tReps = targetReps ?? Math.min(...workingSets.map((s) => s.reps || 0));
  const tSets = targetSets ?? workingSets.length;
  const tWeight = targetWeight ?? Math.max(0, ...workingSets.map((s) => s.weight || 0));

  const enoughSets = workingSets.length >= tSets;
  const allHitReps = workingSets.every((s) => (s.reps || 0) >= tReps);
  const atWeight = tWeight <= 0 || workingSets.some((s) => (s.weight || 0) >= tWeight - 1e-9);

  if (enoughSets && allHitReps && atWeight) {
    // Bodyweight (no external load) progresses reps instead of weight.
    if (tWeight <= 0) {
      return { targetSets: tSets, targetReps: tReps + 1, targetWeight: 0, misses: 0, action: 'increase' };
    }
    return { targetSets: tSets, targetReps: tReps, targetWeight: round(tWeight + cfg.weightStep), misses: 0, action: 'increase' };
  }

  const nextMisses = misses + 1;
  if (cfg.mode === 'linear' && nextMisses >= cfg.deloadAfterMisses && tWeight > 0) {
    return { targetSets: tSets, targetReps: tReps, targetWeight: round(tWeight * 0.9), misses: 0, action: 'deload' };
  }
  // 'double' progression never deloads on a miss — it just holds to build reps.
  return { targetSets: tSets, targetReps: tReps, targetWeight: tWeight, misses: cfg.mode === 'linear' ? nextMisses : 0, action: 'hold' };
}
