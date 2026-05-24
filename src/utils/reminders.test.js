import { describe, it, expect } from 'vitest';
import { pickReminders } from './reminders.js';
import { inQuietHours } from './notifications.js';

const base = { enabled: true, prCelebration: true, streakRisk: true, gymNudge: true, weeklySummary: true, dndStart: 22, dndEnd: 7 };
const at = (h) => new Date(2026, 4, 20, h, 0, 0); // Wed
const TODAY = '2026-05-20';
const WEEK = '2026-05-18';

describe('inQuietHours', () => {
  it('matches a midnight-wrapping window', () => {
    expect(inQuietHours(base, at(23))).toBe(true);
    expect(inQuietHours(base, at(3))).toBe(true);
    expect(inQuietHours(base, at(12))).toBe(false);
  });
  it('is never quiet when start === end', () => {
    expect(inQuietHours({ ...base, dndStart: 9, dndEnd: 9 }, at(9))).toBe(false);
  });
});

describe('pickReminders', () => {
  const args = (over = {}) => ({ settings: base, now: at(18), today: TODAY, weekKey: WEEK, lastWorkoutDate: null, streak: 5, markers: {}, ...over });

  it('suppresses everything during quiet hours', () => {
    expect(pickReminders(args({ now: at(23) }))).toHaveLength(0);
  });

  it('fires the weekly summary once per week', () => {
    expect(pickReminders(args()).some((r) => r.type === 'weeklySummary')).toBe(true);
    expect(pickReminders(args({ markers: { lastSummaryWeek: WEEK } })).some((r) => r.type === 'weeklySummary')).toBe(false);
  });

  it('prefers streakRisk in the evening when a streak is live', () => {
    const types = pickReminders(args({ markers: { lastSummaryWeek: WEEK } })).map((r) => r.type);
    expect(types).toEqual(['streakRisk']);
  });

  it('falls back to gymNudge in the morning / no streak', () => {
    const morning = pickReminders(args({ now: at(9), markers: { lastSummaryWeek: WEEK } })).map((r) => r.type);
    expect(morning).toEqual(['gymNudge']);
    const noStreak = pickReminders(args({ streak: 0, markers: { lastSummaryWeek: WEEK } })).map((r) => r.type);
    expect(noStreak).toEqual(['gymNudge']);
  });

  it('no daily nudge if already trained today or already nudged', () => {
    expect(pickReminders(args({ lastWorkoutDate: TODAY, markers: { lastSummaryWeek: WEEK } }))).toHaveLength(0);
    expect(pickReminders(args({ markers: { lastSummaryWeek: WEEK, lastNudgeDay: TODAY } }))).toHaveLength(0);
  });

  it('respects per-type toggles', () => {
    const off = pickReminders(args({ settings: { ...base, streakRisk: false, gymNudge: false, weeklySummary: false } }));
    expect(off).toHaveLength(0);
  });
});
