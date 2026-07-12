// Progressive overload engine — the three levers, in priority order:
//   1. increase reps  2. increase sets  3. increase weight
// sessions: array of past sessions (newest first), each a list of working sets
//           [{ weight, reps }, ...]
import { toDisplay, unitLabel } from './units.js';

export const OVERLOAD_DEFAULTS = {
  targetReps: 12,
  targetSets: 4,
  weightStep: 2.5,
  startReps: 8,
};

export function getOverloadSuggestion(sessions, opts = {}) {
  const cfg = { ...OVERLOAD_DEFAULTS, ...opts };
  const unit = opts.unit ?? 'kg';
  const w = (kg) => `${Math.round(toDisplay(kg, unit) * 10) / 10}${unitLabel(unit)}`;
  const at = (kg) => (kg > 0 ? ` at ${w(kg)}` : '');

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

  // Lever 3 — weight: target reps AND target sets for two sessions running
  if (allAtTarget && setCount >= cfg.targetSets && prevAllAtTarget && prevSetCount >= cfg.targetSets) {
    const next = topWeight + cfg.weightStep;
    return {
      action: 'increase_weight',
      suggestedWeight: next,
      suggestedReps: cfg.startReps,
      suggestedSets: cfg.targetSets,
      reason: `Maxed reps and sets twice over. Step up to ${w(next)} and drop back to ${cfg.startReps} reps.`,
      confidence: 'high',
    };
  }

  // Lever 2 — sets: hitting target reps with room for another set
  if (allAtTarget && setCount < cfg.targetSets) {
    return {
      action: 'increase_sets',
      suggestedSets: setCount + 1,
      suggestedReps: cfg.targetReps,
      suggestedWeight: topWeight,
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
      suggestedWeight: topWeight,
      reason: `Strong work — push for ${goal} reps${at(topWeight)} today.`,
      confidence: 'medium',
    };
  }

  return {
    action: 'maintain',
    suggestedReps: cfg.targetReps,
    suggestedSets: setCount,
    suggestedWeight: topWeight,
    reason: 'Hold steady and nail your form this session.',
    confidence: 'low',
  };
}

// Deload signal: 5+ consecutive training days ending at the most recent workout.
export function isDeloadDue(workoutDates) {
  if (!workoutDates || workoutDates.length === 0) return false;
  const days = [...new Set(workoutDates)].sort().reverse();
  let streak = 1;
  for (let i = 1; i < days.length; i++) {
    const diff = (new Date(days[i - 1]) - new Date(days[i])) / 86400000;
    if (diff === 1) streak++;
    else break;
  }
  return streak >= 5;
}
