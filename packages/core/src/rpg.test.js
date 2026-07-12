import { describe, it, expect } from 'vitest';
import {
  calcSetXP, calcWorkoutXP, getLevelFromTotalXP, getTitle, getXPProgress,
  getPrestige, prestigeXp, roman, getRankLabel, getCharacterStats,
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
