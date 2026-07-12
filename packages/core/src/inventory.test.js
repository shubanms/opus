import { describe, it, expect } from 'vitest';
import { togglePlate, effectivePlates } from './inventory.js';

describe('togglePlate', () => {
  it('removes an owned plate', () => {
    expect(togglePlate([25, 20, 10], 20)).toEqual([25, 10]);
  });
  it('adds a missing plate, sorted heaviest-first', () => {
    expect(togglePlate([25, 10], 20)).toEqual([25, 20, 10]);
  });
  it('dedupes', () => {
    expect(togglePlate([25, 25, 10], 5)).toEqual([25, 10, 5]);
  });
});

describe('effectivePlates', () => {
  const standard = [25, 20, 15, 10, 5, 2.5];
  it('falls back to standard when no custom list', () => {
    expect(effectivePlates(null, 'kg', standard)).toBe(standard);
    expect(effectivePlates({ plates: [], unit: 'kg' }, 'kg', standard)).toBe(standard);
  });
  it('uses the custom list when defined in the current unit', () => {
    expect(effectivePlates({ plates: [20, 10, 5], unit: 'kg' }, 'kg', standard)).toEqual([20, 10, 5]);
  });
  it('ignores a custom list defined in a different unit', () => {
    expect(effectivePlates({ plates: [45, 25], unit: 'lbs' }, 'kg', standard)).toBe(standard);
  });
});
