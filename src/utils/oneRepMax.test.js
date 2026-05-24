import { describe, it, expect } from 'vitest';
import { epley1RM } from './oneRepMax.js';

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
