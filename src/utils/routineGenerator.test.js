import { describe, it, expect } from 'vitest';
import { makeRng, generateRoutine, pickForGroup, defaultCount, LEVEL_DEFAULTS, reshuffleRoutine, orderGroups, MUSCLE_PRIORITY } from './routineGenerator.js';

// Small fixture pool. ids unique; muscleGroup + difficulty drive selection.
const POOL = [
  { id: 1, muscleGroup: 'chest', difficulty: 'beginner' },
  { id: 2, muscleGroup: 'chest', difficulty: 'beginner' },
  { id: 3, muscleGroup: 'chest', difficulty: 'intermediate' },
  { id: 4, muscleGroup: 'chest', difficulty: 'intermediate' },
  { id: 5, muscleGroup: 'chest', difficulty: 'advanced' },
  { id: 6, muscleGroup: 'biceps', difficulty: 'beginner' },
  { id: 7, muscleGroup: 'biceps', difficulty: 'intermediate' },
  { id: 8, muscleGroup: 'biceps', difficulty: 'advanced' },
  // a "thin advanced" group: only 1 advanced, rest intermediate
  { id: 9, muscleGroup: 'calves', difficulty: 'intermediate' },
  { id: 10, muscleGroup: 'calves', difficulty: 'advanced' },
];

describe('defaultCount', () => {
  it('scales base by extra groups, capped at 10', () => {
    expect(defaultCount('beginner', 1)).toBe(4);
    expect(defaultCount('beginner', 3)).toBe(6);
    expect(defaultCount('advanced', 5)).toBe(10);
  });
});

describe('generateRoutine', () => {
  it('applies level targets', () => {
    const r = generateRoutine({ exercises: POOL, groups: ['chest'], level: 'intermediate', count: 2, rng: makeRng(1) });
    expect(r).toHaveLength(2);
    expect(r[0]).toMatchObject({ targetSets: LEVEL_DEFAULTS.intermediate.sets, targetReps: LEVEL_DEFAULTS.intermediate.reps, targetWeight: null });
  });
  it('never duplicates an exercise', () => {
    const r = generateRoutine({ exercises: POOL, groups: ['chest'], level: 'beginner', count: 99, rng: makeRng(7) });
    const ids = r.map((x) => x.exerciseId);
    expect(new Set(ids).size).toBe(ids.length);
    expect(r.length).toBe(5); // only 5 chest exercises exist
  });
  it('balances across multiple groups', () => {
    const r = generateRoutine({ exercises: POOL, groups: ['chest', 'biceps'], level: 'beginner', count: 4, rng: makeRng(3) });
    expect(r).toHaveLength(4);
    const groups = r.map((x) => POOL.find((e) => e.id === x.exerciseId).muscleGroup);
    expect(groups.filter((g) => g === 'chest').length).toBe(2);
    expect(groups.filter((g) => g === 'biceps').length).toBe(2);
  });
  it('fills a thin-advanced group via difficulty proximity', () => {
    const r = generateRoutine({ exercises: POOL, groups: ['calves'], level: 'advanced', count: 2, rng: makeRng(5) });
    expect(r).toHaveLength(2); // 1 advanced + 1 intermediate (adjacent fallback)
    expect(r[0].exerciseId).toBe(10); // the advanced one ranks first
  });
  it('is deterministic for a given seed', () => {
    const a = generateRoutine({ exercises: POOL, groups: ['chest', 'biceps'], level: 'beginner', count: 4, rng: makeRng(42) });
    const b = generateRoutine({ exercises: POOL, groups: ['chest', 'biceps'], level: 'beginner', count: 4, rng: makeRng(42) });
    expect(a).toEqual(b);
  });
});

describe('pickForGroup', () => {
  it('ranks exact difficulty before adjacent', () => {
    const ranked = pickForGroup(POOL, 'chest', 'advanced', makeRng(2));
    expect(ranked[0].difficulty).toBe('advanced');
  });
});

