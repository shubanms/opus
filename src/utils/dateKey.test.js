import { describe, it, expect } from 'vitest';
import { todayKey, parseKey, daysBetween, friendlyDate, monthLabel, shiftKey } from './dateKey.js';

describe('todayKey', () => {
  it('formats a local calendar date as YYYY-MM-DD', () => {
    // Local components — construct with local args so no TZ shift.
    const d = new Date(2026, 6, 11, 23, 30); // 11 Jul 2026, 23:30 local
    expect(todayKey(d)).toBe('2026-07-11');
  });
  it('zero-pads month and day', () => {
    expect(todayKey(new Date(2026, 0, 5))).toBe('2026-01-05');
  });
  it('uses the local calendar day, not UTC', () => {
    // A late-evening local time whose UTC date may differ still keys to the
    // local day the user is actually in.
    const d = new Date(2026, 6, 11, 23, 59, 59);
    expect(todayKey(d)).toBe('2026-07-11');
  });
});

describe('parseKey', () => {
  it('parses to local midnight of that calendar day', () => {
    const d = parseKey('2026-07-11');
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(6);
    expect(d.getDate()).toBe(11);
    expect(d.getHours()).toBe(0);
  });
  it('returns null for empty/invalid input', () => {
    expect(parseKey('')).toBeNull();
    expect(parseKey(null)).toBeNull();
    expect(parseKey(undefined)).toBeNull();
  });
  it('round-trips with todayKey regardless of timezone offset', () => {
    // This is the recovery-bug regression: key produced locally must parse back
    // to the same local day (no UTC drift into the previous/next day).
    const now = new Date(2026, 6, 11, 6, 0); // 6am local
    const key = todayKey(now);
    const parsed = parseKey(key);
    expect(todayKey(parsed)).toBe(key);
  });
});

describe('daysBetween', () => {
  it('counts whole local days', () => {
    expect(daysBetween('2026-07-11', '2026-07-13')).toBe(2);
    expect(daysBetween('2026-07-11', '2026-07-12')).toBe(1);
  });
  it('is 0 for the same day (worked today stays "today")', () => {
    expect(daysBetween('2026-07-11', '2026-07-11')).toBe(0);
  });
  it('clamps negatives to 0', () => {
    expect(daysBetween('2026-07-13', '2026-07-11')).toBe(0);
  });
  it('returns null when a key is missing', () => {
    expect(daysBetween(null, '2026-07-11')).toBeNull();
    expect(daysBetween('2026-07-11', '')).toBeNull();
  });
  it('advances exactly one day across a month boundary', () => {
    expect(daysBetween('2026-07-31', '2026-08-01')).toBe(1);
  });
});

describe('friendlyDate', () => {
  const now = new Date(2026, 7, 5, 14, 0); // 5 Aug 2026

  it('names today and yesterday', () => {
    expect(friendlyDate('2026-08-05', now)).toBe('Today');
    expect(friendlyDate('2026-08-04', now)).toBe('Yesterday');
  });

  it('crosses a month boundary correctly', () => {
    // "Yesterday" from the 1st is the last day of the previous month.
    expect(friendlyDate('2026-07-31', new Date(2026, 7, 1, 9, 0))).toBe('Yesterday');
  });

  it('drops the year while it is obvious and states it once it is not', () => {
    expect(friendlyDate('2026-03-14', now)).toBe('14 Mar');
    expect(friendlyDate('2025-12-31', now)).toBe('31 Dec 2025');
  });

  it('returns empty for junk rather than "Invalid Date"', () => {
    expect(friendlyDate('', now)).toBe('');
    expect(friendlyDate(undefined, now)).toBe('');
    expect(friendlyDate('not-a-date', now)).toBe('');
  });
});

describe('monthLabel', () => {
  it('spells the month out', () => {
    expect(monthLabel('2026-08-05')).toBe('August 2026');
    expect(monthLabel('2025-01-31')).toBe('January 2025');
  });

  it('returns empty for junk', () => {
    expect(monthLabel('nope')).toBe('');
    expect(monthLabel(null)).toBe('');
  });
});

describe('shiftKey', () => {
  it('moves whole days in either direction', () => {
    expect(shiftKey('2026-08-06', -1)).toBe('2026-08-05');
    expect(shiftKey('2026-08-06', 3)).toBe('2026-08-09');
    expect(shiftKey('2026-08-06', 0)).toBe('2026-08-06');
  });

  it('lets the calendar handle month ends and leap days', () => {
    expect(shiftKey('2026-03-01', -1)).toBe('2026-02-28');
    expect(shiftKey('2024-03-01', -1)).toBe('2024-02-29');
    expect(shiftKey('2026-12-31', 1)).toBe('2027-01-01');
  });

  it('returns null rather than a bogus date', () => {
    expect(shiftKey(null, -1)).toBe(null);
    expect(shiftKey('nonsense', -1)).toBe(null);
  });
});
