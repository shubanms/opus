import { describe, it, expect } from 'vitest';
import { todayKey, parseKey, daysBetween } from './dateKey.js';

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
