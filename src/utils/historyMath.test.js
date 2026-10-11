import { describe, it, expect } from 'vitest';
import {
  applyXpDelta,
  dayDelta,
  groupSetsInOrder,
  leavesSessionEmpty,
  mergeRecordRows,
  nextSetNumber,
  planDateMove,
  recordSetIds,
  removedRows,
  setKcal,
  setXp,
  setXpDelta,
  shiftTimestamp,
  workoutTotals,
} from './historyMath.js';

describe('workoutTotals', () => {
  const sets = [
    { exerciseId: 1, weight: 100, reps: 5 },
    { exerciseId: 1, weight: 50, reps: 10, isWarmup: true },
    { exerciseId: 2, weight: 10, reps: 8 }, // weighted pull-up
    { exerciseId: 3, weight: 0, reps: 0, isCardio: true },
  ];

  it('counts working sets (cardio included) and working volume, as the session did', () => {
    expect(workoutTotals(sets)).toEqual({ totalVolume: 580, totalSets: 3 });
  });

  it('adds the stored bodyweight to bodyweight lifts', () => {
    expect(workoutTotals(sets, { bodyweightKg: 80, bodyweightIds: new Set([2]) })).toEqual({ totalVolume: 500 + 720, totalSets: 3 });
  });

  it('handles nothing', () => {
    expect(workoutTotals([])).toEqual({ totalVolume: 0, totalSets: 0 });
    expect(workoutTotals(null)).toEqual({ totalVolume: 0, totalSets: 0 });
  });
});

describe('setXp / setXpDelta', () => {
  it('is base XP plus the stored crit bonus, and nothing for a warm-up', () => {
    expect(setXp({ weight: 100, reps: 5 })).toBe(50);
    expect(setXp({ weight: 100, reps: 5, bonusXp: 12 })).toBe(62);
    expect(setXp({ weight: 0, reps: 12 })).toBe(12); // bodyweight reps
    expect(setXp({ weight: 100, reps: 5, isWarmup: true, bonusXp: 9 })).toBe(0);
    expect(setXp(null)).toBe(0);
  });

  it('moves by the base difference only (the bonus stays with the set)', () => {
    const before = { weight: 100, reps: 5, bonusXp: 12 };
    expect(setXpDelta(before, { ...before, weight: 110 })).toBe(5);
    expect(setXpDelta(before, { ...before, isWarmup: true })).toBe(-62);
    expect(setXpDelta(null, { weight: 60, reps: 10 })).toBe(60);
    expect(setXpDelta(before, null)).toBe(-62);
  });

  it('cardio bouts carry their minutes as bonus XP and their own calories', () => {
    const bout = { isCardio: true, weight: 0, reps: 0, bonusXp: 15, calories: 140 };
    expect(setXp(bout)).toBe(15);
    expect(setKcal(bout)).toBe(140);
    expect(setKcal({ weight: 100, reps: 5, calories: 999 })).toBe(0);
  });
});

describe('applyXpDelta', () => {
  it('floors at zero and reports what it actually applied', () => {
    expect(applyXpDelta(100, -30)).toEqual({ xpEarned: 70, applied: -30 });
    expect(applyXpDelta(20, -50)).toEqual({ xpEarned: 0, applied: -20 });
    expect(applyXpDelta(undefined, 15)).toEqual({ xpEarned: 15, applied: 15 });
  });
});

describe('mergeRecordRows', () => {
  const row = (id, type, value, workoutId, achievedAt = 1) => ({ id, exerciseId: 1, type, value, workoutId, achievedAt });
  const fresh = (type, value, workoutId, achievedAt = 2) => ({ exerciseId: 1, type, value, workoutId, achievedAt });

  it('leaves a record still held by the same session exactly as it is', () => {
    const old = [row(1, 'weight', 100, 7, 1000)];
    expect(mergeRecordRows(old, [fresh('weight', 100, 7, 900)])).toEqual({ put: [], add: [], del: [] });
  });

  it('rewrites a record that changed hands or value, keeping its row id', () => {
    const old = [row(1, 'weight', 100, 7), row(2, 'reps', 10, 7)];
    const out = mergeRecordRows(old, [fresh('weight', 95, 3, 50), fresh('reps', 12, 7, 60)]);
    expect(out.put).toEqual([
      { id: 1, exerciseId: 1, type: 'weight', value: 95, workoutId: 3, achievedAt: 50 },
      { id: 2, exerciseId: 1, type: 'reps', value: 12, workoutId: 7, achievedAt: 60 },
    ]);
    expect(out.add).toEqual([]);
    expect(out.del).toEqual([]);
  });

  it('repairs a row an old rebuild left with no workout', () => {
    const out = mergeRecordRows([row(1, 'weight', 100, null, 999)], [fresh('weight', 100, 7, 5)]);
    expect(out.put[0]).toMatchObject({ id: 1, workoutId: 7, achievedAt: 5 });
  });

  it('adds new types and deletes stale or duplicate rows', () => {
    const old = [row(1, 'weight', 100, 7), row(2, 'weight', 90, 6), row(3, 'volume', 500, 7)];
    const out = mergeRecordRows(old, [fresh('weight', 100, 7), fresh('reps', 5, 7)]);
    expect(out.add).toEqual([fresh('reps', 5, 7)]);
    expect(out.del.sort()).toEqual([2, 3]);
  });
});

describe('removedRows', () => {
  it('lists rows that went, by id', () => {
    expect(removedRows([{ id: 1 }, { id: 2 }, { id: 3 }], [{ id: 2 }])).toEqual([{ id: 1 }, { id: 3 }]);
  });
});

