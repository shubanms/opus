import { describe, it, expect } from 'vitest';
import { decideProgression, PROGRESSION_DEFAULTS } from './progression.js';

const sets = (reps, weight, n = 3) => Array.from({ length: n }, () => ({ reps, weight }));

describe('decideProgression', () => {
  it('does nothing when mode is off', () => {
    const r = decideProgression({ targetWeight: 100, targetReps: 5, targetSets: 3 }, sets(5, 100), { mode: 'off' });
    expect(r.action).toBe('off');
    expect(r.targetWeight).toBe(100);
  });

  it('does nothing with no working sets', () => {
    expect(decideProgression({ targetWeight: 100 }, [], { mode: 'linear' }).action).toBe('off');
  });

  it('bumps weight by the step when all sets hit target reps at weight', () => {
    const r = decideProgression({ targetWeight: 100, targetReps: 5, targetSets: 3 }, sets(5, 100), { mode: 'linear' });
    expect(r.action).toBe('increase');
    expect(r.targetWeight).toBe(102.5);
    expect(r.misses).toBe(0);
  });

  it('holds and counts a miss when reps fall short (linear)', () => {
    const r = decideProgression({ targetWeight: 100, targetReps: 5, targetSets: 3, misses: 0 }, sets(4, 100), { mode: 'linear' });
    expect(r.action).toBe('hold');
    expect(r.targetWeight).toBe(100);
    expect(r.misses).toBe(1);
  });

  it('deloads 10% after the configured consecutive misses (linear)', () => {
    const r = decideProgression({ targetWeight: 100, targetReps: 5, targetSets: 3, misses: 1 }, sets(4, 100), { mode: 'linear', deloadAfterMisses: 2 });
    expect(r.action).toBe('deload');
    expect(r.targetWeight).toBe(90);
    expect(r.misses).toBe(0);
  });

  it('double progression holds on a miss and never deloads', () => {
    const r = decideProgression({ targetWeight: 100, targetReps: 8, targetSets: 3, misses: 5 }, sets(6, 100), { mode: 'double' });
    expect(r.action).toBe('hold');
    expect(r.targetWeight).toBe(100);
    expect(r.misses).toBe(0);
  });

  it('progresses reps (not weight) for a bodyweight target', () => {
    const r = decideProgression({ targetWeight: 0, targetReps: 10, targetSets: 3 }, sets(10, 0), { mode: 'linear' });
    expect(r.action).toBe('increase');
    expect(r.targetWeight).toBe(0);
    expect(r.targetReps).toBe(11);
  });

  it('needs enough sets, not just enough reps', () => {
    const r = decideProgression({ targetWeight: 100, targetReps: 5, targetSets: 4 }, sets(5, 100, 2), { mode: 'linear' });
    expect(r.action).toBe('hold');
  });

  it('uses a custom weight step', () => {
    const r = decideProgression({ targetWeight: 60, targetReps: 8, targetSets: 3 }, sets(8, 60), { mode: 'linear', weightStep: 5 });
    expect(r.targetWeight).toBe(65);
  });

  it('exposes sane defaults', () => {
    expect(PROGRESSION_DEFAULTS).toMatchObject({ mode: 'off', weightStep: 2.5, deloadAfterMisses: 2 });
  });
});