describe('reshuffleRoutine', () => {
  // a 3-slot chest routine using ids 1,2,3 — pool has 5 chest exercises to swap from
  const slots = [
    { exerciseId: 1, muscleGroup: 'chest', difficulty: 'beginner', targetSets: 3, targetReps: 10, targetWeight: 40 },
    { exerciseId: 2, muscleGroup: 'chest', difficulty: 'beginner', targetSets: 3, targetReps: 10, targetWeight: null },
    { exerciseId: 3, muscleGroup: 'chest', difficulty: 'intermediate', targetSets: 4, targetReps: 8, targetWeight: null },
  ];
  const changed = (a, b) => a.filter((s, i) => s.exerciseId !== b[i].exerciseId).length;

  it('light swaps exactly one exercise', () => {
    const out = reshuffleRoutine({ slots, intensity: 'light', pool: POOL, rng: makeRng(1) });
    expect(changed(slots, out)).toBe(1);
  });
  it('full swaps every (unpinned) exercise', () => {
    const out = reshuffleRoutine({ slots, intensity: 'full', pool: POOL, rng: makeRng(1) });
    expect(changed(slots, out)).toBe(3);
  });
  it('never swaps pinned exercises', () => {
    const out = reshuffleRoutine({ slots, intensity: 'full', pinnedIds: [1], pool: POOL, rng: makeRng(2) });
    expect(out.find((s) => s.exerciseId === 1)).toBeTruthy();
    expect(changed(slots, out)).toBe(2);
  });
  it('keeps sets/reps/rest but drops the old lift’s weight and misses on a swapped slot', () => {
    const withState = slots.map((s) => ({ ...s, targetRest: 90, misses: 1, weightStep: 5 }));
    const out = reshuffleRoutine({ slots: withState, intensity: 'full', pool: POOL, rng: makeRng(3) });
    out.forEach((s, i) => {
      expect(s.targetSets).toBe(slots[i].targetSets);
      expect(s.targetReps).toBe(slots[i].targetReps);
      expect(s.targetRest).toBe(90);
      if (s.exerciseId !== slots[i].exerciseId) {
        expect(s.targetWeight).toBeNull();
        expect(s.misses).toBe(0);
        expect(s.weightStep).toBeNull();
      }
    });
  });
  it('leaves an unswapped (pinned) slot exactly as it was', () => {
    const withState = slots.map((s) => ({ ...s, misses: 1 }));
    const out = reshuffleRoutine({ slots: withState, intensity: 'full', pinnedIds: [1], pool: POOL, rng: makeRng(3) });
    expect(out[0]).toEqual(withState[0]);
    expect(out[0].targetWeight).toBe(40);
  });
  it('produces no duplicate exercises', () => {
    const out = reshuffleRoutine({ slots, intensity: 'full', pool: POOL, rng: makeRng(9) });
    const ids = out.map((s) => s.exerciseId);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('orderGroups', () => {
  it('fills big movers first, alternating lower / push / pull', () => {
    expect(orderGroups(['chest', 'front-deltoids', 'triceps', 'upper-back', 'biceps', 'quadriceps', 'hamstring']))
      .toEqual(['quadriceps', 'chest', 'upper-back', 'hamstring', 'front-deltoids', 'biceps', 'triceps']);
  });
  it('keeps unknown groups, last, in their given order, and drops duplicates', () => {
    expect(orderGroups(['cardio', 'chest', 'mobility', 'chest'])).toEqual(['chest', 'cardio', 'mobility']);
  });
  it('ranks every muscle group exactly once', () => {
    expect(new Set(MUSCLE_PRIORITY).size).toBe(15);
  });
});

describe('generateRoutine across a whole body', () => {
  const MUSCLES = MUSCLE_PRIORITY;
  const pool = MUSCLES.flatMap((m, i) => [0, 1].map((k) => ({ id: i * 10 + k, muscleGroup: m, difficulty: 'beginner' })));
  const groupOf = (id) => pool.find((e) => e.id === id).muscleGroup;
  it('reaches the legs at every count from 4 to 8', () => {
    const full = ['chest', 'front-deltoids', 'triceps', 'upper-back', 'lower-back', 'trapezius', 'back-deltoids', 'biceps', 'forearm', 'quadriceps', 'hamstring', 'gluteal', 'calves'];
    for (let count = 4; count <= 8; count++) {
      const r = generateRoutine({ exercises: pool, groups: full, level: 'beginner', count, rng: makeRng(count) });
      const legs = r.filter((x) => ['quadriceps', 'hamstring', 'gluteal', 'calves'].includes(groupOf(x.exerciseId)));
      expect(legs.length, `count ${count}`).toBeGreaterThanOrEqual(2);
    }
  });
});
