import { describe, it, expect } from 'vitest';
import {
  STREAK, streakState, currentStreak, streakLabel,
  effectiveLastDate, rescueOffer, graceFromOffer, MAX_RESCUE_DAYS,
} from './streak.js';

const profile = (streak, lastWorkoutDate) => ({ streak, lastWorkoutDate });

describe('streakState', () => {
  it('is safe on a day you trained', () => {
    const s = streakState(profile(7, '2026-08-05'), '2026-08-05');
    expect(s).toEqual({ count: 7, state: STREAK.SAFE, lost: 0, daysSince: 0 });
  });

  it('is at risk the day after, still holding the count', () => {
    const s = streakState(profile(7, '2026-08-04'), '2026-08-05');
    expect(s.state).toBe(STREAK.AT_RISK);
    expect(s.count).toBe(7);
  });

  it('is broken once a full day is missed', () => {
    // This is the case the app got wrong: it kept reporting 7.
    const s = streakState(profile(7, '2026-08-03'), '2026-08-05');
    expect(s.state).toBe(STREAK.BROKEN);
    expect(s.count).toBe(0);
    expect(s.lost).toBe(7);
  });

  it('stays broken however long you leave it', () => {
    const s = streakState(profile(30, '2026-01-01'), '2026-08-05');
    expect(s.count).toBe(0);
    expect(s.lost).toBe(30);
    expect(s.daysSince).toBeGreaterThan(200);
  });

  it('crosses month and year boundaries', () => {
    expect(streakState(profile(3, '2026-07-31'), '2026-08-01').state).toBe(STREAK.AT_RISK);
    expect(streakState(profile(3, '2025-12-31'), '2026-01-01').state).toBe(STREAK.AT_RISK);
    expect(streakState(profile(3, '2025-12-30'), '2026-01-01').state).toBe(STREAK.BROKEN);
  });

  it('has no streak before the first workout', () => {
    expect(streakState(profile(0, null), '2026-08-05').state).toBe(STREAK.NONE);
    expect(streakState(profile(5, null), '2026-08-05').state).toBe(STREAK.NONE);
    expect(streakState(profile(0, '2026-08-05'), '2026-08-05').state).toBe(STREAK.NONE);
  });

  it('survives a missing or malformed profile', () => {
    expect(streakState(undefined, '2026-08-05').state).toBe(STREAK.NONE);
    expect(streakState({}, '2026-08-05').state).toBe(STREAK.NONE);
    expect(streakState(profile(Number.NaN, '2026-08-05'), '2026-08-05').state).toBe(STREAK.NONE);
    expect(streakState(profile(3, 'not-a-date'), '2026-08-05').state).toBe(STREAK.NONE);
  });

  it('does not break the streak on a device clock running behind', () => {
    // Last workout "tomorrow" should read as trained-today, not as a lapse.
    const s = streakState(profile(4, '2026-08-06'), '2026-08-05');
    expect(s.state).toBe(STREAK.SAFE);
    expect(s.count).toBe(4);
  });

  it('never reports a negative or fractional count', () => {
    expect(streakState(profile(-3, '2026-08-05'), '2026-08-05').count).toBe(0);
    expect(streakState(profile(2.7, '2026-08-05'), '2026-08-05').count).toBe(2);
  });
});

describe('currentStreak', () => {
  it('is the number every display should show', () => {
    expect(currentStreak(profile(9, '2026-08-05'), '2026-08-05')).toBe(9);
    expect(currentStreak(profile(9, '2026-08-04'), '2026-08-05')).toBe(9);
    expect(currentStreak(profile(9, '2026-08-01'), '2026-08-05')).toBe(0);
  });
});

