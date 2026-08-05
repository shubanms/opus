import { describe, it, expect } from 'vitest';
import {
  niceTicks,
  padDomain,
  compactNumber,
  nearestIndex,
  tickIndices,
  radarPoint,
  polygonPath,
  radialAnchor,
  roundedTopRect,
} from './chartMath.js';

describe('niceTicks', () => {
  it('snaps to human steps', () => {
    expect(niceTicks(0, 100, 3)).toEqual([0, 50, 100]);
    expect(niceTicks(0, 10, 3)).toEqual([0, 5, 10]);
  });

  it('stays inside the domain', () => {
    const ticks = niceTicks(37, 212, 3);
    expect(Math.min(...ticks)).toBeGreaterThanOrEqual(37);
    expect(Math.max(...ticks)).toBeLessThanOrEqual(212);
  });

  it('does not drift on long runs', () => {
    // Accumulating `v += 0.2` reaches 0.6000000000000001 by the third tick, and
    // an axis label of "0.6000000000000001" is a rendering bug people notice.
    const ticks = niceTicks(0, 1, 5);
    expect(ticks).toContain(0.6);
    expect(ticks).toContain(0.8);
  });

  it('returns nothing for a degenerate domain', () => {
    expect(niceTicks(5, 5)).toEqual([]);
    expect(niceTicks(10, 2)).toEqual([]);
    expect(niceTicks(Number.NaN, 10)).toEqual([]);
  });

  it('handles large volumes', () => {
    const ticks = niceTicks(0, 48000, 4);
    expect(ticks[0]).toBe(0);
    expect(ticks.every((t) => Number.isInteger(t))).toBe(true);
  });
});

describe('padDomain', () => {
  it('adds headroom at both ends', () => {
    const [lo, hi] = padDomain([50, 100]);
    expect(lo).toBeGreaterThan(0);
    expect(lo).toBeLessThan(50);
    expect(hi).toBeGreaterThan(100);
  });

  it('gives a flat series a visible span', () => {
    const [lo, hi] = padDomain([80, 80, 80]);
    expect(hi).toBeGreaterThan(lo);
    expect(lo).toBeLessThan(80);
    expect(hi).toBeGreaterThan(80);
  });

  it('gives a single point a visible span', () => {
    const [lo, hi] = padDomain([42]);
    expect(hi).toBeGreaterThan(lo);
  });

  it('handles an all-zero series without collapsing', () => {
    const [lo, hi] = padDomain([0, 0]);
    expect(hi).toBeGreaterThan(lo);
  });

  it('starts at zero when asked', () => {
    expect(padDomain([100, 200], { zeroBased: true })[0]).toBe(0);
  });

  it('never pads a non-negative series below zero', () => {
    // Padding [0, 5] downward would put the floor at -0.6, and an axis reading
    // "-0.6 reps" is a lie about data that cannot go negative.
    expect(padDomain([0, 5])[0]).toBe(0);
  });

  it('does allow negatives when the data has them', () => {
    expect(padDomain([-5, 5])[0]).toBeLessThan(-5);
  });

  it('survives empty and non-numeric input', () => {
    expect(padDomain([])).toEqual([0, 1]);
    expect(padDomain(undefined)).toEqual([0, 1]);
    expect(padDomain([Number.NaN, null])).toEqual([0, 1]);
  });
});

describe('compactNumber', () => {
  it('compacts thousands and millions', () => {
    expect(compactNumber(1240)).toBe('1.2k');
    expect(compactNumber(12400)).toBe('12k');
    expect(compactNumber(2400000)).toBe('2.4M');
  });

  it('drops a trailing .0', () => {
    expect(compactNumber(2000)).toBe('2k');
  });

  it('leaves small numbers alone', () => {
    expect(compactNumber(0)).toBe('0');
    expect(compactNumber(87)).toBe('87');
    expect(compactNumber(87.5)).toBe('87.5');
  });

  it('handles negatives and rubbish', () => {
    expect(compactNumber(-1500)).toBe('-1.5k');
    expect(compactNumber(Number.NaN)).toBe('');
  });
});

describe('nearestIndex', () => {
  const xs = [0, 10, 20, 30];

  it('finds the closest position', () => {
    expect(nearestIndex(xs, 12)).toBe(1);
    expect(nearestIndex(xs, 26)).toBe(3);
  });

  it('clamps past either end', () => {
    expect(nearestIndex(xs, -50)).toBe(0);
    expect(nearestIndex(xs, 500)).toBe(3);
  });

  it('returns null with nothing to hit', () => {
    expect(nearestIndex([], 5)).toBe(null);
    expect(nearestIndex(undefined, 5)).toBe(null);
  });
});

