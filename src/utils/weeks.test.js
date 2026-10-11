import { describe, it, expect } from 'vitest';
import { mondayKey, lastWeeks, inWeekOf, weeklyTotals, weekToDate } from './weeks.js';

// These run under UTC, Asia/Kolkata and America/Los_Angeles (see the package
// notes). Every expectation is in local calendar terms, so they must hold in
// all three — the old `new Date(key)` bucketing failed them west of UTC.

describe('mondayKey', () => {
  it('maps every day of a week onto its Monday', () => {
    // 5 Oct 2026 is a Monday.
    for (const k of ['2026-10-05', '2026-10-06', '2026-10-08', '2026-10-11']) {
      expect(mondayKey(k)).toBe('2026-10-05');
    }
  });
  it('keeps a Monday in its own week (the west-of-UTC failure)', () => {
    // Parsed as UTC, "2026-10-05" is Sunday evening in Los Angeles and used to
    // land in the week of 28 Sep.
    expect(mondayKey('2026-10-05')).toBe('2026-10-05');
    expect(mondayKey('2026-10-04')).toBe('2026-09-28');
  });
  it('crosses month, year and clock-change boundaries', () => {
    expect(mondayKey('2026-11-01')).toBe('2026-10-26'); // Sunday; US clocks go back
    expect(mondayKey('2026-03-08')).toBe('2026-03-02'); // Sunday; US clocks go forward
    expect(mondayKey('2027-01-01')).toBe('2026-12-28');
  });
  it('is null for junk', () => {
    expect(mondayKey('')).toBeNull();
    expect(mondayKey(undefined)).toBeNull();
  });
});

describe('lastWeeks', () => {
  it('lists Mondays oldest first, ending with this week', () => {
    expect(lastWeeks('2026-10-07', 3)).toEqual(['2026-09-21', '2026-09-28', '2026-10-05']);
  });
  it('steps a whole week across a clock change', () => {
    expect(lastWeeks('2026-11-04', 2)).toEqual(['2026-10-26', '2026-11-02']);
  });
  it('is empty for a bad count or key', () => {
    expect(lastWeeks('2026-10-07', 0)).toEqual([]);
    expect(lastWeeks(null, 4)).toEqual([]);
  });
});

describe('inWeekOf', () => {
  it('is true from Monday up to today', () => {
    expect(inWeekOf('2026-10-05', '2026-10-07')).toBe(true);
    expect(inWeekOf('2026-10-07', '2026-10-07')).toBe(true);
  });
  it('excludes last Sunday and anything after today', () => {
    expect(inWeekOf('2026-10-04', '2026-10-07')).toBe(false);
    expect(inWeekOf('2026-10-08', '2026-10-07')).toBe(false);
    expect(inWeekOf(null, '2026-10-07')).toBe(false);
  });
});

describe('weeklyTotals', () => {
  const workouts = [
    { date: '2026-10-05', totalVolume: 5000 }, // Monday, this week
    { date: '2026-10-04', totalVolume: 1000 }, // Sunday, last week
    { date: '2026-09-28', totalVolume: 2000 }, // Monday, last week
    { date: '2026-08-01', totalVolume: 9999 }, // outside the window
    { date: null, totalVolume: 7 },
  ];

  it('buckets by the local Monday and labels the week day-first', () => {
    const w = weeklyTotals(workouts, { today: '2026-10-07', weeks: 3 });
    expect(w).toEqual([
      { week: '2026-09-21', label: '21 Sep', value: 0 },
      { week: '2026-09-28', label: '28 Sep', value: 3000 },
      { week: '2026-10-05', label: '5 Oct', value: 5000 },
    ]);
  });

  it('keeps empty weeks so a missed week still shows as a gap', () => {
    const w = weeklyTotals([], { today: '2026-10-07', weeks: 4 });
    expect(w).toHaveLength(4);
    expect(w.every((b) => b.value === 0)).toBe(true);
  });

  it('takes any value and key accessor (calories, sets…)', () => {
    const rows = [{ day: '2026-10-06', kcal: 300 }, { day: '2026-10-07', kcal: 150.5 }];
    const w = weeklyTotals(rows, { today: '2026-10-07', weeks: 1, getKey: (r) => r.day, getValue: (r) => r.kcal });
    expect(w[0].value).toBe(450.5);
  });
});

describe('weekToDate', () => {
  // Monday 5 Oct 2026, 08:00 local.
  const mondayMorning = new Date(2026, 9, 5, 8, 0);
  const at = (y, mo, d, h) => new Date(y, mo, d, h, 0).getTime();

  it('says nothing on a Monday morning when last Monday was trained later in the day', () => {
    // The bug: "−100% vs last week" every Monday. Last Monday's session ended
    // at 18:00; at 08:00 a week ago nothing had been lifted yet.
    const rows = [
      { date: '2026-09-28', totalVolume: 5000, createdAt: at(2026, 8, 28, 18) },
      { date: '2026-09-30', totalVolume: 4000, createdAt: at(2026, 8, 30, 18) },
    ];
    expect(weekToDate(rows, { now: mondayMorning })).toBeNull();
  });

  it('counts last week only up to the same weekday and time', () => {
    const wednesdayEvening = new Date(2026, 9, 7, 20, 0);
    const rows = [
      { date: '2026-09-28', totalVolume: 5000, createdAt: at(2026, 8, 28, 18) }, // last Mon
      { date: '2026-09-30', totalVolume: 4000, createdAt: at(2026, 8, 30, 19) }, // last Wed, before 20:00
      { date: '2026-10-02', totalVolume: 6000, createdAt: at(2026, 9, 2, 18) },  // last Fri — not yet
      { date: '2026-10-05', totalVolume: 6000, createdAt: at(2026, 9, 5, 18) },  // this Mon
      { date: '2026-10-07', totalVolume: 4500, createdAt: at(2026, 9, 7, 19) },  // this Wed
    ];
    const r = weekToDate(rows, { now: wednesdayEvening });
    expect(r).toEqual({ current: 10500, previous: 9000, pct: 17 });
  });

  it('leaves out a same-weekday session that came after this time last week', () => {
    const wednesdayNoon = new Date(2026, 9, 7, 12, 0);
    const rows = [
      { date: '2026-09-28', totalVolume: 5000, createdAt: at(2026, 8, 28, 18) },
      { date: '2026-09-30', totalVolume: 4000, createdAt: at(2026, 8, 30, 19) }, // after 12:00
      { date: '2026-10-05', totalVolume: 2500, createdAt: at(2026, 9, 5, 18) },
    ];
    expect(weekToDate(rows, { now: wednesdayNoon })).toEqual({ current: 2500, previous: 5000, pct: -50 });
  });

  it('falls back to whole days for rows with no timestamp', () => {
    const rows = [{ date: '2026-09-28', totalVolume: 1000 }, { date: '2026-10-05', totalVolume: 1500 }];
    expect(weekToDate(rows, { now: mondayMorning })).toEqual({ current: 1500, previous: 1000, pct: 50 });
  });

  it('is null with nothing to compare against', () => {
    expect(weekToDate([], { now: mondayMorning })).toBeNull();
    expect(weekToDate([{ date: '2026-10-05', totalVolume: 900 }], { now: mondayMorning })).toBeNull();
  });

  it('reports a real drop honestly', () => {
    const fridayNight = new Date(2026, 9, 9, 23, 0);
    const rows = [{ date: '2026-09-28', totalVolume: 4000, createdAt: at(2026, 8, 28, 18) }];
    expect(weekToDate(rows, { now: fridayNight })).toEqual({ current: 0, previous: 4000, pct: -100 });
  });
});
