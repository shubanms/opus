import { describe, it, expect } from 'vitest';
import { STREAK, streakState, currentStreak, streakLabel } from './streak.js';

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
