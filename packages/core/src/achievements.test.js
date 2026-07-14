import { describe, it, expect } from 'vitest';
import {
  ACHIEVEMENTS,
  ACHIEVEMENT_BY_KEY,
  computeStats,
  earned,
  newlyUnlocked,
  staleKeys,
  xpFor,
} from './achievements.js';

// A day in ms, for building consecutive-date streaks.
const DAY = 86400000;
function dayKey(offset) {
  return new Date(Date.UTC(2026, 0, 1) + offset * DAY).toISOString().slice(0, 10);
}

describe('ACHIEVEMENTS defs', () => {
  it('have unique keys and are indexed', () => {
    const keys = ACHIEVEMENTS.map((a) => a.key);
    expect(new Set(keys).size).toBe(keys.length);
    expect(ACHIEVEMENT_BY_KEY.first.title).toBe('First Rep');
  });
});

describe('computeStats', () => {
  it('aggregates volume, sets, best streak, muscle variety, level', () => {
    const workouts = [
      { date: dayKey(0), totalVolume: 5000, totalSets: 12, createdAt: new Date(2026, 0, 1, 6).getTime() },
      { date: dayKey(1), totalVolume: 6000, totalSets: 10, createdAt: new Date(2026, 0, 2, 22).getTime() },
      { date: dayKey(2), totalVolume: 7000, totalSets: 8, createdAt: new Date(2026, 0, 3, 12).getTime() },
    ];
    const exercises = [
      { id: 1, muscleGroup: 'chest', isCustom: true },
      { id: 2, muscleGroup: 'back' },
    ];
    const sets = [
      { exerciseId: 1 },
      { exerciseId: 2 },
      { exerciseId: 2, isWarmup: true },
    ];
    const stats = computeStats({ workouts, sets, prs: [{}, {}], exercises, level: 6 });
    expect(stats.workouts).toBe(3);
    expect(stats.totalVolume).toBe(18000);
    expect(stats.totalSets).toBe(30);
    expect(stats.bestStreak).toBe(3); // three consecutive days
    expect(stats.muscleVariety).toBe(2);
    expect(stats.prCount).toBe(2);
    expect(stats.level).toBe(6);
    expect(stats.earlyBird).toBe(true); // 6am workout
    expect(stats.nightOwl).toBe(true); // 10pm workout
    expect(stats.customExercises).toBe(1);
  });
  it('defaults gracefully with no input', () => {
    const s = computeStats();
    expect(s.workouts).toBe(0);
    expect(s.level).toBe(1);
    expect(s.earlyBird).toBe(false);
  });
});

describe('earned / newlyUnlocked / staleKeys / xpFor', () => {
  const bigStats = {
    workouts: 10, totalVolume: 10000, totalSets: 100, bestStreak: 7,
    muscleVariety: 3, prCount: 0, level: 5, earlyBird: false, nightOwl: false, customExercises: 0,
  };
  it('earned returns all passing defs', () => {
    const keys = earned(bigStats).map((a) => a.key);
    expect(keys).toContain('first');
    expect(keys).toContain('w10');
    expect(keys).toContain('streak7');
    expect(keys).toContain('vol10k');
    expect(keys).toContain('sets100');
    expect(keys).toContain('level5');
    expect(keys).not.toContain('w50');
  });
  it('newlyUnlocked skips already-unlocked keys', () => {
    const newly = newlyUnlocked(bigStats, new Set(['first', 'w10']));
    const keys = newly.map((a) => a.key);
    expect(keys).not.toContain('first');
    expect(keys).toContain('streak7');
  });
  it('staleKeys flags unlocked achievements no longer holding (and unknown keys)', () => {
    const smallStats = { ...bigStats, workouts: 0, totalVolume: 0, totalSets: 0, bestStreak: 0, level: 1 };
    const stale = staleKeys(smallStats, ['first', 'w10', 'ghostKey']);
    expect(stale).toContain('first');
    expect(stale).toContain('w10');
    expect(stale).toContain('ghostKey'); // removed def → cleanup
  });
  it('xpFor sums reward XP', () => {
    expect(xpFor([ACHIEVEMENT_BY_KEY.first, ACHIEVEMENT_BY_KEY.w10])).toBe(150);
    expect(xpFor([])).toBe(0);
  });
});
