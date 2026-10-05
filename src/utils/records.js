// What counts as a personal record, in one place.
//
// Three copies of this logic had drifted apart: the live "PR!" float on the set
// logger, the save path in `completeWorkout`, and `recomputePRs` after a delete.
// Two real faults came out of the drift:
//
// - **Phantom records in pounds.** Weights are stored in kg and shown in lb, so
//   a prefilled 77.5 kg comes back as 170.86 lb and goes in again as 77.50079
//   kg. A strict `>` called that a new record every session you repeated your
//   best. Records now have to beat the old one by more than rounding noise.
// - **Records re-dated to "now".** `recomputePRs` rebuilt each record from the
//   max value but stamped it `Date.now()` with no workout, so deleting any
//   session moved every surviving record of those lifts to today — and with
//   them Hall of Records, Wrapped's monthly count and the PR quest. The record
//   is now taken from the set that actually set it.
//
// Pure + unit-tested.

export const RECORD_TYPES = ['weight', 'reps', 'volume'];

/**
 * How much a value must improve by to count. Comfortably above the error a
 * kg↔lb round trip introduces (< 0.003 kg per kg of load at two decimals) and
 * comfortably below the smallest real step anyone loads (0.25 kg / 0.5 lb).
 * Volume carries the per-kg error times the reps, so it gets more room.
 */
const EPSILON = { weight: 0.01, reps: 0, volume: 0.1 };

/** A set that can hold a record: a real working set with at least one rep. */
export function isRecordSet(s) {
  if (!s || s.isWarmup || s.isCardio) return false;
  const reps = Number(s.reps);
  return Number.isFinite(reps) && reps >= 1;
}

/** The value a set scores for a record type. */
export function recordValue(s, type) {
  const w = Number(s?.weight) || 0;
  const r = Number(s?.reps) || 0;
  if (type === 'weight') return w;
  if (type === 'reps') return r;
  if (type === 'volume') return w * r;
  return 0;
}

/**
 * Does `value` beat the standing record `prev`?
 *
 * With no record yet, anything above zero is a first record — a bodyweight
 * lift (weight 0) never sets a *weight* record, which is the existing rule.
 */
export function beats(value, prev, type) {
  const v = Number(value) || 0;
  if (v <= 0) return false;
  if (prev == null || !Number.isFinite(Number(prev))) return true;
  return v > Number(prev) + (EPSILON[type] ?? 0);
}

/** When a set happened, for ordering: its own timestamp, else its workout's. */
function whenOf(s, workoutTime) {
  const own = Number(s?.completedAt);
  if (Number.isFinite(own) && own > 0) return own;
  const w = Number(workoutTime?.(s?.workoutId));
  return Number.isFinite(w) && w > 0 ? w : 0;
}

/**
 * The set that holds the record for `type`, or null.
 *
 * "Holds" means the *first* set to reach the best value — matching what the
 * live path does, where tying your record is not a new one. Ties within the
 * rounding tolerance count as the same value, so a lb-entered repeat does not
 * steal the date from the set that really set it.
 *
 * `workoutTime(workoutId)` is an optional lookup used when a set has no
 * `completedAt` of its own (older or imported rows).
 */
export function bestSetFor(sets, type, workoutTime) {
  const eligible = (sets ?? []).filter(isRecordSet).filter((s) => recordValue(s, type) > 0);
  if (!eligible.length) return null;
  const max = Math.max(...eligible.map((s) => recordValue(s, type)));
  const tol = EPSILON[type] ?? 0;
  const holders = eligible.filter((s) => recordValue(s, type) >= max - tol);
  holders.sort((a, b) => whenOf(a, workoutTime) - whenOf(b, workoutTime));
  const first = holders[0];
  return { set: first, value: max, achievedAt: whenOf(first, workoutTime) || null };
}

/**
 * Every record an exercise's sets support, shaped like a `prs` row (minus id).
 * `achievedAt` falls back to `fallbackTime` only when nothing better is known.
 */
export function recordsFromSets(exerciseId, sets, { workoutTime, fallbackTime = Date.now() } = {}) {
  const out = [];
  for (const type of RECORD_TYPES) {
    const best = bestSetFor(sets, type, workoutTime);
    if (!best) continue;
    out.push({
      exerciseId,
      type,
      value: best.value,
      achievedAt: best.achievedAt ?? fallbackTime,
      workoutId: best.set.workoutId ?? null,
    });
  }
  return out;
}
