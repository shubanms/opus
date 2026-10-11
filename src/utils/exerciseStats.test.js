import { describe, it, expect } from 'vitest';
import { exerciseKind, rankExercises } from './exerciseStats.js';

const EX = [
  { id: 1, name: 'Bench Press', muscleGroup: 'chest', equipment: 'barbell' },
  { id: 2, name: 'Pull-Up', muscleGroup: 'upper-back', equipment: 'bodyweight' },
  { id: 3, name: 'Lat Pulldown', muscleGroup: 'upper-back', equipment: 'cable' },
  { id: 4, name: 'Treadmill', muscleGroup: 'cardio', equipment: 'cardio' },
  { id: 5, name: 'Hanging Leg Raise', muscleGroup: 'abs', equipment: 'bodyweight' },
];

describe('exerciseKind', () => {
  it('classifies by equipment, and by the set for cardio', () => {
    expect(exerciseKind(EX[0])).toBe('weighted');
    expect(exerciseKind(EX[1])).toBe('bodyweight');
    expect(exerciseKind(EX[3])).toBe('cardio');
    expect(exerciseKind(undefined, { isCardio: true })).toBe('cardio');
    expect(exerciseKind(undefined)).toBe('weighted');
  });
});

describe('rankExercises', () => {
  const sets = [
    { workoutId: 10, exerciseId: 1, weight: 60, reps: 8 },
    { workoutId: 10, exerciseId: 1, weight: 30, reps: 10, isWarmup: true },
    { workoutId: 10, exerciseId: 2, weight: 0, reps: 8 },
    { workoutId: 10, exerciseId: 2, weight: 0, reps: 8 },
    { workoutId: 10, exerciseId: 3, weight: 50, reps: 10 },
    { workoutId: 10, exerciseId: 4, weight: 0, reps: 0, isCardio: true, durationSec: 900 },
    { workoutId: 11, exerciseId: 5, weight: 0, reps: 12 },
  ];
  const bw = { 10: 80 }; // workout 11 has no bodyweight snapshot

  it('counts bodyweight into bodyweight lifts so they rank on real work', () => {
    const r = rankExercises(sets, EX, bw);
    // Pull-ups: 2 × 8 × 80 = 1280 — above the pulldown (500) and bench (480).
    expect(r.map((x) => x.name)).toEqual(['Pull-Up', 'Lat Pulldown', 'Bench Press', 'Treadmill', 'Hanging Leg Raise']);
    expect(r[0]).toMatchObject({ kind: 'bodyweight', sets: 2, reps: 16, volume: 1280 });
  });

  it('skips warm-ups and keeps cardio on time, not tonnage', () => {
    const r = rankExercises(sets, EX, bw);
    expect(r.find((x) => x.exerciseId === 1)).toMatchObject({ sets: 1, volume: 480 });
    expect(r.find((x) => x.exerciseId === 4)).toMatchObject({ kind: 'cardio', volume: 0, seconds: 900 });
  });

  it('still lists a bodyweight lift with no bodyweight on record, by its sets', () => {
    const r = rankExercises(sets, EX, bw);
    expect(r.find((x) => x.exerciseId === 5)).toMatchObject({ kind: 'bodyweight', volume: 0, sets: 1, reps: 12 });
  });

  it('returns every exercise so a filter can run before the cut', () => {
    const many = Array.from({ length: 30 }, (_, i) => ({ workoutId: 1, exerciseId: 100 + i, weight: 100 - i, reps: 5 }));
    const abs = { workoutId: 1, exerciseId: 5, weight: 0, reps: 10 };
    const r = rankExercises([...many, abs], EX, { 1: 70 });
    expect(r).toHaveLength(31);
    expect(r.filter((x) => x.muscleGroup === 'abs')).toHaveLength(1);
  });

  it('names unknown exercises rather than dropping their sets', () => {
    expect(rankExercises([{ workoutId: 1, exerciseId: 99, weight: 10, reps: 5 }], EX)[0].name).toBe('Unknown exercise');
    expect(rankExercises([], EX)).toEqual([]);
  });
});
