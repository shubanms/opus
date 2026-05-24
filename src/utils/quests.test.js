import { describe, it, expect } from 'vitest';
import {
  weeklyQuests, weekKeyOf, weekIndex, QUEST_POOL,
  computeQuestStats, weekStartMs, weekStartMsFromKey,
} from './quests.js';

const monday = new Date('2026-05-18T09:00:00'); // a Monday
const sameWeek = new Date('2026-05-24T22:00:00'); // the following Sunday
const nextWeek = new Date('2026-05-25T09:00:00'); // next Monday

describe('weekKeyOf', () => {
  it('is stable across a single week', () => {
    expect(weekKeyOf(sameWeek)).toBe(weekKeyOf(monday));
  });
  it('changes on the next Monday', () => {
    expect(weekKeyOf(nextWeek)).not.toBe(weekKeyOf(monday));
  });
  it('returns the Monday date', () => {
    expect(weekKeyOf(sameWeek)).toBe('2026-05-18');
  });
});

describe('weeklyQuests', () => {
  it('returns 3 quests', () => {
    expect(weeklyQuests(monday)).toHaveLength(3);
  });
  it('picks distinct metrics', () => {
    const metrics = weeklyQuests(monday).map((q) => q.metric);
    expect(new Set(metrics).size).toBe(metrics.length);
  });
  it('is deterministic within a week', () => {
    expect(weeklyQuests(monday)).toEqual(weeklyQuests(sameWeek));
  });
  it('rotates across weeks', () => {
    const a = weeklyQuests(monday).map((q) => q.id).join(',');
    const b = weeklyQuests(nextWeek).map((q) => q.id).join(',');
    expect(a).not.toBe(b);
  });
  it('only returns quests from the pool', () => {
    const ids = new Set(QUEST_POOL.map((q) => q.id));
    for (const q of weeklyQuests(monday)) expect(ids.has(q.id)).toBe(true);
  });
});

describe('weekIndex', () => {
  it('increments by one each week', () => {
    expect(weekIndex(nextWeek) - weekIndex(monday)).toBe(1);
  });
});

describe('computeQuestStats', () => {
  const exMuscle = { 1: 'chest', 2: 'quadriceps', 3: 'biceps' };

  it('aggregates every metric from a week of data', () => {
    const workouts = [{ id: 10, totalVolume: 3000 }, { id: 11, totalVolume: 2000 }];
    const sets = [
      { workoutId: 10, exerciseId: 1 }, { workoutId: 10, exerciseId: 2 },
      { workoutId: 11, exerciseId: 2 }, { workoutId: 11, exerciseId: 3 },
    ];
    const s = computeQuestStats({ workouts, sets, prs: [{}, {}], exMuscle });
    expect(s).toEqual({ sessions: 2, volumeKg: 5000, sets: 4, muscleVariety: 3, legsSessions: 2, prs: 2 });
  });

  it('counts a leg session once even with several leg sets', () => {
    const workouts = [{ id: 1, totalVolume: 0 }];
    const sets = [{ workoutId: 1, exerciseId: 2 }, { workoutId: 1, exerciseId: 2 }];
    expect(computeQuestStats({ workouts, sets, prs: [], exMuscle }).legsSessions).toBe(1);
  });

  it('is empty for no data', () => {
    expect(computeQuestStats({ workouts: [], sets: [], prs: [], exMuscle }))
      .toEqual({ sessions: 0, volumeKg: 0, sets: 0, muscleVariety: 0, legsSessions: 0, prs: 0 });
  });
});

describe('weekStartMsFromKey', () => {
  it('round-trips with weekKeyOf / weekStartMs', () => {
    const d = new Date('2026-05-20T12:00:00');
    expect(weekStartMsFromKey(weekKeyOf(d))).toBe(weekStartMs(d));
  });
});
