// Estimated one-rep max via the Epley formula: 1RM = w · (1 + reps/30).
// A single rep returns the weight itself. Sets with no external load (pure
// bodyweight) can't be estimated this way and return 0.
export function epley1RM(weight, reps) {
  if (!weight || weight <= 0 || !reps || reps <= 0) return 0;
  if (reps === 1) return weight;
  return weight * (1 + reps / 30);
}

/**
 * The most reps a set can have and still say anything about a single.
 *
 * Epley is a fit to low-rep sets. Past about a dozen reps it is measuring
 * endurance, and it over-reads it: a 70 × 22 back-off set "estimates" 121 kg,
 * beating the 100 × 5 top set (117 kg) that is the real evidence of strength,
 * and became the headline number.
 */
export const E1RM_MAX_REPS = 12;

/** The estimate one set supports — 0 for warm-ups, cardio, high-rep or unloaded sets. */
export function setEstimate(set) {
  if (!set || set.isWarmup || set.isCardio) return 0;
  const reps = Number(set.reps) || 0;
  if (reps < 1 || reps > E1RM_MAX_REPS) return 0;
  return epley1RM(Number(set.weight) || 0, reps);
}

/**
 * The best estimate in each workout, keyed by workoutId: `{ value, weight, reps }`.
 * Workouts with no estimable set are absent rather than present as zero.
 */
export function sessionEstimates(sets) {
  const out = new Map();
  for (const s of sets ?? []) {
    const value = setEstimate(s);
    if (!(value > 0)) continue;
    const prev = out.get(s.workoutId);
    if (!prev || value > prev.value) out.set(s.workoutId, { value, weight: Number(s.weight), reps: Number(s.reps) });
  }
  return out;
}

/**
 * The all-time best estimate and the set behind it, or null.
 *
 * Separate from the per-session series on purpose: the chart shows the last
 * few sessions, and "best" taken from that window quietly forgot every peak
 * older than ten sessions.
 */
export function bestEstimate(sets) {
  let best = null;
  for (const [workoutId, e] of sessionEstimates(sets)) {
    if (!best || e.value > best.value) best = { ...e, workoutId };
  }
  return best;
}
