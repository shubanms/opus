import { describe, it, expect } from 'vitest';
import { monthKeyOf, previousSnapshot, mergeRadarSeries } from './snapshots.js';

describe('monthKeyOf', () => {
  it('formats YYYY-MM with a padded month', () => {
    expect(monthKeyOf(new Date('2026-05-24T10:00:00'))).toBe('2026-05');
    expect(monthKeyOf(new Date('2026-01-02T10:00:00'))).toBe('2026-01');
  });
});

describe('previousSnapshot', () => {
  const snaps = {
    '2026-03': { stats: [{ axis: 'Strength', value: 10 }] },
    '2026-04': { stats: [{ axis: 'Strength', value: 20 }] },
  };
  it('returns the latest month strictly before the key', () => {
    expect(previousSnapshot(snaps, '2026-05').stats[0].value).toBe(20);
    expect(previousSnapshot(snaps, '2026-04').stats[0].value).toBe(10);
  });
  it('returns null when none precede', () => {
    expect(previousSnapshot(snaps, '2026-03')).toBeNull();
    expect(previousSnapshot({}, '2026-05')).toBeNull();
  });
});

describe('mergeRadarSeries', () => {
  const current = [
    { axis: 'Strength', value: 50 },
    { axis: 'Power', value: 30 },
  ];
  it('aligns previous values by axis', () => {
    const prev = { stats: [{ axis: 'Strength', value: 40 }, { axis: 'Power', value: 35 }] };
    expect(mergeRadarSeries(current, prev)).toEqual([
      { axis: 'Strength', value: 50, valuePrev: 40 },
      { axis: 'Power', value: 30, valuePrev: 35 },
    ]);
  });
  it('uses null when a previous axis is missing', () => {
    const merged = mergeRadarSeries(current, { stats: [{ axis: 'Strength', value: 40 }] });
    expect(merged[1].valuePrev).toBeNull();
  });
  it('handles no previous snapshot', () => {
    expect(mergeRadarSeries(current, null).every((d) => d.valuePrev === null)).toBe(true);
  });
});
