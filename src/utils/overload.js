// Progressive overload engine — the three levers, in priority order:
//   1. increase reps  2. increase sets  3. increase weight
// sessions: array of past sessions (newest first), each a list of working sets
//           [{ weight, reps }, ...]
import { toDisplay, toKg, unitLabel } from './units.js';
import { daysBetween } from './dateKey.js';

export const OVERLOAD_DEFAULTS = {
  targetReps: 12,
  targetSets: 4,
  weightStep: 2.5,
  startReps: 8,
};

/**
 * The step to suggest, in the display unit.
 *
 * A suggestion has to be a weight you can load. The step used to be a flat
 * 2.5 kg, which in pounds is 5.51 lb — "Step up to 230.5lbs" off a 225 bar.
 * The caller passes the same plate-aware increment the weight stepper uses
 * (`weightStep`, in kg); without one, pounds fall back to a 5 lb pair.
 */
function gridStep(opts, unit) {
  const kg = Number(opts.weightStep);
  if (kg > 0) {
    const shown = Math.round(toDisplay(kg, unit) * 100) / 100;
    if (shown > 0) return shown;
  }
  return unit === 'lbs' ? 5 : OVERLOAD_DEFAULTS.weightStep;
}

/** Nearest point on the grid, in display units. */
function snap(value, step) {
  return Math.round(Math.round(value / step) * step * 100) / 100;
}

/** The next multiple of `step` strictly above `value`, in display units. */
function nextMultiple(value, step) {
  let next = Math.floor((value + step) / step + 1e-9) * step;
  if (next <= value + 1e-9) next += step;
  return Math.round(next * 100) / 100;
}

/**
 * A weight you lifted, offered back as today's.
 *
 * Anything a person types is a multiple of a quarter in their own unit (2.5 lb
 * plates, 1.25 kg plates, 0.5 kg micro-plates), and survives the round trip
 * through kg to within a hundredth. A weight logged in the *other* unit does
 * not — 77.5 kg reads back as 170.86 lb — and that is the number that gets
 * moved onto the grid. An 8 kg dumbbell stays 8 kg rather than becoming the
 * nearest barbell step.
 */
function shownWeight(kg, unit, step) {
  const v = toDisplay(kg, unit);
  const quarters = v * 4;
  if (Math.abs(quarters - Math.round(quarters)) <= 0.024) return Math.round(v * 100) / 100;
  return snap(v, step);
}

export function getOverloadSuggestion(sessions, opts = {}) {
  const cfg = { ...OVERLOAD_DEFAULTS, ...opts };
  const unit = opts.unit ?? 'kg';
  const step = gridStep(opts, unit);
  const label = (shown) => `${Math.round(shown * 10) / 10}${unitLabel(unit)}`;
  const onGrid = (kg) => shownWeight(kg, unit, step);
  const at = (kg) => (kg > 0 ? ` at ${label(onGrid(kg))}` : '');
  const kgOf = (shown) => toKg(shown, unit);

  if (!sessions || sessions.length === 0) {
    return {
      action: 'maintain',
      suggestedReps: cfg.startReps,
      suggestedSets: 3,
      suggestedWeight: null,
      reason: 'Log a session to unlock coaching.',
      confidence: 'low',
    };
  }

  const last = sessions[0].filter((s) => s.reps > 0);
  if (last.length === 0) {
    return {
      action: 'maintain',
      suggestedReps: cfg.startReps,
      suggestedSets: 3,
      suggestedWeight: null,
      reason: 'Hold steady and nail your form this session.',
      confidence: 'low',
    };
  }

  const prev = sessions[1]?.filter((s) => s.reps > 0) ?? [];
  const topWeight = Math.max(...last.map((s) => s.weight), 0);
  const setCount = last.length;
  const minReps = Math.min(...last.map((s) => s.reps));
  const allAtTarget = last.every((s) => s.reps >= cfg.targetReps);
  const prevAllAtTarget = prev.length > 0 && prev.every((s) => s.reps >= cfg.targetReps);
  const prevSetCount = prev.length;
  const topOnGrid = topWeight > 0 ? kgOf(onGrid(topWeight)) : topWeight;

  // Lever 3 — weight: target reps AND target sets for two sessions running
  if (allAtTarget && setCount >= cfg.targetSets && prevAllAtTarget && prevSetCount >= cfg.targetSets) {
    // A barbell goes up by one step from the weight you can already load —
    // added, not rounded up to a multiple: on a 45 lb bar with 5 lb plates the
    // loadable weights are 135, 145, 155. Anything else (dumbbells, a stack)
    // comes in fixed sizes, so it moves to the next one: 8 kg → 10 kg.
    const from = onGrid(topWeight);
    const shown = opts.equipment && opts.equipment !== 'barbell'
      ? nextMultiple(from, step)
      : Math.round((from + step) * 100) / 100;
    return {
      action: 'increase_weight',
      suggestedWeight: kgOf(shown),
      suggestedReps: cfg.startReps,
      suggestedSets: cfg.targetSets,
      reason: `Maxed reps and sets twice over. Step up to ${label(shown)} and drop back to ${cfg.startReps} reps.`,
      confidence: 'high',
    };
  }

  // Lever 2 — sets: hitting target reps with room for another set
  if (allAtTarget && setCount < cfg.targetSets) {
    return {
      action: 'increase_sets',
      suggestedSets: setCount + 1,
      suggestedReps: cfg.targetReps,
      suggestedWeight: topOnGrid,
      reason: `All sets hit ${cfg.targetReps}+ reps. Add set #${setCount + 1}${at(topWeight)}.`,
      confidence: setCount >= cfg.targetSets - 1 ? 'high' : 'medium',
    };
  }

  // Lever 1 — reps: below target, push for more
  if (minReps < cfg.targetReps) {
    const bump = minReps <= cfg.targetReps - 3 ? 2 : 1;
    const goal = Math.min(minReps + bump, cfg.targetReps);
    return {
      action: 'increase_reps',
      suggestedReps: goal,
      suggestedSets: setCount,
      suggestedWeight: topOnGrid,
      reason: `Strong work — push for ${goal} reps${at(topWeight)} today.`,
      confidence: 'medium',
    };
  }

  return {
    action: 'maintain',
    suggestedReps: cfg.targetReps,
    suggestedSets: setCount,
    suggestedWeight: topOnGrid,
    reason: 'Hold steady and nail your form this session.',
    confidence: 'low',
  };
}

// Deload signal: 5+ consecutive training days ending at the most recent workout.
// Local-calendar day keys, so a DST change or a non-UTC timezone cannot split
// two consecutive days into "two days apart".
export function isDeloadDue(workoutDates) {
  if (!workoutDates || workoutDates.length === 0) return false;
  const days = [...new Set(workoutDates)].filter(Boolean).sort().reverse();
  let streak = 1;
  for (let i = 1; i < days.length; i++) {
    if (daysBetween(days[i], days[i - 1]) === 1) streak++;
    else break;
  }
  return streak >= 5;
}
