import { describe, it, expect } from 'vitest';
import { smallestIncrement, stepWeight, prefillFrom, alignedPrevious, cleanRepsInput, cleanWeightInput, checkStrengthSet } from './loadStep.js';
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
  // The live QA case: Bench, routine target 3×8 @ 80, last session 77.5 × 8, 8, 7.
  const lastBench = [set(40, 10, true), set(77.5, 8), set(77.5, 8), set(77.5, 7)];
  const benchTarget = { targetSets: 3, targetReps: 8, targetWeight: 80 };

  it("uses this session's last working set", () => {
    const out = prefillFrom([set(100, 8), set(105, 6)], [set(90, 10)]);
    expect(out).toEqual({ weight: 105, reps: 6, source: 'session' });
  });

  it("this session beats the routine target — you've decided today's weight", () => {
    const out = prefillFrom([set(82.5, 8)], lastBench, benchTarget);
    expect(out).toEqual({ weight: 82.5, reps: 8, source: 'session' });
  });

  it('prefills the routine target before last session', () => {
    // Was 77.5 × 7: last session's last, fatigued set — a guaranteed miss
    // against an 80 × 8 target, and two misses triggered a deload.
    expect(prefillFrom([], lastBench, benchTarget)).toEqual({ weight: 80, reps: 8, source: 'target' });
  });

  it('fills the missing half of a partial target from last session', () => {
    expect(prefillFrom([], lastBench, { targetReps: 10 })).toEqual({ weight: 77.5, reps: 10, source: 'target' });
    expect(prefillFrom([], lastBench, { targetWeight: 80 })).toEqual({ weight: 80, reps: 8, source: 'target' });
    // A bodyweight target with nothing to borrow from is still a target.
    expect(prefillFrom([], [], { targetReps: 12 })).toEqual({ weight: 0, reps: 12, source: 'target' });
  });

  it('ignores an empty target', () => {
    expect(prefillFrom([], lastBench, { targetSets: 3, targetReps: null, targetWeight: null }).source).toBe('last');
    expect(prefillFrom([], lastBench, { targetReps: 0, targetWeight: 0 }).source).toBe('last');
  });

  it("falls back to last session's FIRST working set, not its last", () => {
    expect(prefillFrom([], lastBench)).toEqual({ weight: 77.5, reps: 8, source: 'last' });
  });

  it('warm-ups logged today do not count as the working set to repeat', () => {
    // Two warm-ups in: the next set is the first working set, so it lines up
    // with last session's first working set, not its third.
    const today = [set(20, 10, true), set(50, 5, true)];
    expect(prefillFrom(today, lastBench)).toEqual({ weight: 77.5, reps: 8, source: 'last' });
    expect(prefillFrom(today, lastBench, benchTarget).source).toBe('target');
  });

  it('skips warm-ups', () => {
    // Prefilling the empty bar after a warm-up would be actively wrong.
    expect(prefillFrom([set(100, 8), set(20, 10, true)], [])).toEqual({ weight: 100, reps: 8, source: 'session' });
  });

  it('never prefills from a cardio bout', () => {
    expect(prefillFrom([{ isCardio: true, weight: 0, reps: 0, durationSec: 600 }], [set(60, 10)]).source).toBe('last');
  });

  it('is null when there is nothing to go on', () => {
    expect(prefillFrom([], [])).toBe(null);
    expect(prefillFrom(undefined, undefined)).toBe(null);
    expect(prefillFrom([set(0, 0)], [])).toBe(null);
  });

  it('keeps a bodyweight set that has reps but no weight', () => {
    expect(prefillFrom([set(0, 12)], [])).toEqual({ weight: 0, reps: 12, source: 'session' });
  });
});

describe('alignedPrevious', () => {
  const set = (weight, reps, isWarmup = false) => ({ weight, reps, isWarmup });
  const pyramid = [set(20, 10, true), set(60, 10), set(70, 8), set(80, 6)];

  it("lines today's set N up with last session's working set N", () => {
    expect(alignedPrevious(pyramid, 0)).toEqual(set(60, 10));
    expect(alignedPrevious(pyramid, 1)).toEqual(set(70, 8));
    expect(alignedPrevious(pyramid, 2)).toEqual(set(80, 6));
  });

  it('holds at the last working set for an extra set today', () => {
    expect(alignedPrevious(pyramid, 5)).toEqual(set(80, 6));
  });

  it('is null with no history, and tolerates junk indices', () => {
    expect(alignedPrevious([], 0)).toBe(null);
    expect(alignedPrevious(undefined)).toBe(null);
    expect(alignedPrevious(pyramid, -3)).toEqual(set(60, 10));
    expect(alignedPrevious(pyramid, 1.5)).toEqual(set(60, 10));
  });
});

describe('cleanRepsInput', () => {
  it('keeps the whole number, unsigned', () => {
    expect(cleanRepsInput('8')).toBe('8');
    expect(cleanRepsInput('-8')).toBe('8');
    expect(cleanRepsInput('8.5')).toBe('8');
    expect(cleanRepsInput('1e3')).toBe('1');
    expect(cleanRepsInput('')).toBe('');
    expect(cleanRepsInput(null)).toBe('');
  });
  it('caps an absurd count', () => {
    expect(cleanRepsInput('123456')).toBe('123');
  });
});

describe('cleanWeightInput', () => {
  it('drops a minus sign — there is no negative load', () => {
    expect(cleanWeightInput('-60')).toBe('60');
  });
  it('keeps one decimal point and two places', () => {
    expect(cleanWeightInput('77.5')).toBe('77.5');
    expect(cleanWeightInput('77.')).toBe('77.');
    expect(cleanWeightInput('7.7.5')).toBe('7.75');
    expect(cleanWeightInput('77.555')).toBe('77.55');
  });
  it('reads a decimal comma as the point', () => {
    expect(cleanWeightInput('77,5')).toBe('77.5');
  });
  it('strips exponents and junk', () => {
    expect(cleanWeightInput('1e5')).toBe('15');
    expect(cleanWeightInput('abc')).toBe('');
  });
});

describe('checkStrengthSet', () => {
  it('accepts a real set', () => {
    expect(checkStrengthSet({ weight: '60', reps: '8' })).toEqual({ ok: true, weight: 60, reps: 8 });
  });
  it('refuses zero reps — "60 kg × 0" is not a set', () => {
    expect(checkStrengthSet({ weight: 60, reps: 0 }).ok).toBe(false);
    expect(checkStrengthSet({ weight: 60, reps: '' }).ok).toBe(false);
  });
  it('refuses negative or fractional reps and negative weight', () => {
    expect(checkStrengthSet({ weight: 60, reps: -8 }).ok).toBe(false);
    expect(checkStrengthSet({ weight: 60, reps: 2.5 }).ok).toBe(false);
    expect(checkStrengthSet({ weight: -60, reps: 8 }).ok).toBe(false);
  });
  it('treats an empty weight as a bodyweight or empty-bar set', () => {
    expect(checkStrengthSet({ weight: '', reps: 12 })).toEqual({ ok: true, weight: 0, reps: 12 });
  });
});
