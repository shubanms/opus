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
  it('maps thresholds to levels and caps at 10', () => {
    expect(getLevelFromTotalXP(0)).toBe(1);
    expect(getLevelFromTotalXP(499)).toBe(1);
    expect(getLevelFromTotalXP(500)).toBe(2);
    expect(getLevelFromTotalXP(25000)).toBe(10);
    expect(getLevelFromTotalXP(999999)).toBe(10);
  });
});

describe('getTitle', () => {
  it('returns the rank title for a level', () => {
    expect(getTitle(1)).toBe('First Rep');
    expect(getTitle(10)).toBe('Magnum Opus');
    expect(getTitle(99)).toBe('Magnum Opus');
  });
});

describe('getXPProgress', () => {
  it('reports progress within a level', () => {
    const p = getXPProgress(0);
    expect(p.level).toBe(1);
    expect(p.progress).toBeGreaterThanOrEqual(0);
    expect(p.xpToNext).toBe(500);
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
