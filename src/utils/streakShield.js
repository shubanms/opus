// Streak shield / rest token. Tokens are *derived from your training history*
// (streak milestones + claimed quests), so existing users already have every
// token they've earned with no backfill, and deleting workouts naturally
// re-derives the count. A shield is spent to protect your streak from decay's
// streak-break penalty on a missed day. Pure + unit-tested.

const WORKOUTS_PER_TOKEN = 10; // one token per 10 finished workouts
const QUESTS_PER_TOKEN = 3;    // one token per 3 claimed quests

// Total tokens ever earned from history — derived from data both platforms
// already expose (finished-workout count + claimed quests), so existing users
// keep every token they've earned and deletes re-derive the count.
export function tokensEarned({ workouts = 0, questClaims = 0 } = {}) {
  return Math.floor((workouts || 0) / WORKOUTS_PER_TOKEN) + Math.floor((questClaims || 0) / QUESTS_PER_TOKEN);
}

// Spendable balance (never negative, even if history shrinks after deletes).
export function tokenBalance(earned = 0, spent = 0) {
  return Math.max(0, (earned || 0) - (spent || 0));
}

// A shield protects the streak only while the lapse it was spent on is still the
// current lapse — i.e. you haven't trained since. Training again clears it, so a
// token protects exactly one missed stretch.
export function isShieldActive(shieldedLapseDate, lastWorkoutDate) {
  return !!shieldedLapseDate && shieldedLapseDate === lastWorkoutDate;
}

// Apply an active shield to a decayInfo: waive the streak-break penalty portion
// (the mild inactivity decay still applies). Pass the streak-break penalty and
// the earned XP so the effective XP can be credited back.
export function shieldedDecay(decayInfo, { active = false, streakPenalty = 0, earnedXp = 0 } = {}) {
  if (!active || !decayInfo?.decaying || !streakPenalty) return decayInfo;
  const lost = Math.max(0, (decayInfo.lost || 0) - streakPenalty);
  return {
    ...decayInfo,
    lost,
    effectiveXp: Math.min(earnedXp, (decayInfo.effectiveXp || 0) + streakPenalty),
    decaying: lost > 0,
    shielded: true,
  };
}
