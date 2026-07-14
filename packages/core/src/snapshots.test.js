import { describe, it, expect } from 'vitest';
import { monthKeyOf, previousSnapshot, mergeRadarSeries } from './snapshots.js';

describe('monthKeyOf', () => {
  it('formats YYYY-MM with a zero-padded month', () => {
    expect(monthKeyOf(new Date(2026, 0, 15))).toBe('2026-01');
    expect(monthKeyOf(new Date(2026, 11, 1))).toBe('2026-12');
  });
});

describe('previousSnapshot', () => {
  const snaps = {
    '2026-01': { stats: [{ axis: 'Strength', value: 10 }] },
    '2026-03': { stats: [{ axis: 'Strength', value: 30 }] },
    '2026-05': { stats: [{ axis: 'Strength', value: 50 }] },
  };
  it('returns the latest month strictly before the key', () => {
    expect(previousSnapshot(snaps, '2026-05').stats[0].value).toBe(30);
    expect(previousSnapshot(snaps, '2026-04').stats[0].value).toBe(30);
  });
  it('returns null when nothing precedes', () => {
    expect(previousSnapshot(snaps, '2026-01')).toBeNull();
    expect(previousSnapshot({}, '2026-05')).toBeNull();
  });
});

describe('mergeRadarSeries', () => {
  it('aligns previous values by axis, null when missing', () => {
    const current = [{ axis: 'A', value: 5 }, { axis: 'B', value: 8 }];
    const prev = { stats: [{ axis: 'A', value: 3 }] };
    expect(mergeRadarSeries(current, prev)).toEqual([
      { axis: 'A', value: 5, valuePrev: 3 },
      { axis: 'B', value: 8, valuePrev: null },
    ]);
  });
  it('handles a null previous snapshot', () => {
    expect(mergeRadarSeries([{ axis: 'A', value: 5 }], null)).toEqual([
      { axis: 'A', value: 5, valuePrev: null },
    ]);
  });
});
