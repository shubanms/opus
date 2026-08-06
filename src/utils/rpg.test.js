import { describe, it, expect } from 'vitest';
import {
  calcSetXP, calcWorkoutXP, getLevelFromTotalXP, getTitle, getXPProgress,
  getPrestige, prestigeXp, roman, getRankLabel, getCharacterStats,
  intensityFactor, effortFactor, setQuality, sessionQuality,
  COMPLETE_BONUS, RANKS,
} from './rpg.js';

describe('calcSetXP', () => {
  it('uses reps for bodyweight (no load)', () => {
    expect(calcSetXP(0, 10)).toBe(10);
    expect(calcSetXP(null, 8)).toBe(8);
  });
  it('uses weight×reps/10 for loaded sets', () => {
    expect(calcSetXP(100, 10)).toBe(100);
    expect(calcSetXP(60, 10)).toBe(60);
  });
});

describe('calcWorkoutXP', () => {
  it('sums working sets + completion bonus, ignoring warmups', () => {
    const sets = [
      { weight: 100, reps: 10, isWarmup: false },
      { weight: 999, reps: 5, isWarmup: true },
    ];
    expect(calcWorkoutXP(sets)).toBe(100 + COMPLETE_BONUS);
  });

  it('is unchanged for anyone with no records yet', () => {
    // Nothing to measure intensity against, so a new account earns exactly what
    // it earned before quality weighting existed.
    const sets = [
      { exerciseId: 1, weight: 100, reps: 10, isWarmup: false },
      { exerciseId: 2, weight: 40, reps: 12, isWarmup: false },
    ];
    expect(calcWorkoutXP(sets, {})).toBe(100 + 48 + COMPLETE_BONUS);
  });

  it('pays more for a session near your best than for the same volume light', () => {
    const heavy = [{ exerciseId: 1, weight: 100, reps: 5, isWarmup: false }];
    const light = [{ exerciseId: 1, weight: 25, reps: 20, isWarmup: false }];
    const bests = { 1: 110 };
    // Identical volume (500), so the base XP is identical — only quality differs.
    expect(calcSetXP(100, 5)).toBe(calcSetXP(25, 20));
    expect(calcWorkoutXP(heavy, bests)).toBeGreaterThan(calcWorkoutXP(light, bests));
  });

  it('does not scale the crit bonus', () => {
    // A crit is a dice roll, not an achievement; scaling it would compound luck
    // with merit.
    const sets = [{ exerciseId: 1, weight: 100, reps: 10, isWarmup: false, bonusXp: 50 }];
    expect(calcWorkoutXP(sets, { 1: 100 })).toBe(Math.round(100 * 1.5) + 50 + COMPLETE_BONUS);
  });

  it('warm-ups stay worthless however heavy they are', () => {
    const sets = [{ exerciseId: 1, weight: 200, reps: 10, isWarmup: true }];
    expect(calcWorkoutXP(sets, { 1: 100 })).toBe(COMPLETE_BONUS);
  });
});

describe('intensityFactor', () => {
  it('scores load against your own best on that lift', () => {
    expect(intensityFactor(120, 100)).toBe(1.5); // a new record
    expect(intensityFactor(100, 100)).toBe(1.5);
    expect(intensityFactor(90, 100)).toBe(1.3);
    expect(intensityFactor(75, 100)).toBe(1.15);
    expect(intensityFactor(60, 100)).toBe(1);
    expect(intensityFactor(40, 100)).toBe(0.8); // filler
  });

  it('judges accessories against their own record, not an absolute weight', () => {
    // 20 kg is trivial next to a squat and near-maximal for a lateral raise.
    // Per-exercise anchoring is the whole reason this is fair.
    expect(intensityFactor(20, 22.5)).toBe(1.3);
    expect(intensityFactor(20, 200)).toBe(0.8);
  });

  it('stays neutral when there is nothing to compare against', () => {
    expect(intensityFactor(100, 0)).toBe(1);
    expect(intensityFactor(100, null)).toBe(1);
    expect(intensityFactor(100, undefined)).toBe(1);
    // Bodyweight movements carry no load to measure.
    expect(intensityFactor(0, 100)).toBe(1);
  });
});

describe('effortFactor', () => {
  it('rewards hard sets a little', () => {
    expect(effortFactor(10)).toBe(1.1);
    expect(effortFactor(9)).toBe(1.05);
  });

  it('never punishes an easy or unrated set', () => {
    // Docking unrated sets teaches people to rate only the hard ones, which
    // corrupts the effort data the rest of the app reads.
    expect(effortFactor(7)).toBe(1);
    expect(effortFactor(null)).toBe(1);
    expect(effortFactor(undefined)).toBe(1);
  });

  it('caps what a lie is worth', () => {
    // Self-reported, therefore gameable; +10% is not worth lying for.
    expect(effortFactor(10)).toBeLessThanOrEqual(1.1);
  });
});