describe('streakLabel', () => {
  it('words each state once, for every screen', () => {
    expect(streakLabel(streakState(profile(5, '2026-08-05'), '2026-08-05'))).toBe('5-day streak');
    expect(streakLabel(streakState(profile(5, '2026-08-04'), '2026-08-05'))).toContain('train today');
    expect(streakLabel(streakState(profile(5, '2026-08-01'), '2026-08-05'))).toBe('5-day streak ended');
    expect(streakLabel(streakState(profile(1, '2026-08-01'), '2026-08-05'))).toBe('Streak ended');
    expect(streakLabel(streakState(profile(0, null), '2026-08-05'))).toBe('No streak yet');
  });

  it('survives junk', () => {
    expect(streakLabel(undefined)).toBe('No streak yet');
    expect(streakLabel({})).toBe('No streak yet');
  });
});

// --- rescue -----------------------------------------------------------------

const lapsed = (streak, last, grace) => ({ streak, lastWorkoutDate: last, streakGrace: grace });

describe('effectiveLastDate', () => {
  it('is the last workout when there is no grace', () => {
    expect(effectiveLastDate(lapsed(5, '2026-08-01'))).toBe('2026-08-01');
  });

  it('moves forward to a grace bought for this lapse', () => {
    const g = { through: '2026-08-04', for: '2026-08-01' };
    expect(effectiveLastDate(lapsed(5, '2026-08-01', g))).toBe('2026-08-04');
  });

  it('ignores a grace bought against a different lapse', () => {
    // You trained again, so lastWorkoutDate moved and the old grace is spent
    // history. Without this stamp a single rescue would protect every future
    // gap forever.
    const g = { through: '2026-08-04', for: '2026-08-01' };
    expect(effectiveLastDate(lapsed(5, '2026-08-06', g))).toBe('2026-08-06');
  });

  it('never moves backwards', () => {
    const g = { through: '2026-07-01', for: '2026-08-01' };
    expect(effectiveLastDate(lapsed(5, '2026-08-01', g))).toBe('2026-08-01');
  });

  it('survives junk', () => {
    expect(effectiveLastDate(null)).toBe(null);
    expect(effectiveLastDate({})).toBe(null);
    expect(effectiveLastDate(lapsed(5, '2026-08-01', {}))).toBe('2026-08-01');
  });
});

describe('rescueOffer', () => {
  const today = '2026-08-06';

  it('offers nothing while the streak is still standing', () => {
    expect(rescueOffer(profile(9, today), 5, today)).toBe(null);
    expect(rescueOffer(profile(9, '2026-08-05'), 5, today)).toBe(null); // at risk
  });

  it('costs one token per day actually missed', () => {
    // Trained the 4th, today is the 6th: the 5th went by unworked, and today
    // is still open — one day missed, one token.
    expect(rescueOffer(profile(9, '2026-08-04'), 5, today).cost).toBe(1);
    expect(rescueOffer(profile(9, '2026-08-03'), 5, today).cost).toBe(2);
    expect(rescueOffer(profile(9, '2026-08-02'), 5, today).cost).toBe(3);
  });

  it('will not sell back a streak abandoned weeks ago', () => {
    expect(rescueOffer(profile(9, '2026-08-01'), 99, today)).toBe(null);
    expect(rescueOffer(profile(9, '2026-06-01'), 99, today)).toBe(null);
  });

  it('does not nag about a streak too small to mourn', () => {
    expect(rescueOffer(profile(2, '2026-08-04'), 5, today)).toBe(null);
    expect(rescueOffer(profile(3, '2026-08-04'), 5, today)).not.toBe(null);
  });

  it('still describes an offer you cannot afford', () => {
    // Told what it would cost, rather than the offer silently not existing —
    // that is how someone learns rest tokens are worth having.
    const o = rescueOffer(profile(9, '2026-08-03'), 1, today);
    expect(o.cost).toBe(2);
    expect(o.affordable).toBe(false);
    expect(rescueOffer(profile(9, '2026-08-03'), 2, today).affordable).toBe(true);
  });

  it('buys you back to the brink, not to safety', () => {
    // Paying to skip a day must not also buy a day off.
    const o = rescueOffer(profile(9, '2026-08-03'), 5, today);
    const after = streakState(lapsed(9, '2026-08-03', graceFromOffer(o)), today);
    expect(after.state).toBe(STREAK.AT_RISK);
    expect(after.count).toBe(9);
  });

  it('restores the exact streak that was lost', () => {
    const o = rescueOffer(profile(12, '2026-08-04'), 5, today);
    expect(o.lost).toBe(12);
    expect(streakState(lapsed(12, '2026-08-04', graceFromOffer(o)), today).count).toBe(12);
  });

  it('a rescue does not survive into the next lapse', () => {
    // Rescue on the 6th, train that day, then lapse again a week later. The
    // grace is stamped to the old lastWorkoutDate and must not apply.
    const o = rescueOffer(profile(9, '2026-08-04'), 5, today);
    const later = lapsed(10, '2026-08-06', graceFromOffer(o));
    expect(streakState(later, '2026-08-13').state).toBe(STREAK.BROKEN);
  });

  it('caps at MAX_RESCUE_DAYS', () => {
    const edge = rescueOffer(profile(9, '2026-08-02'), 9, today);
    expect(edge.cost).toBe(MAX_RESCUE_DAYS);
    expect(rescueOffer(profile(9, '2026-08-01'), 9, today)).toBe(null);
  });

  it('survives junk', () => {
    expect(rescueOffer(null, 5, today)).toBe(null);
    expect(rescueOffer({}, 5, today)).toBe(null);
    expect(graceFromOffer(null)).toBe(null);
    expect(graceFromOffer({})).toBe(null);
  });
});

