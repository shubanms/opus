import { describe, it, expect } from 'vitest';
import { ACHIEVEMENTS, achievementProgress } from './achievements.js';

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

describe('achievementProgress', () => {
  const find = (key) => ACHIEVEMENTS.find((a) => a.key === key);

  it('reports how close a locked achievement is', () => {
    const p = achievementProgress(find('w50'), { workouts: 12 });
    expect(p).toEqual({ current: 12, target: 50, ratio: 12 / 50 });
  });

  it('caps at the target so a finished one never reads 127 / 100', () => {
    const p = achievementProgress(find('sets100'), { totalSets: 4200 });
    expect(p.current).toBe(100);
    expect(p.ratio).toBe(1);
  });

  it('is null for achievements with no numeric scale', () => {
    expect(achievementProgress(find('earlyBird'), {})).toBe(null);
    expect(achievementProgress(find('nightOwl'), {})).toBe(null);
  });

  it('treats missing or junk stats as zero', () => {
    expect(achievementProgress(find('w10'), {}).current).toBe(0);
    expect(achievementProgress(find('w10'), undefined).current).toBe(0);
    expect(achievementProgress(find('w10'), { workouts: Number.NaN }).current).toBe(0);
    expect(achievementProgress(find('w10'), { workouts: -5 }).current).toBe(0);
  });

  it('survives a malformed definition', () => {
    expect(achievementProgress(null, {})).toBe(null);
    expect(achievementProgress({ metric: 'x', target: 0 }, { x: 3 }).ratio).toBe(1);
  });
});

describe('achievement definitions', () => {
  it('states the same number in the description as it tests for', () => {
    // The whole point of declaring `target` as data: before this, the number
    // lived in the prose AND in a hand-written predicate, free to drift.
    for (const a of ACHIEVEMENTS) {
      if (!a.metric) continue;
      const inDesc = (a.desc.match(/[\d,]+/g) ?? []).map((n) => Number(n.replace(/,/g, '')));
      if (!inDesc.length) continue;
      expect(inDesc).toContain(a.target);
    }
  });

  it('unlocks exactly at the target and not one short', () => {
    for (const a of ACHIEVEMENTS) {
      if (!a.metric) continue;
      expect(a.test({ [a.metric]: a.target })).toBe(true);
      expect(a.test({ [a.metric]: a.target - 1 })).toBe(false);
    }
  });
});
