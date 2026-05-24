import { describe, it, expect } from 'vitest';
import { calcPlates, nearestLoadable, PLATES_LB } from './plateCalc.js';

describe('calcPlates (kg)', () => {
  it('returns no plates when target ≤ bar', () => {
    expect(calcPlates(20, 20)).toEqual([]);
    expect(calcPlates(0, 20)).toEqual([]);
  });

  it('computes plates per side', () => {
    // (100 - 20) / 2 = 40 per side → 25 + 15
    expect(calcPlates(100, 20)).toEqual([{ kg: 25, count: 1 }, { kg: 15, count: 1 }]);
  });

  it('per-side total matches the target', () => {
    const plates = calcPlates(140, 20);
    const perSide = plates.reduce((s, p) => s + p.kg * p.count, 0);
    expect(20 + perSide * 2).toBe(140);
  });
});

describe('calcPlates (lb)', () => {
  it('uses the lb plate set', () => {
    // (135 - 45) / 2 = 45 → one 45
    expect(calcPlates(135, 45, PLATES_LB)).toEqual([{ kg: 45, count: 1 }]);
  });
});

describe('nearestLoadable', () => {
  it('returns an achievable weight', () => {
    expect(nearestLoadable(100, 20)).toBe(100);
    expect(nearestLoadable(101, 20)).toBeLessThanOrEqual(101);
  });
});
