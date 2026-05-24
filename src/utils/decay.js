// Rank demotion: inactivity decay + streak-break penalty. Applied as a
// display-derived deduction from earned XP (the stored totalXp is never
// mutated — it's your earned history), so training (days→0) fully recovers it.
// Pure + unit-tested.

const GRACE_DAYS = 4;            // free rest before decay starts
const DECAY_PCT_PER_DAY = 0.025; // 2.5% of earned XP lost per day past grace
const MAX_DECAY_PCT = 0.4;       // inactivity never costs more than 40%
const STREAK_PENALTY_PER_DAY = 20; // XP per day of the streak you let lapse
const MAX_STREAK_PENALTY = 1000;

export function daysSince(dateStr, now = new Date()) {
  if (!dateStr) return 0;
  const last = new Date(`${dateStr}T00:00:00`);
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const d = Math.floor((today - last) / 86400000);
  return d > 0 ? d : 0;
}

export function inactivityDecay(days, earnedXp) {
  if (days <= GRACE_DAYS || earnedXp <= 0) return 0;
  const pct = Math.min((days - GRACE_DAYS) * DECAY_PCT_PER_DAY, MAX_DECAY_PCT);
  return Math.round(earnedXp * pct);
}

// A penalty for letting a real streak lapse. Gated by the same grace window as
// decay, so normal rest days never penalize — only a genuine lapse does.
export function streakBreakPenalty(days, streak) {
  if (days <= GRACE_DAYS || !streak || streak <= 1) return 0;
  return Math.min(streak * STREAK_PENALTY_PER_DAY, MAX_STREAK_PENALTY);
}

// Effective XP + decay state derived from a profile and the current time.
export function decayInfo(profile, now = new Date()) {
  const earned = profile?.totalXp ?? 0;
  const days = daysSince(profile?.lastWorkoutDate, now);
  const lost = Math.min(inactivityDecay(days, earned) + streakBreakPenalty(days, profile?.streak ?? 0), earned);
  return { effectiveXp: Math.max(0, earned - lost), lost, decaying: lost > 0, days };
}
