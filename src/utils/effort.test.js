import { describe, it, expect } from 'vitest';
import { EFFORT, EFFORT_LEVELS, effortMeta, effortFromRpe, sessionEffort } from './effort.js';

describe('EFFORT_LEVELS', () => {
  it('maps every preset onto the stored 6-10 scale', () => {
    for (const level of EFFORT_LEVELS) {
      expect(level.rpe).toBeGreaterThanOrEqual(6);
      expect(level.rpe).toBeLessThanOrEqual(10);
    }
  });

  it('gets harder in the order it is offered', () => {
    const rpes = EFFORT_LEVELS.map((l) => l.rpe);
    expect([...rpes].sort((a, b) => a - b)).toEqual(rpes);
  });

  it('round-trips: every preset reads back as itself', () => {
    // The bucketing in effortFromRpe must not disagree with the presets it
    // renders — otherwise tapping "Hard" would display as "Easy".
    for (const level of EFFORT_LEVELS) {
      expect(effortFromRpe(level.rpe).key).toBe(level.key);
    }
  });
});

describe('effortMeta', () => {
  it('looks up a preset', () => {
    expect(effortMeta(EFFORT.HARD).label).toBe('Hard');
  });

  it('is null for anything else', () => {
    expect(effortMeta('nonsense')).toBe(null);
    expect(effortMeta(undefined)).toBe(null);
  });
});

describe('effortFromRpe', () => {
  it('buckets values the precise picker can produce', () => {
    expect(effortFromRpe(6).key).toBe(EFFORT.EASY);
    expect(effortFromRpe(8).key).toBe(EFFORT.HARD);
    expect(effortFromRpe(9).key).toBe(EFFORT.HARD);
    expect(effortFromRpe(10).key).toBe(EFFORT.MAX);
  });

  it('is null for unrated sets', () => {
    expect(effortFromRpe(null)).toBe(null);
    expect(effortFromRpe(undefined)).toBe(null);
    expect(effortFromRpe(0)).toBe(null);
    expect(effortFromRpe('abc')).toBe(null);
  });

  it('clamps above the scale rather than returning nothing', () => {
    expect(effortFromRpe(11).key).toBe(EFFORT.MAX);
  });
});

describe('sessionEffort', () => {
  const set = (rpe, isWarmup = false) => ({ rpe, isWarmup });

  it('summarises a fully rated session', () => {
    const s = sessionEffort([set(7), set(9), set(10)]);
    expect(s).toEqual({ rated: 3, total: 3, avgRpe: 8.7, hardSets: 1, maxSets: 1, coverage: 1 });
  });

  it('ignores warm-ups', () => {
    const s = sessionEffort([set(10, true), set(7)]);
    expect(s.total).toBe(1);
    expect(s.rated).toBe(1);
    expect(s.avgRpe).toBe(7);
  });

  it('reports coverage so callers know how much to trust the average', () => {
    // Two rated sets out of ten is not a fact about the session.
    const sets = [set(10), set(10), ...Array.from({ length: 8 }, () => set(null))];
    const s = sessionEffort(sets);
    expect(s.avgRpe).toBe(10);
    expect(s.coverage).toBeCloseTo(0.2);
  });

  it('handles a session with nothing rated', () => {
    const s = sessionEffort([set(null), set(null)]);
    expect(s).toEqual({ rated: 0, total: 2, avgRpe: null, hardSets: 0, maxSets: 0, coverage: 0 });
  });

  it('survives empty and junk input', () => {
    expect(sessionEffort([]).rated).toBe(0);
    expect(sessionEffort(undefined).rated).toBe(0);
    expect(sessionEffort([null, undefined]).total).toBe(0);
  });
});
