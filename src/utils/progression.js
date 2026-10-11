// Auto progressive-overload. A routine can carry a progression scheme; after a
// session logged against that routine each exercise's target advances: complete
// the prescription (enough sets at the target weight, each at the target reps)
// → raise the target by one step; miss → hold, and in 'linear' mode after
// `deloadAfterMisses` consecutive misses → deload 10%. Bodyweight targets
// (weight 0) progress reps instead. Forward-only: it edits routine *targets*
// (suggestions), never workout history, so deleting a past workout never needs
// to un-bump. Pure + unit-tested.
//
// Targets are stored in kg, but they are lifted in the user's unit. Stepping
// 2.5 kg at a time for someone who loads 5 lb plates produced targets nobody
// can put on a bar (135 → 140.5 → 146.01 lb), logging the number on screen
// could count as a miss (140.5 lb comes back as a hair under the stored kg),
// and a 10% deload landed on 92.25 kg. So every step happens in the display
// unit, raised targets land on that unit's plate grid, deloads round *down* to
// it, and "did you lift the target" allows for kg↔lb rounding.

import { LB_PER_KG } from './units.js';

export const PROGRESSION_MODES = ['off', 'linear', 'double'];
export const PROGRESSION_DEFAULTS = { mode: 'off', weightStep: 2.5, deloadAfterMisses: 2 };

/**
 * How far under the target (kg) a set may be and still count as "at" it.
 * A logged weight goes kg → lb → kg on its way through the display, and the
 * round trip loses a few thousandths. Same allowance as a record (records.js).
 */
export const AT_TARGET_KG = 0.01;

/** The plate grid targets snap to, in display units: a pair of the smallest common plates. */
export const UNIT_GRID = { kg: 2.5, lbs: 5 };

const isLbs = (unit) => unit === 'lbs';
const toUnit = (kg, unit) => (isLbs(unit) ? kg * LB_PER_KG : kg);
const fromUnit = (v, unit) => (isLbs(unit) ? v / LB_PER_KG : v);
// Six places keeps a grid point exact through toDisplay's two-place rounding
// (140 lb → 63.502931 kg → 140.00 lb) without carrying float dust around.
const roundKg = (kg) => Math.round(kg * 1e6) / 1e6;
const trim = (n) => String(Math.round(n * 100) / 100);

/**
 * A scheme's step (stored in kg) as the jump a lifter in `unit` actually makes.
 *
 * kg users take it as written. For pounds the conventional equivalents apply
 * — 2.5 kg ↔ 5 lb, 5 kg ↔ 10 lb, 1.25 kg ↔ 2.5 lb — i.e. the nearest multiple
 * of 2.5 lb, never less than one. A literal conversion (5.51 lb) is a jump no
 * plate set can make.
 */
export function stepInUnit(stepKg = PROGRESSION_DEFAULTS.weightStep, unit = 'kg') {
  const s = Number(stepKg) > 0 ? Number(stepKg) : PROGRESSION_DEFAULTS.weightStep;
  if (!isLbs(unit)) return s;
  return Math.max(2.5, Math.round((s * LB_PER_KG) / 2.5) * 2.5);
}

/**
 * The grid (display units) a target snaps to: the unit's standard increment,
 * or the step itself when that is finer (a 1 kg step for small isolation work
 * must not be swallowed by a 2.5 kg grid).
 */
export function gridInUnit(stepKg, unit = 'kg') {
  return Math.min(UNIT_GRID[isLbs(unit) ? 'lbs' : 'kg'], stepInUnit(stepKg, unit));
}

/** "+2.5 kg" / "+5 lb" — the step as the builder and the routine card say it. */
export function stepLabel(stepKg, unit = 'kg') {
  return `+${trim(stepInUnit(stepKg, unit))} ${isLbs(unit) ? 'lb' : 'kg'}`;
}

/** Raise a kg target by one step in `unit`, landing on the unit's grid. */
export function raiseTarget(targetKg, stepKg, unit = 'kg') {
  const step = stepInUnit(stepKg, unit);
  const grid = gridInUnit(stepKg, unit);
  const cur = toUnit(Number(targetKg) || 0, unit);
  let next = Math.round((cur + step) / grid) * grid;
  // Can't happen while step ≥ grid (rounding moves at most half a grid), but a
  // "raise" that doesn't raise would be a silent stall.
  if (next <= cur + 1e-9) next += grid;
  return roundKg(fromUnit(next, unit));
}

/**
 * Take 10% off a kg target, rounded DOWN to the unit's grid — a deload you
 * cannot load is not a deload. Returns null when there's no lower grid point
 * (a target already at or under one increment).
 */
