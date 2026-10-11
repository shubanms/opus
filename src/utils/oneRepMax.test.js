import { describe, it, expect } from 'vitest';
import { epley1RM, setEstimate, sessionEstimates, bestEstimate, E1RM_MAX_REPS } from './oneRepMax.js';

describe('epley1RM', () => {
  it('returns the weight for a single rep', () => {
    expect(epley1RM(100, 1)).toBe(100);
  });
  it('applies the Epley formula for multiple reps', () => {
    expect(epley1RM(100, 10)).toBeCloseTo(133.33, 1);
    expect(epley1RM(60, 5)).toBeCloseTo(70, 5);
  });
  it('returns 0 when there is no external load', () => {
    expect(epley1RM(0, 8)).toBe(0);
    expect(epley1RM(null, 8)).toBe(0);
  });
  it('returns 0 with no reps', () => {
    expect(epley1RM(100, 0)).toBe(0);
  });
  it('grows with reps at the same weight', () => {
    expect(epley1RM(100, 8)).toBeGreaterThan(epley1RM(100, 3));
  });
});

describe('setEstimate', () => {
  it('ignores sets above the rep cap', () => {
    // The bug: 70 × 22 (≈121) out-estimated the 100 × 5 top set (≈117).
    expect(setEstimate({ weight: 70, reps: 22 })).toBe(0);
    expect(setEstimate({ weight: 100, reps: 5 })).toBeCloseTo(116.67, 1);
    expect(setEstimate({ weight: 80, reps: E1RM_MAX_REPS })).toBeCloseTo(112, 5);
    expect(setEstimate({ weight: 80, reps: E1RM_MAX_REPS + 1 })).toBe(0);
  });
  it('ignores warm-ups, cardio and unloaded sets', () => {
    expect(setEstimate({ weight: 100, reps: 5, isWarmup: true })).toBe(0);
    expect(setEstimate({ weight: 0, reps: 0, isCardio: true })).toBe(0);
    expect(setEstimate({ weight: 0, reps: 8 })).toBe(0);
    expect(setEstimate(null)).toBe(0);
  });
});

describe('sessionEstimates / bestEstimate', () => {
  const sets = [
    { workoutId: 1, weight: 100, reps: 5 },
    { workoutId: 1, weight: 70, reps: 22 }, // back-off — must not win
    { workoutId: 2, weight: 105, reps: 3 },
    { workoutId: 2, weight: 60, reps: 10, isWarmup: true },
    { workoutId: 3, weight: 20, reps: 50 }, // nothing estimable
  ];

  it('keeps the best estimable set per workout', () => {
    const m = sessionEstimates(sets);
    expect([...m.keys()]).toEqual([1, 2]);
    expect(m.get(1)).toEqual({ value: epley1RM(100, 5), weight: 100, reps: 5 });
    expect(m.get(2).value).toBeCloseTo(115.5, 5);
  });

  it('finds the all-time best and the set behind it', () => {
    expect(bestEstimate(sets)).toEqual({ value: epley1RM(100, 5), weight: 100, reps: 5, workoutId: 1 });
    expect(bestEstimate([])).toBeNull();
    expect(bestEstimate([{ workoutId: 9, weight: 50, reps: 30 }])).toBeNull();
  });
});
