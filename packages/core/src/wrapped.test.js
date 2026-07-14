import { describe, it, expect } from 'vitest';
import { monthRange, yearRange, rangeOf, availablePeriods, buildWrapped } from './wrapped.js';

describe('ranges', () => {
  it('monthRange spans the calendar month', () => {
    const r = monthRange('2026-03');
    expect(r.label).toBe('March 2026');
    expect(new Date(r.startMs).getMonth()).toBe(2); // March (local)
    expect(r.endMs).toBe(new Date(2026, 3, 1).getTime());
  });
  it('yearRange spans the calendar year', () => {
    const r = yearRange('2026');
    expect(r.label).toBe('2026');
    expect(r.startMs).toBe(new Date(2026, 0, 1).getTime());
  });
  it('rangeOf picks month vs year by kind', () => {
    expect(rangeOf({ kind: 'year', key: '2026' }).label).toBe('2026');
    expect(rangeOf({ kind: 'month', key: '2026-03' }).label).toBe('March 2026');
  });
});

describe('availablePeriods', () => {
  it('lists months newest-first from first workout to now + years', () => {
    const now = new Date(2026, 2, 10); // March 2026
    const { months, years } = availablePeriods([{ date: '2026-01-05' }], now);
    expect(months.map((m) => m.key)).toEqual(['2026-03', '2026-02', '2026-01']);
    expect(months[0].current).toBe(true);
    expect(years.map((y) => y.key)).toEqual(['2026']);
  });
  it('falls back to the current month/year with no workouts', () => {
    const now = new Date(2026, 5, 1);
    const { months, years } = availablePeriods([], now);
    expect(months).toHaveLength(1);
    expect(months[0].current).toBe(true);
    expect(years[0].key).toBe('2026');
  });
});

describe('buildWrapped', () => {
  const range = monthRange('2026-03');
  const workouts = [
    { id: 1, status: 'completed', date: '2026-03-02', totalVolume: 1000, xpEarned: 100, duration: 3600 },
    { id: 2, status: 'completed', date: '2026-03-16', totalVolume: 2000, xpEarned: 200, duration: 1800 },
    { id: 3, status: 'completed', date: '2026-02-20', totalVolume: 999, xpEarned: 5, duration: 60 }, // out of range
    { id: 4, status: 'active',    date: '2026-03-10', totalVolume: 500 },                             // not completed
  ];
  const sets = [
    { workoutId: 1, exerciseId: 7, weight: 100, reps: 5 },
    { workoutId: 2, exerciseId: 7, weight: 100, reps: 5 },
    { workoutId: 2, exerciseId: 9, weight: 50, reps: 10 },
    { workoutId: 2, exerciseId: 9, weight: 50, reps: 10, isWarmup: true }, // excluded
    { workoutId: 3, exerciseId: 7, weight: 999, reps: 1 },                 // out of range
  ];
  const prs = [{ achievedAt: new Date(2026, 2, 5).getTime() }, { achievedAt: new Date(2026, 1, 1).getTime() }];

  it('aggregates only completed, in-range work', () => {
    const w = buildWrapped(workouts, sets, prs, range, { 7: 'Bench Press', 9: 'Row' });
    expect(w.sessions).toBe(2);
    expect(w.volumeKg).toBe(3000);
    expect(w.sets).toBe(3); // warmup excluded, out-of-range excluded
    expect(w.prs).toBe(1); // only the March PR
    expect(w.xp).toBe(300);
    expect(w.hours).toBeCloseTo(1.5, 5);
    expect(w.topLift).toBe('Bench Press'); // 100*5 + 100*5 = 1000 vs Row 500
    expect(w.hasData).toBe(true);
    expect(w.series.reduce((a, b) => a + b, 0)).toBe(3000);
  });
  it('reports no data for an empty range', () => {
    const w = buildWrapped(workouts, sets, prs, yearRange('2020'));
    expect(w.hasData).toBe(false);
    expect(w.sessions).toBe(0);
    expect(w.topLift).toBeNull();
  });
});