describe('tickIndices', () => {
  it('keeps every label when they fit', () => {
    expect(tickIndices(4, 5)).toEqual([0, 1, 2, 3]);
  });

  it('thins and always keeps both ends', () => {
    const out = tickIndices(12, 4);
    expect(out[0]).toBe(0);
    expect(out[out.length - 1]).toBe(11);
    expect(out.length).toBeLessThanOrEqual(4);
  });

  it('never puts two labels on adjacent points', () => {
    // Ten sessions into seven slots is the case that rendered "07-0607-12":
    // spreading and rounding produced 0,2,3,5,6,8,9 and 2/3 overlapped.
    for (let count = 2; count <= 40; count += 1) {
      for (let max = 2; max <= 8; max += 1) {
        const out = tickIndices(count, max);
        if (count <= max) continue;
        const gaps = out.slice(1).map((v, i) => v - out[i]);
        expect(Math.min(...gaps)).toBeGreaterThanOrEqual(2);
      }
    }
  });

  it('stays within the requested budget', () => {
    for (let count = 2; count <= 40; count += 1) {
      for (let max = 2; max <= 8; max += 1) {
        expect(tickIndices(count, max).length).toBeLessThanOrEqual(Math.max(max, 2));
      }
    }
  });

  it('never repeats an index', () => {
    const out = tickIndices(6, 5);
    expect(new Set(out).size).toBe(out.length);
  });

  it('handles the empty and single cases', () => {
    expect(tickIndices(0)).toEqual([]);
    expect(tickIndices(1)).toEqual([0]);
  });
});

describe('radarPoint', () => {
  it('puts slot 0 at twelve o’clock', () => {
    const p = radarPoint(0, 5, 100, 100, 50);
    expect(p.x).toBeCloseTo(0);
    expect(p.y).toBeCloseTo(-50); // SVG y grows downward
  });

  it('runs clockwise', () => {
    expect(radarPoint(1, 4, 100, 100, 50).x).toBeCloseTo(50);
  });

  it('scales the radius by the value', () => {
    const p = radarPoint(0, 4, 50, 100, 80);
    expect(p.y).toBeCloseTo(-40);
  });

  it('clamps an overshooting stat to the rim', () => {
    expect(radarPoint(0, 4, 250, 100, 50).y).toBeCloseTo(-50);
  });

  it('clamps a negative stat to the centre', () => {
    const p = radarPoint(0, 4, -10, 100, 50);
    expect(p.x).toBe(0);
    expect(p.y).toBe(0);
  });

  it('survives a zero max and a missing value', () => {
    expect(radarPoint(0, 4, 10, 0, 50).y).toBeCloseTo(-50);
    expect(radarPoint(0, 4, undefined, 100, 50).y).toBe(0);
  });
});

describe('polygonPath', () => {
  it('closes the path', () => {
    const d = polygonPath([{ x: 0, y: 0 }, { x: 1, y: 2 }]);
    expect(d).toBe('M0,0L1,2Z');
  });

  it('is empty for no points', () => {
    expect(polygonPath([])).toBe('');
    expect(polygonPath(undefined)).toBe('');
  });
});

describe('roundedTopRect', () => {
  it('starts and ends on the baseline', () => {
    const d = roundedTopRect(10, 20, 30, 40, 5);
    expect(d.startsWith('M10,60')).toBe(true);
    expect(d.endsWith('60Z')).toBe(true);
  });

  it('clamps the radius to a short bar', () => {
    // A 2px-tall bar with a 5px radius would curve past its own top edge.
    const d = roundedTopRect(0, 0, 20, 2, 5);
    expect(d).toContain('L0,2');
  });

  it('clamps the radius to a narrow bar', () => {
    expect(() => roundedTopRect(0, 0, 4, 50, 5)).not.toThrow();
    expect(roundedTopRect(0, 0, 4, 50, 5)).toContain('Q4,0');
  });

  it('renders nothing for a zero-size bar', () => {
    expect(roundedTopRect(0, 0, 0, 40)).toBe('');
    expect(roundedTopRect(0, 0, 20, 0)).toBe('');
  });

  it('does not emit float noise', () => {
    expect(roundedTopRect(0.1, 0, 0.2, 10, 0)).not.toMatch(/\d{8}/);
  });
});

describe('radialAnchor', () => {
  it('anchors by which side of the centre the label sits on', () => {
    expect(radialAnchor(0)).toBe('start'); // 3 o'clock
    expect(radialAnchor(Math.PI)).toBe('end'); // 9 o'clock
    expect(radialAnchor(-Math.PI / 2)).toBe('middle'); // 12 o'clock
  });
});
