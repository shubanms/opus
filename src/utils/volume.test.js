import { describe, it, expect } from 'vitest';
import { setLoad } from './volume.js';

describe('setLoad', () => {
  it('returns the loaded weight for non-bodyweight sets', () => {
    expect(setLoad(60, false, 80)).toBe(60);
  });
  it('adds bodyweight for bodyweight exercises', () => {
    expect(setLoad(0, true, 80)).toBe(80);
    expect(setLoad(20, true, 80)).toBe(100); // weighted dip
  });
  it('handles missing bodyweight', () => {
    expect(setLoad(0, true, null)).toBe(0);
  });
});
