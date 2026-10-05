import useSettingsStore from '../store/settingsStore.js';
import { decayInfo, streakBreakPenalty } from '../utils/decay.js';
import { isShieldActive, shieldedDecay } from '../utils/streakShield.js';
import { getPrestige, getRankLabel, getTitle, getXPProgress } from '../utils/rpg.js';
import { activeBoss, cappedLevel } from '../utils/bosses.js';
import { useBossStats } from './useBosses.js';

// The XP, level and title a person actually holds right now — one answer for
// every screen.
//
// This was computed inline on Home, with the rest-token shield and the boss-gate
// level cap applied. Profile, Progression and the character card each did their
// own version without one or both, so after spending a token Home showed full
// XP while Profile still charged the waived penalty, and a player sealed at a
// boss gate read "Lv. 20" on one screen and "Level 23" on the next.
export function useEffectiveXp(profile) {
  const shieldedLapseDate = useSettingsStore((s) => s.shieldedLapseDate);
  const bossStats = useBossStats();

  const rawDecay = decayInfo(profile ?? {});
  const shieldActive = isShieldActive(shieldedLapseDate, profile?.lastWorkoutDate);
  // Deliberately the STORED streak: this is the penalty for the streak you
  // *lost*, and the live count is 0 once it has broken.
  const streakPenalty = streakBreakPenalty(rawDecay.days, profile?.streak ?? 0);
  const { effectiveXp, decaying, lost } = shieldedDecay(rawDecay, {
    active: shieldActive,
    streakPenalty,
    earnedXp: profile?.totalXp ?? 0,
  });
  const { level: rawLevel } = getXPProgress(effectiveXp);
  const prestige = getPrestige(effectiveXp);
  const level = bossStats ? cappedLevel(rawLevel, bossStats) : rawLevel;
  const boss = bossStats ? activeBoss(rawLevel, bossStats) : null;
  const title = prestige > 0 ? getRankLabel(effectiveXp) : getTitle(level);

  return {
    effectiveXp,
    rawLevel,
    /** The level to show: capped at an uncleared boss gate. */
    level,
    /** True when XP has earned levels a boss gate is still holding back. */
    sealed: level < rawLevel,
    prestige,
    title,
    boss,
    bossStats,
    rawDecay,
    decaying,
    lost,
    shieldActive,
    streakPenalty,
    /**
     * False while the boss stats load. Until then `level` is the uncapped one,
     * so a screen about the cap itself should wait rather than flash it.
     */
    ready: bossStats !== null,
  };
}
