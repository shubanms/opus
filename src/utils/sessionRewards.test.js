import { describe, it, expect } from 'vitest';
import { streakAfterSession, levelUpDecision, progressionMessage } from './sessionRewards.js';
import { STREAK_BONUS_PER_DAY, xpForLevel } from './rpg.js';
import { shiftKey } from './dateKey.js';

const day = '2026-10-05';

describe('streakAfterSession', () => {
  it('extends a streak from yesterday', () => {
    const out = streakAfterSession({ streak: 4, lastWorkoutDate: shiftKey(day, -1) }, day);
    expect(out).toEqual({ streak: 5, lastWorkoutDate: day, changed: true, bonus: 5 * STREAK_BONUS_PER_DAY });
  });

  it('restarts after a missed day', () => {
    const out = streakAfterSession({ streak: 9, lastWorkoutDate: shiftKey(day, -2) }, day);
    expect(out.streak).toBe(1);
  });

  it('starts a first-ever streak at one', () => {
    expect(streakAfterSession({ streak: 0, lastWorkoutDate: null }, day).streak).toBe(1);
    expect(streakAfterSession(null, day).streak).toBe(1);
  });

  it('honours a paid rescue', () => {
    // Verified bug: tokens bought the lapse back through yesterday, and the
    // next workout compared the raw lastWorkoutDate (3 days ago) to yesterday
    // and reset the streak to 1 anyway.
    const last = shiftKey(day, -3);
    const profile = { streak: 10, lastWorkoutDate: last, streakGrace: { through: shiftKey(day, -1), for: last } };
    const out = streakAfterSession(profile, day);
    expect(out.streak).toBe(11);
    expect(out.lastWorkoutDate).toBe(day);
  });

  it('ignores a grace stamped for a different last workout', () => {
    const profile = {
      streak: 10,
      lastWorkoutDate: shiftKey(day, -3),
      streakGrace: { through: shiftKey(day, -1), for: shiftKey(day, -9) },
    };
    expect(streakAfterSession(profile, day).streak).toBe(1);
  });

  it('pays the streak bonus only for the first session of the day', () => {
    // Verified XP farm: every extra session the same day re-paid streak × 10.
    const first = streakAfterSession({ streak: 6, lastWorkoutDate: shiftKey(day, -1) }, day, { firstOfDay: true });
    expect(first.bonus).toBe(7 * STREAK_BONUS_PER_DAY);
    const again = streakAfterSession({ streak: 7, lastWorkoutDate: day }, day, { firstOfDay: false });
    expect(again).toEqual({ streak: 7, lastWorkoutDate: day, changed: false, bonus: 0 });
  });

  it('a later session on the same day changes nothing even if called first-of-day', () => {
    // lastWorkoutDate already today: nothing to extend, nothing to pay twice.
    expect(streakAfterSession({ streak: 7, lastWorkoutDate: day }, day, { firstOfDay: true }).bonus).toBe(0);
  });

  it('never rewinds for a session dated before the last workout', () => {
    const out = streakAfterSession({ streak: 3, lastWorkoutDate: day }, shiftKey(day, -1));
    expect(out).toEqual({ streak: 3, lastWorkoutDate: day, changed: false, bonus: 0 });
  });

  it('steps across a daylight-saving change by calendar day', () => {
    // 8 Mar 2026 is US spring-forward: 7 Mar → 8 Mar is 23 hours.
    expect(streakAfterSession({ streak: 2, lastWorkoutDate: '2026-03-07' }, '2026-03-08').streak).toBe(3);
    // 1 Nov 2026 is US fall-back: 31 Oct → 1 Nov is 25 hours.
    expect(streakAfterSession({ streak: 2, lastWorkoutDate: '2026-10-31' }, '2026-11-01').streak).toBe(3);
    expect(streakAfterSession({ streak: 2, lastWorkoutDate: '2026-02-28' }, '2026-03-01').streak).toBe(3);
  });
});

describe('levelUpDecision', () => {
  const xpAt = (level) => xpForLevel(level);
  const clearedAll = { totalVolume: 1e9, bestStreak: 99, prCount: 99, muscleVariety: 15 };
  const sealedAt10 = { totalVolume: 1000, bestStreak: 1, prCount: 0, muscleVariety: 3 };

  it('celebrates crossing a level', () => {
    const d = levelUpDecision({ beforeXp: xpAt(5) - 1, afterXp: xpAt(5) + 10, statsBefore: clearedAll, statsAfter: clearedAll });
    expect(d.leveledUp).toBe(true);
    expect(d.level).toBe(5);
    expect(typeof d.title).toBe('string');
  });

  it('counts XP that arrived from badges after the session', () => {
    // The caller passes the XP after achievements paid out; a badge tipping
    // you over is a level-up too.
    const d = levelUpDecision({ beforeXp: xpAt(3) - 5, afterXp: xpAt(3), statsBefore: clearedAll, statsAfter: clearedAll });
    expect(d.leveledUp).toBe(true);
  });

  it('does not celebrate a level sealed behind a boss gate', () => {
    const d = levelUpDecision({ beforeXp: xpAt(11), afterXp: xpAt(12), statsBefore: sealedAt10, statsAfter: sealedAt10 });
    expect(d.leveledUp).toBe(false);
    expect(d.level).toBe(10);
    expect(d.sealed).toBe(true);
  });

  it('does celebrate the session that clears the boss', () => {
    const cleared = { ...sealedAt10, totalVolume: 30000 };
    const d = levelUpDecision({ beforeXp: xpAt(12), afterXp: xpAt(12) + 50, statsBefore: sealedAt10, statsAfter: cleared });
    expect(d.leveledUp).toBe(true);
    expect(d.level).toBe(12);
  });

  it('stays quiet when it cannot tell', () => {
    const d = levelUpDecision({ beforeXp: xpAt(5) - 1, afterXp: xpAt(6), statsBefore: null, statsAfter: null });
    expect(d.leveledUp).toBe(false);
  });
});

describe('progressionMessage', () => {
  it('says "progressed" only when targets went up', () => {
    const m = progressionMessage({ count: 2, bumps: [{ action: 'increase' }, { action: 'increase' }], mode: 'linear' });
    expect(m.text).toBe('Routine progressed: next targets raised for 2 lifts');
  });

  it('calls a deload a deload', () => {
    const m = progressionMessage({ count: 1, bumps: [{ action: 'deload' }], mode: 'linear' });
    expect(m.text).toBe('Deload: 1 lift drops back next time, then builds again');
    expect(m.text).not.toContain('progressed');
  });

  it('reports a mix honestly', () => {
    const m = progressionMessage({ count: 3, bumps: [{ action: 'increase' }, { action: 'increase' }, { action: 'deload' }] });
    expect(m.text).toBe('Routine updated: 2 lifts up, 1 lift deloaded');
  });

  it("prefers the Routines package's own counts when present", () => {
    const m = progressionMessage({ count: 1, bumps: [{ action: 'increase' }], raised: 0, deloaded: 1 });
    expect(m.text).toContain('Deload');
  });

  it('is null when nothing moved', () => {
    expect(progressionMessage(null)).toBe(null);
    expect(progressionMessage({ count: 0, bumps: [] })).toBe(null);
  });
});
