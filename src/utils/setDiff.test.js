import { describe, it, expect } from 'vitest';
import { setVolume, diffSet, alignSets, diffsBySetNumber } from './setDiff.js';

describe('setVolume', () => {
  it('is weight × reps for loaded sets', () => {
    expect(setVolume({ weight: 100, reps: 5 })).toBe(500);
  });
  it('ranks bodyweight sets by reps (weight 0 → 1×reps)', () => {
    expect(setVolume({ weight: 0, reps: 12 })).toBe(12);
  });
  it('is 0 for a missing set', () => {
    expect(setVolume(null)).toBe(0);
  });
});

describe('diffSet', () => {
  it('flags a heavier/higher-volume set as up', () => {
    const d = diffSet({ weight: 102.5, reps: 5 }, { weight: 100, reps: 5 });
    expect(d.dir).toBe('up');
    expect(d.weightDelta).toBeCloseTo(2.5);
    expect(d.repsDelta).toBe(0);
    expect(d.volumeDelta).toBeCloseTo(12.5);
  });
  it('flags a lighter set as down', () => {
    expect(diffSet({ weight: 90, reps: 5 }, { weight: 100, reps: 5 }).dir).toBe('down');
  });
  it('flags identical work as same', () => {
    const d = diffSet({ weight: 100, reps: 5 }, { weight: 100, reps: 5 });
    expect(d.dir).toBe('same');
    expect(d.weightDelta).toBe(0);
    expect(d.repsDelta).toBe(0);
  });
  it('marks a set with no prior as new', () => {
    expect(diffSet({ weight: 100, reps: 5 }, null).dir).toBe('new');
  });
  it('ranks bodyweight reps when weight is 0', () => {
    expect(diffSet({ weight: 0, reps: 12 }, { weight: 0, reps: 10 }).dir).toBe('up');
    expect(diffSet({ weight: 0, reps: 8 }, { weight: 0, reps: 10 }).dir).toBe('down');
  });
  it('reports reps improvement at equal weight as up', () => {
    const d = diffSet({ weight: 100, reps: 6 }, { weight: 100, reps: 5 });
    expect(d.dir).toBe('up');
    expect(d.repsDelta).toBe(1);
  });
});

describe('alignSets', () => {
  it('aligns working sets by order and strips warmups from both sides', () => {
    const cur = [
      { setNumber: 1, weight: 60, reps: 8, isWarmup: true },
      { setNumber: 2, weight: 100, reps: 5 },
      { setNumber: 3, weight: 100, reps: 6 },
    ];
    const prev = [
      { setNumber: 1, weight: 40, reps: 10, isWarmup: true },
      { setNumber: 2, weight: 100, reps: 5 },
      { setNumber: 3, weight: 100, reps: 5 },
    ];
    const aligned = alignSets(cur, prev);
    expect(aligned).toHaveLength(2); // warmups dropped
    expect(aligned[0].diff.dir).toBe('same');
    expect(aligned[1].diff.dir).toBe('up');
  });
  it('marks extra current sets as new when the prior session had fewer', () => {
    const cur = [{ setNumber: 1, weight: 100, reps: 5 }, { setNumber: 2, weight: 100, reps: 5 }];
    const prev = [{ setNumber: 1, weight: 100, reps: 5 }];
    const aligned = alignSets(cur, prev);
    expect(aligned[1].diff.dir).toBe('new');
  });
  it('handles an empty prior session (all new)', () => {
    const aligned = alignSets([{ setNumber: 1, weight: 100, reps: 5 }], []);
    expect(aligned[0].diff.dir).toBe('new');
  });
});

describe('diffsBySetNumber', () => {
  it('keys diffs by the current set number, skipping warmups', () => {
    const cur = [
      { setNumber: 1, weight: 60, reps: 8, isWarmup: true },
      { setNumber: 2, weight: 100, reps: 6 },
    ];
    const prev = [{ setNumber: 1, weight: 100, reps: 5 }];
    const map = diffsBySetNumber(cur, prev);
    expect(map[1]).toBeUndefined();
    expect(map[2].dir).toBe('up');
  });
});
