import { daysBetween, shiftKey, todayKey } from './dateKey.js';

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
 * The date the streak should be measured from.
 *
 * Normally the last workout. After a rescue it is the day the spent tokens
 * bought, which is how a streak survives a gap without the workout history
 * being altered to pretend a session happened. The grace is stamped with the
 * `lastWorkoutDate` it was bought against, so it evaporates the moment that
 * changes — training again, or deleting the workout it was anchored to.
 */
export function effectiveLastDate(profile) {
  const last = profile?.lastWorkoutDate ?? null;
  const grace = profile?.streakGrace;
  if (!last || !grace?.through || grace.for !== last) return last;
  return grace.through > last ? grace.through : last;
}

/**
 * Live streak state for a profile.
 *
 * `count` is what the user actually has right now (0 once broken); `lost`
 * carries what the broken streak *was*, which is what a rescue prompt and the
 * XP penalty need to talk about.
 */
export function streakState(profile, today = todayKey()) {
  const stored = Math.max(0, Math.trunc(profile?.streak ?? 0) || 0);
  const last = effectiveLastDate(profile);

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

// ---------------------------------------------------------------------------
// Rescue
//
// A PWA cannot rely on waking you (see the v5 notification research), so the
// lapse cannot be caught the moment it happens — it is caught the next time you
// open the app, and the offer is made *there*. Retroactive by design.
//
// Rest tokens already existed but only ever waived an XP penalty, and sat on
// Home as an unexplained "🛡️ 2 banked". Here they buy back the thing people
// actually care about.
// ---------------------------------------------------------------------------

/** The most missed days a rescue can bridge. Past this the streak is gone. */
export const MAX_RESCUE_DAYS = 3;
/** Below this, a rescue prompt is noise rather than a rescue. */
export const MIN_RESCUABLE_STREAK = 3;

/**
 * What it would take to save the streak that just ended, or null if there is
 * nothing to offer.
 *
 * The rescue deliberately buys you back to the *brink* — one token per missed
 * day, landing you on "train today to keep it" rather than on safety. Paying to
 * skip a day should not also buy you a day off.
 */
export function rescueOffer(profile, tokens = 0, today = todayKey()) {
  const s = streakState(profile, today);
  if (s.state !== STREAK.BROKEN) return null;
  if (s.lost < MIN_RESCUABLE_STREAK) return null;

  // daysSince 2 means exactly one day (yesterday) went by unworked; today is
  // still open, so it is not yet a day missed.
  const missed = s.daysSince - 1;
  if (missed < 1 || missed > MAX_RESCUE_DAYS) return null;

  return {
    missed,
    cost: missed,
    lost: s.lost,
    affordable: (tokens || 0) >= missed,
    /** Where the grace lands: yesterday, i.e. back on the brink. */
    through: shiftKey(today, -1),
    /** Stamped so the grace dies when the workout it was bought against does. */
    for: profile?.lastWorkoutDate ?? null,
  };
}

/** The grace record a taken offer writes onto the profile. */
export function graceFromOffer(offer) {
  if (!offer?.through || !offer.for) return null;
  return { through: offer.through, for: offer.for };
}
