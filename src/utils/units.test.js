import { describe, it, expect } from 'vitest';
import { toDisplay, toKg, unitLabel, fmtWeight, fmtVolume, LB_PER_KG } from './units.js';

describe('units', () => {
  it('kg passes through unchanged', () => {
    expect(toDisplay(100, 'kg')).toBe(100);
    expect(toKg(100, 'kg')).toBe(100);
    expect(unitLabel('kg')).toBe('kg');
  });

  it('converts kg <-> lbs and round-trips closely', () => {
    expect(toDisplay(100, 'lbs')).toBeCloseTo(100 * LB_PER_KG, 1);
    expect(unitLabel('lbs')).toBe('lbs');
    const back = toKg(toDisplay(100, 'lbs'), 'lbs');
    expect(back).toBeCloseTo(100, 1);
  });

  it('formats weight and volume with the unit label', () => {
    expect(fmtWeight(100, 'kg')).toBe('100 kg');
    expect(fmtVolume(1000, 'kg')).toBe('1,000 kg');
  });

  it('handles empty / invalid input', () => {
    expect(toKg('', 'kg')).toBe(0);
    expect(fmtWeight(null, 'kg')).toBe('—');
  });
});