export function deloadTarget(targetKg, stepKg, unit = 'kg') {
  const grid = gridInUnit(stepKg, unit);
  const cur = toUnit(Number(targetKg) || 0, unit);
  const next = Math.floor((cur * 0.9) / grid + 1e-9) * grid;
  if (next <= 0 || next >= cur - 1e-9) return null;
  return roundKg(fromUnit(next, unit));
}

/**
 * Did this session complete the prescription?
 *
 * Pass iff at least `targetSets` sets were at the target weight (within
 * rounding) AND reached the target reps. Counting is the point: "every set hit
 * its reps and one of them touched the weight" let one top set plus four light
 * back-offs advance a 5×5, while "every set must hit the reps" failed a full
 * 5×5 because of one extra back-off triple at the end.
 */
export function completedPrescription(sets, { targetSets, targetReps, targetWeight }) {
  const weightOk = (s) => targetWeight <= 0 || (Number(s.weight) || 0) >= targetWeight - AT_TARGET_KG;
  const repsNeeded = Math.max(1, targetReps || 0);
  const done = (sets ?? []).filter((s) => weightOk(s) && (Number(s.reps) || 0) >= repsNeeded).length;
  return done >= Math.max(1, targetSets || 0);
}

// current: { targetSets, targetReps, targetWeight (kg), misses }.
// workingSets: [{ weight (kg), reps }]. opts.unit: the user's display unit.
// Returns the next target + `action` ('increase' | 'hold' | 'deload' | 'off').
export function decideProgression(current = {}, workingSets = [], scheme = {}, { unit = 'kg' } = {}) {
  const cfg = { ...PROGRESSION_DEFAULTS, ...scheme };
  const targetSets = current.targetSets ?? null;
  const targetReps = current.targetReps ?? null;
  const targetWeight = current.targetWeight ?? null;
  const misses = current.misses ?? 0;
  const sets = (workingSets ?? []).filter(Boolean);

  if (cfg.mode === 'off' || !sets.length) {
    return { targetSets, targetReps, targetWeight, misses, action: 'off' };
  }

  // A routine row with no weight yet adopts the heaviest weight of the session.
  // Blank sets/reps adopt what was done at that weight, so a loose target is
  // judged against itself rather than against a number nobody chose.
  const hadTarget = targetWeight != null;
  const tWeight = targetWeight ?? Math.max(0, ...sets.map((s) => Number(s.weight) || 0));
  const heavy = sets.filter((s) => tWeight <= 0 || (Number(s.weight) || 0) >= tWeight - AT_TARGET_KG);
  const tReps = targetReps ?? (heavy.length ? Math.min(...heavy.map((s) => Number(s.reps) || 0)) : 0);
  const tSets = targetSets ?? Math.max(1, heavy.length);

  if (completedPrescription(sets, { targetSets: tSets, targetReps: tReps, targetWeight: tWeight })) {
    // Bodyweight (no external load) progresses reps instead of weight.
    if (tWeight <= 0) {
      return { targetSets: tSets, targetReps: tReps + 1, targetWeight: 0, misses: 0, action: 'increase' };
    }
    // Step from what the full prescription was actually done at: 5×5 at 105
    // against a target of 100 means next time is 107.5, not 102.5.
    const qualifying = heavy
      .filter((s) => (Number(s.reps) || 0) >= Math.max(1, tReps))
      .map((s) => Number(s.weight) || 0)
      .sort((a, b) => b - a);
    const base = Math.max(tWeight, qualifying[tSets - 1] ?? tWeight);
    return { targetSets: tSets, targetReps: tReps, targetWeight: raiseTarget(base, cfg.weightStep, unit), misses: 0, action: 'increase' };
  }

  // No target to miss yet: this session sets the baseline.
  if (!hadTarget) {
    return { targetSets: tSets, targetReps: tReps, targetWeight: tWeight, misses: 0, action: 'hold' };
  }

  const nextMisses = misses + 1;
  if (cfg.mode === 'linear' && nextMisses >= cfg.deloadAfterMisses && tWeight > 0) {
    const deloaded = deloadTarget(tWeight, cfg.weightStep, unit);
    if (deloaded != null) {
      return { targetSets: tSets, targetReps: tReps, targetWeight: deloaded, misses: 0, action: 'deload' };
    }
    // Already at the bottom of the grid — nowhere lower to go; start counting again.
    return { targetSets: tSets, targetReps: tReps, targetWeight: tWeight, misses: 0, action: 'hold' };
  }
  // 'double' progression never deloads on a miss — it just holds to build reps.
  return { targetSets: tSets, targetReps: tReps, targetWeight: tWeight, misses: cfg.mode === 'linear' ? nextMisses : 0, action: 'hold' };
}
