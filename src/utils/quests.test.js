import { describe, it, expect } from 'vitest';
import {
  weeklyQuests, weekKeyOf, weekIndex, QUEST_POOL,
  computeQuestStats, weekStartMs, weekStartMsFromKey,
  weekKeyOfDateKey, recordEvents, weekQuestStats,
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

describe('weekKeyOfDateKey', () => {
  it('reads a stored date as a local day, so a Monday stays in its own week', () => {
    // `new Date('2026-10-05')` is UTC midnight — Sunday evening west of UTC.
    // Run with TZ=America/New_York to see the old reading fail.
    expect(weekKeyOfDateKey('2026-10-05')).toBe('2026-10-05');
    expect(weekKeyOfDateKey('2026-10-11')).toBe('2026-10-05');
    expect(weekKeyOfDateKey('2026-10-12')).toBe('2026-10-12');
    expect(weekKeyOfDateKey('')).toBeNull();
  });
});

describe('recordEvents', () => {
  const w = (id, date, createdAt = id) => ({ id, date, createdAt, status: 'completed' });
  const s = (workoutId, exerciseId, weight, reps, extra = {}) => ({ workoutId, exerciseId, weight, reps, ...extra });

  it('a session sets a record when it beats everything logged before it', () => {
    const workouts = [w(1, '2026-09-08'), w(2, '2026-09-22'), w(3, '2026-09-29')];
    const sets = [s(1, 7, 100, 5), s(2, 7, 105, 5), s(3, 7, 102.5, 5)];
    const events = recordEvents({ workouts, sets });
    expect(events.filter((e) => e.type === 'weight').map((e) => e.workoutId)).toEqual([1, 2]);
    // Week 1's record is still week 1's, however many times it is beaten later.
    expect(events.some((e) => e.workoutId === 1)).toBe(true);
  });

  it('one event per lift and type per session, however many sets beat it', () => {
    const events = recordEvents({ workouts: [w(1, '2026-09-08')], sets: [s(1, 7, 100, 5), s(1, 7, 105, 5)] });
    expect(events.map((e) => e.type).sort()).toEqual(['reps', 'volume', 'weight']);
  });

  it('ignores warm-ups, cardio, zero-rep sets and kg↔lb rounding noise', () => {
    const workouts = [w(1, '2026-09-08'), w(2, '2026-09-15')];
    const sets = [
      s(1, 7, 77.5, 5),
      s(2, 7, 120, 5, { isWarmup: true }),
      s(2, 8, 0, 0, { isCardio: true }),
      s(2, 7, 200, 0),
      s(2, 7, 77.50079, 5), // 170.86 lb typed back in
    ];
    expect(recordEvents({ workouts, sets }).filter((e) => e.workoutId === 2)).toEqual([]);
  });

  it('orders sessions by local day, then by when they were saved', () => {
    const workouts = [w(5, '2026-09-08', 900), w(4, '2026-09-08', 100)];
    const events = recordEvents({ workouts, sets: [s(5, 7, 100, 5), s(4, 7, 100, 5)] });
    expect(events.find((e) => e.type === 'weight').workoutId).toBe(4);
  });
});

describe('weekQuestStats', () => {
  const exMuscle = { 7: 'chest', 8: 'quadriceps' };
  const workouts = [
    { id: 1, date: '2026-10-05', status: 'completed', createdAt: 1, totalVolume: 500 }, // Monday
    { id: 2, date: '2026-10-11', status: 'completed', createdAt: 2, totalVolume: 600 }, // Sunday
    { id: 3, date: '2026-10-12', status: 'completed', createdAt: 3, totalVolume: 700 }, // next Monday
  ];
  const sets = [
    { workoutId: 1, exerciseId: 7, weight: 100, reps: 5 },
    { workoutId: 2, exerciseId: 8, weight: 60, reps: 10 },
    { workoutId: 3, exerciseId: 7, weight: 90, reps: 5 },
  ];

  it('counts Monday-to-Sunday by local date, records from set history', () => {
    const stats = weekQuestStats({ weekKey: '2026-10-05', workouts, sets, exMuscle });
    expect(stats).toEqual({ sessions: 2, volumeKg: 1100, sets: 2, muscleVariety: 2, legsSessions: 1, prs: 6 });
    // Next week's 90 kg bench beats nothing.
    expect(weekQuestStats({ weekKey: '2026-10-12', workouts, sets, exMuscle }).prs).toBe(0);
  });

  it('computeQuestStats takes a record count directly', () => {
    expect(computeQuestStats({ workouts: [], sets: [], prCount: 4, exMuscle }).prs).toBe(4);
  });
});
