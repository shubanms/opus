import { describe, it, expect } from 'vitest';
import { makeRng, generateRoutine, pickForGroup, defaultCount, LEVEL_DEFAULTS } from './routineGenerator.js';

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
