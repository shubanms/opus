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

/** Working sets, in order: no warm-ups, no cardio bouts, nothing empty. */
function workingOf(sets) {
  return (sets ?? []).filter((s) => s && !s.isWarmup && !s.isCardio && (s.weight > 0 || s.reps > 0));
}

/**
 * Last session's working set that lines up with today's set at `index`
 * (0-based, counting today's working sets only).
 *
 * By position, because sets are not interchangeable: the last set of a session
 * is the fatigued one. Prefilling set 1 from it — 77.5 × 7 when you opened at
 * 77.5 × 8 — sets the bar low before you have lifted anything. Past the end of
 * last session (an extra set today) it holds at the last one.
 */
export function alignedPrevious(previousSets, index = 0) {
  const prev = workingOf(previousSets);
  if (!prev.length) return null;
  const i = Math.max(0, Math.min(Number.isInteger(index) ? index : 0, prev.length - 1));
  return prev[i];
}

/**
 * What to put in the fields before you type anything, and why.
 *
 * In order:
 * 1. **This session's last working set** — once you have decided today's
 *    working weight, that is the number you are repeating.
 * 2. **The routine's target** (`targetWeight` / `targetReps`) — when you are
 *    following a plan, the plan is what you should do. Prefilling last
 *    session's numbers instead made "log what's in the box" a missed target,
 *    and with auto-progression on, two of those triggered a deload.
 * 3. **Last session, aligned by position** — today's set N against last
 *    session's working set N.
 *
 * A target can be partial (reps but no weight on a bodyweight move, say): the
 * missing half comes from last session rather than from nothing. Warm-ups never
 * drive a prefill — the empty bar is not your working weight.
 *
 * `source` is 'session' | 'target' | 'last'; null when there is nothing to go on.
 */
export function prefillFrom(currentSets, previousSets, target = null) {
  const today = workingOf(currentSets);
  if (today.length) {
    const s = today[today.length - 1];
    return { weight: s.weight ?? 0, reps: s.reps ?? 0, source: 'session' };
  }

  const prev = alignedPrevious(previousSets, today.length);
  const tw = Number(target?.targetWeight) > 0 ? Number(target.targetWeight) : null;
  const tr = Number(target?.targetReps) > 0 ? Math.round(Number(target.targetReps)) : null;
  if (tw != null || tr != null) {
    return { weight: tw ?? prev?.weight ?? 0, reps: tr ?? prev?.reps ?? 0, source: 'target' };
  }

  if (!prev) return null;
  return { weight: prev.weight ?? 0, reps: prev.reps ?? 0, source: 'last' };
}

// ---------------------------------------------------------------------------
// What a set may contain
//
// "60 kg × 0" logged, earned a PR badge and counted toward the dungeon's set
// objective; a typed "-8" reps became negative volume and negative XP. The
// fields now refuse what a set cannot be, and the store checks again.
// ---------------------------------------------------------------------------

/**
 * A typed rep count: the leading whole number, unsigned — a rep is a whole,
 * positive thing. "8.5" reads as 8, not 85.
 */
export function cleanRepsInput(text) {
  const m = String(text ?? '').replace(/^\D+/, '').match(/^\d+/);
  return m ? m[0].slice(0, 3) : '';
}

/**
 * A typed weight: no sign, no exponent, one decimal point. A decimal comma —
 * what the keypad offers in much of Europe — is read as the point.
 */
export function cleanWeightInput(text) {
  const raw = String(text ?? '').replace(/,/g, '.').replace(/[^\d.]/g, '');
  const dot = raw.indexOf('.');
  const whole = (dot < 0 ? raw : raw.slice(0, dot)).slice(0, 4);
  return dot < 0 ? whole : `${whole}.${raw.slice(dot + 1).replace(/\./g, '').slice(0, 2)}`;
}

/**
 * Whether a strength set can be logged, and its clean numbers. Reps must be a
 * whole number of at least one; weight is zero or more (empty means a
 * bodyweight-only or empty-bar set, not "unknown").
 */
export function checkStrengthSet({ weight, reps } = {}) {
  const r = Number(reps);
  const w = weight === '' || weight == null ? 0 : Number(weight);
  const okReps = Number.isFinite(r) && Number.isInteger(r) && r >= 1;
  const okWeight = Number.isFinite(w) && w >= 0;
  return { ok: okReps && okWeight, weight: okWeight ? w : 0, reps: okReps ? r : 0 };
}
