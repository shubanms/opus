import { describe, it, expect } from 'vitest';
import { monthRange, yearRange, availablePeriods, buildWrapped } from './wrapped.js';

describe('monthRange / yearRange', () => {
  it('labels and bounds a month', () => {
    const r = monthRange('2026-05');
    expect(r.label).toBe('May 2026');
    expect(new Date(r.startMs).getMonth()).toBe(4);
    expect(r.endMs).toBeGreaterThan(r.startMs);
  });
  it('labels and bounds a year', () => {
    const r = yearRange('2026');
    expect(r.label).toBe('2026');
    expect(new Date(r.startMs).getFullYear()).toBe(2026);
    expect(new Date(r.endMs).getFullYear()).toBe(2027);
  });
});

describe('availablePeriods', () => {
  it('falls back to the current month/year with no workouts', () => {
    const p = availablePeriods([], new Date('2026-05-15T12:00:00'));
    expect(p.months).toHaveLength(1);
    expect(p.months[0].current).toBe(true);
    expect(p.years[0].key).toBe('2026');
  });
  it('spans from first workout to now, newest first', () => {
    const workouts = [{ date: '2026-03-02' }, { date: '2026-05-10' }];
    const p = availablePeriods(workouts, new Date('2026-05-15T12:00:00'));
    expect(p.months.map((m) => m.key)).toEqual(['2026-05', '2026-04', '2026-03']);
    expect(p.months[0].current).toBe(true);
    expect(p.years.map((y) => y.key)).toEqual(['2026']);
  });
});

describe('buildWrapped', () => {
  const range = monthRange('2026-05');
  const exName = { 1: 'Bench Press', 2: 'Squat' };
  const workouts = [
    { id: 10, date: '2026-05-04', status: 'completed', totalVolume: 3000, xpEarned: 120, duration: 3600 }, // Monday
    { id: 11, date: '2026-05-06', status: 'completed', totalVolume: 5000, xpEarned: 200, duration: 1800 }, // Wednesday
    { id: 99, date: '2026-04-30', status: 'completed', totalVolume: 9999, xpEarned: 999, duration: 999 },  // out of range
  ];
  const sets = [
    { workoutId: 10, exerciseId: 1, weight: 100, reps: 5, isWarmup: false },
    { workoutId: 11, exerciseId: 2, weight: 140, reps: 5, isWarmup: false },
    { workoutId: 11, exerciseId: 2, weight: 140, reps: 5, isWarmup: false },
    { workoutId: 99, exerciseId: 1, weight: 999, reps: 5, isWarmup: false },
  ];
  const prs = [{ achievedAt: new Date('2026-05-06').getTime(), type: 'weight' }, { achievedAt: new Date('2026-04-01').getTime(), type: 'weight' }];

  it('aggregates only in-range, completed data', () => {
    const w = buildWrapped(workouts, sets, prs, range, exName);
    expect(w.sessions).toBe(2);
    expect(w.volumeKg).toBe(8000);
    expect(w.sets).toBe(3);
    expect(w.prs).toBe(1);
    expect(w.xp).toBe(320);
    expect(w.hasData).toBe(true);
  });
  it('picks the top lift by set volume', () => {
    expect(buildWrapped(workouts, sets, prs, range, exName).topLift).toBe('Squat'); // 140x5x2 > 100x5
  });
  it('is empty for a range with no workouts', () => {
    const w = buildWrapped(workouts, sets, prs, monthRange('2026-01'), exName);
    expect(w.hasData).toBe(false);
    expect(w.sessions).toBe(0);
    expect(w.topLift).toBeNull();
  });
});

describe('calendar days, in any timezone', () => {
  // Run under UTC, Asia/Kolkata and America/Los_Angeles. `new Date('2027-01-01')`
  // is New Year's Eve evening in Los Angeles, which is where these broke.
  const ny = { id: 1, date: '2027-01-01', status: 'completed', totalVolume: 1000, duration: 3600 }; // a Friday

  it('counts a 1 January session in its own year and month', () => {
    expect(buildWrapped([ny], [], [], yearRange('2027')).sessions).toBe(1);
    expect(buildWrapped([ny], [], [], yearRange('2026')).sessions).toBe(0);
    expect(buildWrapped([ny], [], [], monthRange('2027-01')).sessions).toBe(1);
  });

  it('names the weekday the session was actually on', () => {
    const fridays = [ny, { ...ny, id: 2, date: '2027-01-08' }, { ...ny, id: 3, date: '2027-01-04' }]; // Fri, Fri, Mon
    expect(buildWrapped(fridays, [], [], monthRange('2027-01')).busiestDay).toBe('Fri');
  });

  it('starts the period list at the month of the first session', () => {
    const p = availablePeriods([{ date: '2026-03-01' }], new Date(2026, 4, 15, 12));
    expect(p.months.map((m) => m.key)).toEqual(['2026-05', '2026-04', '2026-03']);
  });

  it('buckets the sparkline by local Monday', () => {
    const ws = [
      { id: 1, date: '2026-05-04', status: 'completed', totalVolume: 100 }, // Mon
      { id: 2, date: '2026-05-10', status: 'completed', totalVolume: 50 },  // Sun, same week
      { id: 3, date: '2026-05-11', status: 'completed', totalVolume: 70 },  // next Mon
    ];
    expect(buildWrapped(ws, [], [], monthRange('2026-05')).series).toEqual([150, 70]);
  });
});
