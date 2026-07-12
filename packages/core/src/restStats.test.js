import { describe, it, expect } from 'vitest';
import { restGaps, avgRest, avgRestAcross, formatRest } from './restStats.js';

const sets = [
  { completedAt: 0 },
  { completedAt: 90_000 },   // +90s
  { completedAt: 210_000 },  // +120s
];

describe('restGaps', () => {
  it('returns seconds between consecutive completions', () => {
    expect(restGaps(sets)).toEqual([90, 120]);
  });
  it('handles fewer than two sets', () => {
    expect(restGaps([{ completedAt: 1 }])).toEqual([]);
    expect(restGaps([])).toEqual([]);
  });
});

describe('avgRest', () => {
  it('averages the gaps', () => {
    expect(avgRest(sets)).toBe(105);
    expect(avgRest([])).toBeNull();
  });
});

describe('avgRestAcross', () => {
  it('averages gaps across exercises', () => {
    expect(avgRestAcross([sets, [{ completedAt: 0 }, { completedAt: 60_000 }]])).toBe(90); // [90,120,60]
  });
});

describe('formatRest', () => {
  it('formats m:ss / s', () => {
    expect(formatRest(105)).toBe('1:45');
    expect(formatRest(45)).toBe('45s');
    expect(formatRest(null)).toBe('—');
  });
});
