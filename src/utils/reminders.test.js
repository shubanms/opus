import { describe, it, expect } from 'vitest';
import { pickReminders, streakDueToday } from './reminders.js';
import { inQuietHours } from './notifications.js';
import { STREAK } from './streak.js';

const base = { enabled: true, prCelebration: true, streakRisk: true, gymNudge: true, weeklySummary: true, staleRoutine: true, dndStart: 22, dndEnd: 7 };
const at = (h) => new Date(2026, 4, 20, h, 0, 0); // Wed 20 May 2026
const TODAY = '2026-05-20';
const WEEK = '2026-05-18';

// Live streaks, in the shape hooks/useStreak returns.
const dayAtRisk = { count: 5, state: STREAK.AT_RISK, scheduled: false, nextDue: null };
const daySafe = { count: 5, state: STREAK.SAFE, scheduled: false, nextDue: null };
const dayBroken = { count: 0, state: STREAK.BROKEN, lost: 9, scheduled: false, nextDue: null };
const planDue = { count: 7, state: STREAK.AT_RISK, scheduled: true, nextDue: TODAY, deadline: '2026-05-21' };
const planLast = { count: 7, state: STREAK.AT_RISK, scheduled: true, nextDue: '2026-05-18', deadline: TODAY };
const planRest = { count: 7, state: STREAK.SAFE, scheduled: true, nextDue: '2026-05-22' };

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

describe('streakDueToday', () => {
  it('is the last chance for a day streak at risk', () => {
    expect(streakDueToday(dayAtRisk, TODAY)).toBe('last');
  });

  it('separates a plan\'s scheduled day from its last day', () => {
    expect(streakDueToday(planDue, TODAY)).toBe('due');
    expect(streakDueToday(planLast, TODAY)).toBe('last');
  });

  it('owes nothing when safe, broken, on a rest day, or for junk', () => {
    expect(streakDueToday(daySafe, TODAY)).toBe(null);
    expect(streakDueToday(dayBroken, TODAY)).toBe(null);
    expect(streakDueToday(planRest, TODAY)).toBe(null);
    // At risk, but the window's deadline is later and today is not its day.
    expect(streakDueToday({ ...planDue, nextDue: '2026-05-19' }, TODAY)).toBe(null);
    expect(streakDueToday(null, TODAY)).toBe(null);
    expect(streakDueToday(5, TODAY)).toBe(null);
    expect(streakDueToday({ ...dayAtRisk, count: 0 }, TODAY)).toBe(null);
  });
});

describe('pickReminders', () => {
  const args = (over = {}) => ({
    settings: base,
    now: at(18),
    today: TODAY,
    weekKey: WEEK,
    lastWorkoutDate: null,
    streak: dayAtRisk,
    markers: { lastSummaryWeek: WEEK },
    ...over,
  });
  const types = (over) => pickReminders(args(over)).map((r) => r.type);

  it('suppresses everything during quiet hours', () => {
    expect(pickReminders(args({ now: at(23), markers: {} }))).toHaveLength(0);
  });

  it('fires the weekly summary once per week', () => {
    expect(types({ markers: {} })).toContain('weeklySummary');
    expect(types()).not.toContain('weeklySummary');
  });

  it('points the weekly summary at something that exists', () => {
    // It promised a recap "in Wrapped", which has no weekly view.
    const quiet = pickReminders(args({ markers: {} })).find((r) => r.type === 'weeklySummary');
    expect(quiet.body).not.toMatch(/Wrapped/);
    expect(quiet.body).toBe('A fresh week — new quests are live on Home.');
    const busy = pickReminders(args({ markers: {}, lastWeek: { sessions: 3, volumeKg: 12000 }, unit: 'kg' }))
      .find((r) => r.type === 'weeklySummary');
    expect(busy.body).toBe('Last week: 3 sessions · 12,000 kg lifted. New quests are live on Home.');
    const one = pickReminders(args({ markers: {}, lastWeek: { sessions: 1, volumeKg: 0 } }))
      .find((r) => r.type === 'weeklySummary');
    expect(one.body).toBe('Last week: 1 session. New quests are live on Home.');
  });

  it('nudges a day streak in the evening when it is actually at risk', () => {
    const [r] = pickReminders(args());
    expect(r.type).toBe('streakRisk');
    expect(r.body).toBe('Train today to keep your 5-day streak alive.');
  });

  it('never nags about a streak that already ended', () => {
    // The stored `profile.streak` kept saying 9 weeks after the streak died.
    expect(types({ streak: dayBroken })).toEqual(['gymNudge']);
  });

  it('never calls a planned rest day a risk', () => {
    expect(types({ streak: planRest, plannedToday: false })).toEqual([]);
    // A rest day with nothing owed gets no gym nudge either.
    expect(types({ streak: planRest, plannedToday: false, now: at(9) })).toEqual([]);
  });

  it('words a plan streak in sessions, and knows "due" from "last chance"', () => {
    const due = pickReminders(args({ streak: planDue, plannedToday: true }))[0];
    expect(due.type).toBe('streakRisk');
    expect(due.body).toBe('A session is due today — keep your 7-session streak going.');
    const last = pickReminders(args({ streak: planLast, plannedToday: false }))[0];
    expect(last.body).toBe('Last chance — train today to keep your 7-session streak alive.');
  });

  it('falls back to the gym nudge in the morning or with no streak', () => {
    expect(types({ now: at(9) })).toEqual(['gymNudge']);
    expect(types({ streak: null })).toEqual(['gymNudge']);
    expect(types({ streak: { count: 0, state: STREAK.NONE } })).toEqual(['gymNudge']);
  });

  it('nudges on the last day of a window even when it is not a scheduled day', () => {
    expect(types({ streak: planLast, plannedToday: false, now: at(9) })).toEqual(['gymNudge']);
  });

  it('no daily nudge if already trained today or already nudged', () => {
    expect(pickReminders(args({ lastWorkoutDate: TODAY }))).toHaveLength(0);
    expect(pickReminders(args({ markers: { lastSummaryWeek: WEEK, lastNudgeDay: TODAY } }))).toHaveLength(0);
  });

  it('respects per-type toggles', () => {
    const off = pickReminders(args({ markers: {}, settings: { ...base, streakRisk: false, gymNudge: false, weeklySummary: false } }));
    expect(off).toHaveLength(0);
  });

  it('runs whether or not system notifications are on', () => {
    // In-app toasts are governed by their own toggles; `enabled` is the
    // system-notification switch and needs a browser permission.
    expect(types({ settings: { ...base, enabled: false } })).toEqual(['streakRisk']);
  });

  it('suggests a stale routine once a week', () => {
    const stale = { id: 3, name: 'Push A', sessions: 12 };
    expect(types({ staleRoutine: stale })).toContain('staleRoutine');
    expect(types({ staleRoutine: stale, markers: { lastSummaryWeek: WEEK, lastStaleWeek: WEEK } })).not.toContain('staleRoutine');
  });
});
