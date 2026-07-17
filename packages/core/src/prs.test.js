import { describe, it, expect } from 'vitest';
import { bestOfSession, detectPRs, prTypeLabel, PR_TYPES } from './prs.js';

describe('bestOfSession', () => {
  it('takes per-set maxes and ignores warmups', () => {
    const best = bestOfSession([
      { weight: 100, reps: 5, isWarmup: false },
      { weight: 120, reps: 3, isWarmup: false },
      { weight: 200, reps: 10, isWarmup: true }, // warmup ignored
    ]);
    expect(best).toEqual({ weight: 120, reps: 5, volume: 100 * 5 }); // 500 > 360
  });

  it('is zeroed for an empty session', () => {
    expect(bestOfSession([])).toEqual({ weight: 0, reps: 0, volume: 0 });
  });

  it('coerces nullish weight/reps to 0', () => {
    expect(bestOfSession([{ reps: 8 }])).toEqual({ weight: 0, reps: 8, volume: 0 });
  });
});

describe('detectPRs', () => {
  it('returns every type beaten vs no prior records', () => {
    const prs = detectPRs([], [{ weight: 100, reps: 5 }]);
    expect(prs).toEqual([
      { type: 'weight', value: 100 },
      { type: 'reps', value: 5 },
      { type: 'volume', value: 500 },
    ]);
  });

  it('only returns types that strictly beat the stored record', () => {
    const existing = [
      { type: 'weight', value: 120 },
      { type: 'reps', value: 5 },
      { type: 'volume', value: 500 },
    ];
    // heavier weight, same reps, lower single-set volume → only weight PR
    const prs = detectPRs(existing, [{ weight: 130, reps: 3 }]);
    expect(prs).toEqual([{ type: 'weight', value: 130 }]);
  });

  it('returns nothing when nothing is beaten', () => {
    const existing = [{ type: 'weight', value: 200 }, { type: 'reps', value: 20 }, { type: 'volume', value: 4000 }];
    expect(detectPRs(existing, [{ weight: 100, reps: 5 }])).toEqual([]);
  });

  it('ties do not count as a PR', () => {
    expect(detectPRs([{ type: 'weight', value: 100 }], [{ weight: 100, reps: 1 }]))
      .not.toContainEqual({ type: 'weight', value: 100 });
  });
});

describe('prTypeLabel', () => {
  it('labels the three PR types', () => {
    expect(PR_TYPES.map(prTypeLabel)).toEqual(['Heaviest weight', 'Most reps', 'Best volume']);
  });
});