describe('setQuality', () => {
  it('combines the objective and the self-reported halves', () => {
    expect(setQuality({ weight: 90, reps: 5, rpe: 10 }, 100)).toBeCloseTo(1.3 * 1.1);
  });

  it('survives a missing set', () => {
    expect(setQuality(null, 100)).toBe(1);
    expect(setQuality({}, 100)).toBe(1);
  });
});

describe('sessionQuality', () => {
  const bests = { 1: 100, 2: 50 };

  it('reports the multiplier the session actually earned', () => {
    const sets = [
      { exerciseId: 1, weight: 90, reps: 5, isWarmup: false },
      { exerciseId: 2, weight: 45, reps: 10, isWarmup: false },
    ];
    expect(sessionQuality(sets, bests).mult).toBeCloseTo(1.3);
  });

  it('counts the heavy sets and the filler', () => {
    const sets = [
      { exerciseId: 1, weight: 95, reps: 3, isWarmup: false },
      { exerciseId: 1, weight: 30, reps: 15, isWarmup: false },
      { exerciseId: 1, weight: 70, reps: 8, isWarmup: false },
      { exerciseId: 1, weight: 200, reps: 5, isWarmup: true },
    ];
    const q = sessionQuality(sets, bests);
    expect(q.heavy).toBe(1);
    expect(q.filler).toBe(1);
    expect(q.sets).toBe(3); // the warm-up is not a set for this purpose
  });

  it('reads as neutral rather than dividing by zero on an empty session', () => {
    expect(sessionQuality([], bests).mult).toBe(1);
    expect(sessionQuality(undefined).mult).toBe(1);
  });
});

describe('getLevelFromTotalXP', () => {
  it('maps thresholds to levels and caps at 50', () => {
    expect(getLevelFromTotalXP(0)).toBe(1);
    expect(getLevelFromTotalXP(299)).toBe(1);
    expect(getLevelFromTotalXP(300)).toBe(2);
    expect(getLevelFromTotalXP(1200)).toBe(3);
    expect(getLevelFromTotalXP(720300)).toBe(50); // xpForLevel(50)
    expect(getLevelFromTotalXP(9_999_999)).toBe(50);
  });
});

describe('getTitle', () => {
  it('spreads the 10 titles across 50 levels (bands of 5)', () => {
    expect(getTitle(1)).toBe('First Rep');
    expect(getTitle(6)).toBe('Iron Beginner');
    expect(getTitle(46)).toBe('Magnum Opus');
    expect(getTitle(50)).toBe('Magnum Opus');
    expect(getTitle(99)).toBe('Magnum Opus');
  });
});

describe('getXPProgress', () => {
  it('reports progress within a level', () => {
    const p = getXPProgress(0);
    expect(p.level).toBe(1);
    expect(p.progress).toBeGreaterThanOrEqual(0);
    expect(p.xpToNext).toBe(300);
  });
  it('tracks the prestige band at/after max level (never negative)', () => {
    const atTier2 = getXPProgress(prestigeXp(2));
    expect(atTier2.level).toBe(50);
    expect(atTier2.prestige).toBe(2);
    expect(atTier2.progress).toBe(0);
    expect(atTier2.xpToNext).toBeGreaterThan(0);
  });
  it('never returns negative xpToNext for absurdly large XP', () => {
    const p = getXPProgress(66_666_665_332);
    expect(p.xpToNext).toBeGreaterThanOrEqual(0);
    expect(p.progress).toBeLessThanOrEqual(1);
  });
});

describe('prestige', () => {
  it('is 0 below Magnum Opus', () => {
    expect(getPrestige(24999)).toBe(0);
  });
  it('increments every step past the max title', () => {
    expect(getPrestige(prestigeXp(1))).toBe(1);
    expect(getPrestige(prestigeXp(2))).toBe(2);
  });
  it('roman numerals', () => {
    expect(roman(1)).toBe('I');
    expect(roman(4)).toBe('IV');
  });
  it('rank label includes prestige once earned', () => {
    expect(getRankLabel(0)).toBe('First Rep');
    expect(getRankLabel(prestigeXp(2))).toBe('Magnum Opus II');
  });
});

describe('RANKS', () => {
  it('has 10 named ranks starting at 0 XP', () => {
    expect(RANKS).toHaveLength(10);
    expect(RANKS[0]).toMatchObject({ level: 1, title: 'First Rep', xp: 0 });
  });
});

describe('getCharacterStats', () => {
  it('returns five axes clamped to 0–100', () => {
    const stats = getCharacterStats({ maxWeight: 400, avgVolume: 0, avgSets: 0, streak: 0, workoutsPerWeek: 0, muscleVariety: 0 });
    expect(stats).toHaveLength(5);
    const strength = stats.find((s) => s.axis === 'Strength');
    expect(strength.value).toBe(100);
    stats.forEach((s) => {
      expect(s.value).toBeGreaterThanOrEqual(0);
      expect(s.value).toBeLessThanOrEqual(100);
    });
  });
});
