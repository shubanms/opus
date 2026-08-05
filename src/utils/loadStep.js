// How much the weight field should move per tap, and what to prefill it with.
//
// Logging a set was: tap the weight field, type, tap reps, type, tap log —
// twenty to thirty times a session, with chalky hands, between sets. Almost
// every set is the same as the one before it or a small step up from it, so the
// typing was work the app could have done.

/**
 * The smallest jump you can actually make on a barbell.
 *
 * A pair of the lightest plates you own — one per side, because a barbell is
 * loaded symmetrically. Offering 1 kg steps when your lightest plate is 2.5 kg
 * would produce numbers you cannot load.
 */
export function smallestIncrement(plates, fallback = 2.5) {
  const usable = (plates ?? []).map(Number).filter((p) => Number.isFinite(p) && p > 0);
  if (!usable.length) return fallback;
  return Math.min(...usable) * 2;
}

/**
 * Nudge a weight by one increment, snapped to the increment grid.
 *
 * Snapping matters: starting from a prefilled 62.5 with a 5 kg step, a naive
 * add gives 67.5. Rounding to the grid first gives 65 — the number a person
 * would have reached for.
 */
export function stepWeight(current, direction, increment = 2.5) {
  const inc = Number(increment) > 0 ? Number(increment) : 2.5;
  const n = Number(current);
  const base = Number.isFinite(n) && n > 0 ? n : 0;

  // Off-grid values snap toward the direction of travel rather than jumping a
  // full step past the nearest sensible number.
  const grid = direction > 0 ? Math.floor(base / inc) : Math.ceil(base / inc);
  const next = (grid + direction) * inc;
  return Math.max(0, Math.round(next * 100) / 100);
}

/**
 * What to put in the fields before you type anything.
 *
 * This session's last set wins over last session's: once you have decided
 * today's working weight, that is the number you are repeating. Warm-ups are
 * skipped — prefilling the bar after a warm-up set would be actively wrong.
 */
export function prefillFrom(currentSets, previousSets) {
  const pick = (sets) => {
    const working = (sets ?? []).filter((s) => s && !s.isWarmup && (s.weight > 0 || s.reps > 0));
    return working.length ? working[working.length - 1] : null;
  };
  const source = pick(currentSets) ?? pick(previousSets);
  if (!source) return null;
  return { weight: source.weight ?? 0, reps: source.reps ?? 0 };
}
