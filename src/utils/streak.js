import { daysBetween, todayKey } from './dateKey.js';

// Whether the training streak is actually still standing, right now.
//
// `profile.streak` is written in exactly one place — `completeWorkout` — so
// nothing recomputes it as days pass. The stored number is only true *as of*
// `lastWorkoutDate`; left alone it keeps reporting "7" three weeks later and
// silently resets to 1 on the next session. That is not generosity, it is a
// stale read, and it is what every streak display in the app was showing.
//
// The fix needs no history scan and no migration: the stored count is correct
// on the day it was written, so the only question is whether the calendar has
// invalidated it since.

export const STREAK = {
  /** Never had one, or it has already been counted as lost. */
  NONE: 'none',
  /** Trained today — nothing to do. */
  SAFE: 'safe',
  /** Trained yesterday, not yet today. Still alive; today is the deadline. */
  AT_RISK: 'atRisk',
  /** A full day was missed. The streak is gone. */
  BROKEN: 'broken',
};

/**
 * Live streak state for a profile.
 *
 * `count` is what the user actually has right now (0 once broken); `lost`
 * carries what the broken streak *was*, which is what a rescue prompt and the
 * XP penalty need to talk about.
 */
export function streakState(profile, today = todayKey()) {
  const stored = Math.max(0, Math.trunc(profile?.streak ?? 0) || 0);
  const last = profile?.lastWorkoutDate ?? null;

  if (!last || stored <= 0) {
    return { count: 0, state: STREAK.NONE, lost: 0, daysSince: 0 };
  }

  // `daysBetween` clamps negatives to 0, so a device clock behind the last
  // logged date reads as "trained today" rather than breaking the streak.
  const daysSince = daysBetween(last, today);
  if (daysSince === null) {
    return { count: 0, state: STREAK.NONE, lost: 0, daysSince: 0 };
  }
  if (daysSince === 0) {
    return { count: stored, state: STREAK.SAFE, lost: 0, daysSince };
  }
  if (daysSince === 1) {
    return { count: stored, state: STREAK.AT_RISK, lost: 0, daysSince };
  }
  return { count: 0, state: STREAK.BROKEN, lost: stored, daysSince };
}

/** The live count on its own — the number every streak display should show. */
export function currentStreak(profile, today = todayKey()) {
  return streakState(profile, today).count;
}

/**
 * One phrase per state, so the three screens that show a streak cannot word it
 * three different ways.
 */
export function streakLabel(state) {
  const s = state ?? {};
  switch (s.state) {
    case STREAK.SAFE:
      return `${s.count}-day streak`;
    case STREAK.AT_RISK:
      return `${s.count}-day streak · train today to keep it`;
    case STREAK.BROKEN:
      return s.lost > 1 ? `${s.lost}-day streak ended` : 'Streak ended';
    default:
      return 'No streak yet';
  }
}
