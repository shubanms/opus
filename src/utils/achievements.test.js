import { describe, it, expect } from 'vitest';
import { ACHIEVEMENTS, achievementDesc, achievementProgress, bestStreakOf } from './achievements.js';
import { TITLES } from './rpg.js';
import { QUEST_POOL } from './quests.js';
import { BOSSES } from './bosses.js';
import { scheduleStreak } from './scheduleStreak.js';
import { streakState } from './streak.js';

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

describe('achievement names', () => {
  it('never reuse a rank, quest or boss name', () => {
    // "Forged" was a level-5 badge and the level 26-30 rank; "Relentless" was
    // a badge and a weekly quest. One name, one meaning.
    const taken = new Set([
      ...Object.values(TITLES),
      ...QUEST_POOL.map((q) => q.title),
      ...BOSSES.map((b) => b.title),
    ]);
    for (const a of ACHIEVEMENTS) expect(taken.has(a.title)).toBe(false);
  });

  it('keeps the keys unlocked rows point at', () => {
    const keys = ACHIEVEMENTS.map((a) => a.key);
    for (const k of ['first', 'streak7', 'streak30', 'sets1000', 'allMuscles', 'level5', 'level10']) {
      expect(keys).toContain(k);
    }
  });

  it('words streaks so they read right for a plan and for days', () => {
    for (const key of ['streak7', 'streak30']) {
      expect(ACHIEVEMENTS.find((a) => a.key === key).desc).not.toMatch(/-day/);
    }
    for (const b of BOSSES) expect(b.desc).not.toMatch(/-day/);
  });
});

describe('bestStreakOf', () => {
  // 2026-08-03 is a Monday.
  const MWF = new Set([1, 3, 5]);
  const weeks = (n, from = '2026-07-06') => {
    // n weeks of Mon/Wed/Fri starting on the Monday `from`.
    const out = [];
    const d = new Date(`${from}T12:00:00`);
    for (let w = 0; w < n; w += 1) {
      for (const off of [0, 2, 4]) {
        const x = new Date(d);
        x.setDate(d.getDate() + w * 7 + off);
        out.push(`${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`);
      }
    }
    return out;
  };

  it('lets a Mon/Wed/Fri lifter reach 7 — the bug this exists for', () => {
    // Three weeks of perfect Mon/Wed/Fri: no two sessions on consecutive days,
    // so the old best was 1 forever, and Week Warrior and The Gauntlet with it.
    const dates = weeks(3);
    expect(bestStreakOf({ dates, plan: null, today: '2026-07-24' })).toBe(1);
    expect(bestStreakOf({ dates, plan: MWF, today: '2026-07-24' })).toBe(9);
  });

  it('is never below the live streak', () => {
    const dates = weeks(4);
    for (const today of ['2026-07-29', '2026-07-30', '2026-07-31', '2026-08-01', '2026-08-02', '2026-08-03', '2026-08-04']) {
      const live = scheduleStreak({ plan: MWF, dates, today }).count;
      expect(bestStreakOf({ dates, plan: MWF, today })).toBeGreaterThanOrEqual(live);
    }
  });

  it('keeps a day-streak best when that is the bigger number', () => {
    // Ten straight days before the plan existed beats four planned sessions.
    const tenDays = Array.from({ length: 10 }, (_, i) => `2026-06-${String(10 + i).padStart(2, '0')}`);
    expect(bestStreakOf({ dates: [...tenDays, ...weeks(1)], plan: MWF, today: '2026-07-10' })).toBe(10);
  });

  it('remembers a run after it ends', () => {
    const dates = [...weeks(3), '2026-08-10'];
    expect(bestStreakOf({ dates, plan: MWF, today: '2026-08-10' })).toBe(9);
  });

  it('counts sessions bought back with rest tokens', () => {
    // Wednesday missed but credited: Mon + (Wed) + Fri is a run of 3.
    const profile = { creditedDays: ['2026-08-05'] };
    expect(bestStreakOf({ dates: ['2026-08-03', '2026-08-07'], plan: MWF, profile, today: '2026-08-08' })).toBe(3);
    expect(bestStreakOf({ dates: ['2026-08-03', '2026-08-07'], plan: MWF, today: '2026-08-08' })).toBe(1);
  });

  it('bridges a rescued day-streak gap without counting the bridge', () => {
    // Trained Aug 1-3, missed 4-5 (rescued), trained 6-7: one run of 5 sessions,
    // not two runs of 3 and 2 — and not 7, because a bridge is not a session.
    const dates = ['2026-08-01', '2026-08-02', '2026-08-03', '2026-08-06', '2026-08-07'];
    const profile = { streak: 5, lastWorkoutDate: '2026-08-07', streakGrace: { for: '2026-08-03', through: '2026-08-05' } };
    expect(bestStreakOf({ dates, profile, today: '2026-08-07' })).toBe(5);
    expect(bestStreakOf({ dates, today: '2026-08-07' })).toBe(3);
  });

  it('keeps a rescued gap bridged after the grace has moved on', () => {
    // The grace is stamped to the workout it was bought against and forgotten
    // at the next one; `bridgedDays` is what keeps the run whole afterwards.
    const dates = ['2026-08-01', '2026-08-02', '2026-08-03', '2026-08-06', '2026-08-07'];
    const later = { streak: 1, lastWorkoutDate: '2026-08-20', bridgedDays: ['2026-08-04', '2026-08-05'], streakGrace: { for: '2026-08-19', through: '2026-08-19' } };
    expect(bestStreakOf({ dates, profile: later, today: '2026-08-20' })).toBe(5);
  });

  it('includes the live day-streak count with no plan', () => {
    // A stored streak still standing (e.g. one a rescue carried across a gap
    // the dates alone cannot see) is never shown above the best.
    const profile = { streak: 12, lastWorkoutDate: '2026-08-07' };
    expect(streakState(profile, '2026-08-08').count).toBe(12);
    expect(bestStreakOf({ dates: ['2026-08-07'], profile, today: '2026-08-08' })).toBe(12);
    // Once it has broken, it no longer props the best up.
    expect(bestStreakOf({ dates: ['2026-08-07'], profile, today: '2026-08-20' })).toBe(1);
  });

  it('survives junk and an empty history', () => {
    expect(bestStreakOf()).toBe(0);
    expect(bestStreakOf({ dates: [null, 'nope'], plan: MWF, profile: null, today: '2026-08-03' })).toBe(0);
    expect(bestStreakOf({ dates: ['2026-08-03'], plan: [1, 3, 5], today: '2026-08-03' })).toBe(1);
  });
});

describe('achievementDesc', () => {
  it('states a volume target in the lifter\'s unit', () => {
    const tonne = ACHIEVEMENTS.find((a) => a.key === 'vol10k');
    expect(achievementDesc(tonne, 'kg')).toBe('Lift 10,000 kg in total');
    expect(achievementDesc(tonne, 'lbs')).toBe('Lift 22,046 lbs in total');
  });

  it('leaves everything else as written', () => {
    const ww = ACHIEVEMENTS.find((a) => a.key === 'streak7');
    expect(achievementDesc(ww, 'lbs')).toBe(ww.desc);
    expect(achievementDesc(null)).toBe('');
  });
});
