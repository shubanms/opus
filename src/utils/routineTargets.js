// Routine targets read off logged sets. Pure + unit-tested; used when a
// finished session is saved as a routine and by the builder's "Fill from last
// session".

/**
 * targetSets = working-set count, targetReps = median reps, targetWeight =
 * top working-set weight (kg). Warm-ups and cardio don't count. Fields are null
 * when the sets don't say (no reps logged, bodyweight only, …).
 */
export function targetsFromSets(sets) {
  const working = (sets ?? []).filter((s) => s && !s.isWarmup && !s.isCardio);
  const reps = working.map((s) => Number(s.reps) || 0).filter((n) => n > 0).sort((a, b) => a - b);
  const median = reps.length ? reps[Math.floor(reps.length / 2)] : null;
  const maxWeight = working.reduce((m, s) => Math.max(m, Number(s.weight) || 0), 0);
  return {
    targetSets: working.length || null,
    targetReps: median,
    targetWeight: maxWeight > 0 ? maxWeight : null,
  };
}

/**
 * The sets of the most recent session among `sets` (all of one exercise),
 * ordered by set number. "Most recent" goes by the workout's date then save
 * time — not the workout id, which an import or a restore can reorder.
 * Returns { workout, sets } or null.
 */
export function lastSession(sets, workouts) {
  const wById = new Map((workouts ?? []).filter(Boolean).map((w) => [w.id, w]));
  let latest = null;
  for (const s of sets ?? []) {
    const w = wById.get(s?.workoutId);
    if (!w) continue;
    if (
      !latest ||
      String(w.date ?? '') > String(latest.date ?? '') ||
      (w.date === latest.date && (w.createdAt ?? 0) > (latest.createdAt ?? 0))
    ) latest = w;
  }
  if (!latest) return null;
  const own = sets
    .filter((s) => s?.workoutId === latest.id)
    .sort((a, b) => (a.setNumber ?? 0) - (b.setNumber ?? 0) || (a.completedAt ?? 0) - (b.completedAt ?? 0));
  return { workout: latest, sets: own };
}

/**
 * May "Save as routine" refresh this routine in place? Only one it wrote
 * itself (`source: 'auto'`) under the same key.
 *
 * It used to match any routine with that autoKey, and Plan week stored the
 * same bare keys ('push', 'legs', 'full-body'…), so finishing a quick-start
 * push session — "Save as routine" is ticked by default — replaced a planned
 * Push A's six exercises with the session's three. Rows from before `source`
 * existed qualify only without a weekday: Plan week always assigned one.
 */
export function canRefreshRoutine(template, autoKey) {
  if (!template || !autoKey || template.autoKey !== autoKey) return false;
  if (template.source === 'auto') return true;
  return template.source == null && template.dayOfWeek == null;
}

const sameWeight = (a, b) => (a == null && b == null) || (a != null && b != null && Math.abs(a - b) < 0.01);

/**
 * Are two routine rows the same lift in lockstep — same exercise, same sets ×
 * reps, same target weight? Routines installed together from one program share
 * progress on such a lift: StrongLifts' squat is one squat across Monday,
 * Wednesday and Friday, so passing it on Monday raises Wednesday's too. A
 * different prescription (GZCLP's 5×3 vs 3×10 squat) or a weight you set by
 * hand on one day keeps them apart.
 */
export function sameLiftInStep(a, b) {
  if (!a || !b || a.exerciseId !== b.exerciseId) return false;
  return (a.targetSets ?? null) === (b.targetSets ?? null) &&
    (a.targetReps ?? null) === (b.targetReps ?? null) &&
    sameWeight(a.targetWeight ?? null, b.targetWeight ?? null);
}
