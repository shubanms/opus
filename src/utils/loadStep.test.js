import { describe, it, expect } from 'vitest';
import { smallestIncrement, stepWeight, prefillFrom } from './loadStep.js';
import { PLATES_KG, PLATES_LB } from './plateCalc.js';

describe('smallestIncrement', () => {
  it('is a pair of the lightest plate, because a bar loads both sides', () => {
    expect(smallestIncrement(PLATES_KG)).toBe(2.5);
    expect(smallestIncrement(PLATES_LB)).toBe(5);
  });

  it('respects a limited home rack', () => {
    // Nothing lighter than 5s: 1.25 kg steps would be unloadable.
    expect(smallestIncrement([20, 10, 5])).toBe(10);
  });

  it('falls back when there are no plates at all', () => {
    expect(smallestIncrement([])).toBe(2.5);
    expect(smallestIncrement(undefined)).toBe(2.5);
    expect(smallestIncrement([0, -5])).toBe(2.5);
    expect(smallestIncrement([], 5)).toBe(5);
  });
});

describe('stepWeight', () => {
  it('moves one increment at a time', () => {
    expect(stepWeight(60, 1, 2.5)).toBe(62.5);
    expect(stepWeight(60, -1, 2.5)).toBe(57.5);
  });

  it('snaps an off-grid weight onto the grid', () => {
    // 62.5 with a 5 kg step should reach 65, not 67.5.
    expect(stepWeight(62.5, 1, 5)).toBe(65);
    expect(stepWeight(62.5, -1, 5)).toBe(60);
  });

  it('starts from the first increment when the field is empty', () => {
    expect(stepWeight('', 1, 2.5)).toBe(2.5);
    expect(stepWeight(null, 1, 5)).toBe(5);
  });

  it('never goes negative', () => {
    expect(stepWeight(0, -1, 2.5)).toBe(0);
    expect(stepWeight(2.5, -1, 2.5)).toBe(0);
  });

  it('does not accumulate float noise', () => {
    let w = 0;
    for (let i = 0; i < 20; i += 1) w = stepWeight(w, 1, 1.25);
    expect(w).toBe(25);
  });

  it('survives junk input', () => {
    expect(stepWeight('abc', 1, 2.5)).toBe(2.5);
    expect(stepWeight(60, 1, 0)).toBe(62.5);
    expect(stepWeight(60, 1, undefined)).toBe(62.5);
  });
});

describe('prefillFrom', () => {
  const set = (weight, reps, isWarmup = false) => ({ weight, reps, isWarmup });

  it("uses this session's last working set", () => {
    const out = prefillFrom([set(100, 8), set(105, 6)], [set(90, 10)]);
    expect(out).toEqual({ weight: 105, reps: 6 });
  });

  it('falls back to last session when today has nothing yet', () => {
    expect(prefillFrom([], [set(90, 10)])).toEqual({ weight: 90, reps: 10 });
  });

  it('skips warm-ups', () => {
    // Prefilling the empty bar after a warm-up would be actively wrong.
    expect(prefillFrom([set(100, 8), set(20, 10, true)], [])).toEqual({ weight: 100, reps: 8 });
  });

  it('is null when there is nothing to go on', () => {
    expect(prefillFrom([], [])).toBe(null);
    expect(prefillFrom(undefined, undefined)).toBe(null);
    expect(prefillFrom([set(0, 0)], [])).toBe(null);
  });

  it('keeps a bodyweight set that has reps but no weight', () => {
    expect(prefillFrom([set(0, 12)], [])).toEqual({ weight: 0, reps: 12 });
  });
});
