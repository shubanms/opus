import { describe, it, expect } from 'vitest';
import { ACHIEVEMENTS } from './achievements.js';

const find = (key) => ACHIEVEMENTS.find((a) => a.key === key);
const base = {
  workouts: 0, totalVolume: 0, totalSets: 0, bestStreak: 0,
  muscleVariety: 0, prCount: 0, level: 1, earlyBird: false,
  nightOwl: false, customExercises: 0,
};

describe('achievement predicates', () => {
  it('first workout', () => {
    expect(find('first').test({ ...base, workouts: 1 })).toBe(true);
    expect(find('first').test(base)).toBe(false);
  });

  it('workout-count milestones', () => {
    expect(find('w10').test({ ...base, workouts: 10 })).toBe(true);
    expect(find('w100').test({ ...base, workouts: 99 })).toBe(false);
  });

  it('all muscle groups', () => {
    expect(find('allMuscles').test({ ...base, muscleVariety: 15 })).toBe(true);
    expect(find('allMuscles').test({ ...base, muscleVariety: 14 })).toBe(false);
  });

  it('volume + streak + level tiers', () => {
    expect(find('vol1m').test({ ...base, totalVolume: 1_000_000 })).toBe(true);
    expect(find('streak7').test({ ...base, bestStreak: 7 })).toBe(true);
    expect(find('level10').test({ ...base, level: 10 })).toBe(true);
  });

  it('every achievement has a unique key, title, and test fn', () => {
    const keys = new Set(ACHIEVEMENTS.map((a) => a.key));
    expect(keys.size).toBe(ACHIEVEMENTS.length);
    ACHIEVEMENTS.forEach((a) => {
      expect(typeof a.title).toBe('string');
      expect(typeof a.test).toBe('function');
    });
  });
});