describe('groupSetsInOrder', () => {
  it('keeps the order exercises were done in, not catalogue order', () => {
    // Squat (id 60) was done first, then Bench (id 3).
    const sets = [
      { id: 12, exerciseId: 3, setNumber: 2 },
      { id: 10, exerciseId: 60, setNumber: 1 },
      { id: 11, exerciseId: 3, setNumber: 1 },
      { id: 13, exerciseId: 60, setNumber: 2 },
    ];
    const groups = groupSetsInOrder(sets);
    expect(groups.map((g) => g.exerciseId)).toEqual([60, 3]);
    expect(groups[1].sets.map((s) => s.id)).toEqual([11, 12]);
  });

  it('a set added later sorts by its number inside its exercise', () => {
    const groups = groupSetsInOrder([
      { id: 1, exerciseId: 5, setNumber: 1 }, { id: 2, exerciseId: 6, setNumber: 1 }, { id: 9, exerciseId: 5, setNumber: 2 },
    ]);
    expect(groups.map((g) => [g.exerciseId, g.sets.map((s) => s.id)])).toEqual([[5, [1, 9]], [6, [2]]]);
  });
});

describe('recordSetIds', () => {
  const sets = [
    { id: 1, exerciseId: 3, weight: 100, reps: 5, completedAt: 1 },
    { id: 2, exerciseId: 3, weight: 100, reps: 5, completedAt: 2 },
    { id: 3, exerciseId: 3, weight: 80, reps: 12, completedAt: 3 },
    { id: 4, exerciseId: 3, weight: 120, reps: 1, isWarmup: true, completedAt: 0 },
  ];
  const prs = [
    { exerciseId: 3, type: 'weight', value: 100, workoutId: 9 },
    { exerciseId: 3, type: 'reps', value: 12, workoutId: 9 },
    { exerciseId: 3, type: 'volume', value: 960, workoutId: 9 },
    { exerciseId: 3, type: 'weight', value: 100, workoutId: 8 },
  ];

  it('marks the first set to reach each record this session holds', () => {
    expect([...recordSetIds(sets, prs, 9)].sort()).toEqual([1, 3]);
  });

  it('marks nothing for records another session holds', () => {
    expect(recordSetIds(sets, prs, 7).size).toBe(0);
  });
});

describe('leavesSessionEmpty', () => {
  const warm = { id: 1, isWarmup: true };
  const work = { id: 2 };
  const work2 = { id: 3 };

  it('the last set of a session, or its last working set, empties it', () => {
    expect(leavesSessionEmpty(work, [work])).toBe(true);
    expect(leavesSessionEmpty(work, [warm, work])).toBe(true);
  });

  it('a warm-up, or a working set with another beside it, does not', () => {
    expect(leavesSessionEmpty(warm, [warm, work])).toBe(false);
    expect(leavesSessionEmpty(work, [warm, work, work2])).toBe(false);
  });
});

describe('nextSetNumber', () => {
  it('follows the highest number for that exercise', () => {
    expect(nextSetNumber([{ exerciseId: 1, setNumber: 3 }, { exerciseId: 2, setNumber: 9 }], 1)).toBe(4);
    expect(nextSetNumber([], 1)).toBe(1);
  });
});

describe('moving a session', () => {
  it('dayDelta is signed whole local days', () => {
    expect(dayDelta('2026-10-06', '2026-10-02')).toBe(-4);
    expect(dayDelta('2026-03-01', '2026-04-01')).toBe(31);
    expect(dayDelta('x', '2026-04-01')).toBeNull();
  });

  it('shiftTimestamp keeps the local clock time, across a DST change too', () => {
    const t = new Date(2026, 2, 27, 18, 30).getTime();
    const moved = new Date(shiftTimestamp(t, 3));
    expect([moved.getDate(), moved.getHours(), moved.getMinutes()]).toEqual([30, 18, 30]);
    expect(shiftTimestamp(t, 0)).toBe(t);
    expect(shiftTimestamp(undefined, 3)).toBeUndefined();
  });

  const at = (d, h, m = 0) => new Date(2026, 9, d, h, m).getTime();
  const workout = { id: 4, date: '2026-10-06', createdAt: at(6, 19), startedAt: at(6, 18) };
  const sets = [{ id: 1, completedAt: at(6, 18, 20) }, { id: 2, completedAt: null }];
  const records = [{ id: 7, workoutId: 4, achievedAt: at(6, 19) }, { id: 8, workoutId: 3, achievedAt: at(1, 9) }];

  it('moves the session, its sets and the records it holds by one offset', () => {
    const p = planDateMove({ workout, sets, records, toKey: '2026-10-02', todayKey: '2026-10-07', now: at(7, 12) });
    expect(p.workout).toEqual({ date: '2026-10-02', createdAt: at(2, 19), startedAt: at(2, 18) });
    expect(p.sets).toEqual([{ id: 1, completedAt: at(2, 18, 20) }]);
    expect(p.records).toEqual([{ id: 7, achievedAt: at(2, 19) }]);
  });

  it('moving onto today slides the session back to end now rather than in the future', () => {
    const p = planDateMove({ workout, sets, records, toKey: '2026-10-07', todayKey: '2026-10-07', now: at(7, 12) });
    expect(p.workout.createdAt).toBe(at(7, 12));
    expect(p.workout.startedAt).toBe(at(7, 11));
  });

  it('refuses the future, no-ops and nonsense', () => {
    const base = { workout, sets, records, todayKey: '2026-10-07', now: at(7, 12) };
    expect(planDateMove({ ...base, toKey: '2026-10-08' })).toBeNull();
    expect(planDateMove({ ...base, toKey: '2026-10-06' })).toBeNull();
    expect(planDateMove({ ...base, toKey: '' })).toBeNull();
    expect(planDateMove({ ...base, workout: null, toKey: '2026-10-01' })).toBeNull();
  });
});