describe('streakLabel on a schedule', () => {
  it('counts sessions rather than days', () => {
    // Calling it "12-day" when eight of those days were prescribed rest is the
    // same lie the consecutive-day streak told.
    expect(streakLabel({ state: STREAK.SAFE, count: 12, scheduled: true })).toBe('12-session streak');
    expect(streakLabel({ state: STREAK.BROKEN, lost: 12, scheduled: true })).toBe('12-session streak ended');
  });

  it('does not promise a deadline it cannot know', () => {
    // On a plan the window may run for days, so "train today" would be wrong.
    expect(streakLabel({ state: STREAK.AT_RISK, count: 4, scheduled: true })).toBe(
      '4-session streak · a session is due'
    );
  });

  it('is unchanged without a plan', () => {
    expect(streakLabel({ state: STREAK.SAFE, count: 5 })).toBe('5-day streak');
    expect(streakLabel({ state: STREAK.AT_RISK, count: 5 })).toContain('train today');
  });
});

describe('rescueOffer on a schedule', () => {
  const scheduled = (over) => ({
    state: STREAK.BROKEN, count: 0, lost: 6, scheduled: true, missedSlots: ['2026-08-05'], ...over,
  });

  it('prices a rescue in missed sessions, not missed days', () => {
    const o = rescueOffer(profile(6, '2026-08-01'), 5, '2026-08-08', scheduled());
    expect(o.cost).toBe(1);
    expect(o.scheduled).toBe(true);
    expect(o.credited).toEqual(['2026-08-05']);
  });

  it('never fires on a rest day the plan asked for', () => {
    // This is the whole reason the state is passed in. The day-streak would say
    // BROKEN every Wednesday for someone training Mon/Wed/Fri.
    const healthy = { state: STREAK.SAFE, count: 6, lost: 0, scheduled: true };
    expect(rescueOffer(profile(6, '2026-08-01'), 5, '2026-08-08', healthy)).toBe(null);
  });

  it('will not sell back a plan abandoned for weeks', () => {
    const many = scheduled({ missedSlots: ['2026-08-05', '2026-08-03', '2026-07-31', '2026-07-29'] });
    expect(rescueOffer(profile(6, '2026-07-27'), 9, '2026-08-08', many)).toBe(null);
  });

  it('writes credited days, not a grace', () => {
    // The schedule streak is computed from dates, so the honest way to buy a
    // slot back is to credit that slot. A grace would do nothing here.
    const o = rescueOffer(profile(6, '2026-08-01'), 5, '2026-08-08', scheduled());
    expect(graceFromOffer(o)).toBe(null);
    expect(o.credited.length).toBe(1);
  });
});
