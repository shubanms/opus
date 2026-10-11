import { describe, it, expect } from 'vitest';
import { daysSince, inactivityDecay, streakBreakPenalty, decayInfo } from './decay.js';

const NOW = new Date('2026-05-24T12:00:00');

describe('daysSince', () => {
  it('counts whole days, never negative', () => {
    expect(daysSince('2026-05-24', NOW)).toBe(0);
    expect(daysSince('2026-05-20', NOW)).toBe(4);
    expect(daysSince('2026-06-01', NOW)).toBe(0); // future → 0
    expect(daysSince(null, NOW)).toBe(0);
    expect(daysSince('garbage', NOW)).toBe(0);
  });

  it('counts the day after a spring-forward change as a day', () => {
    // US clocks went forward on 2026-03-08 and the EU's on 2026-03-29: local
    // midnight to local midnight is 23 hours, which used to floor to zero.
    // Early morning is the worst case — the fewest hours past midnight.
    expect(daysSince('2026-03-08', new Date(2026, 2, 9, 0, 30))).toBe(1);
    expect(daysSince('2026-03-29', new Date(2026, 2, 30, 0, 30))).toBe(1);
    expect(daysSince('2026-03-07', new Date(2026, 2, 9, 0, 30))).toBe(2);
  });

  it('does not count the long autumn day twice', () => {
    expect(daysSince('2026-11-01', new Date(2026, 10, 2, 23, 30))).toBe(1);
    expect(daysSince('2026-10-25', new Date(2026, 9, 26, 23, 30))).toBe(1);
  });
});

describe('inactivityDecay', () => {
  it('is zero within the grace window', () => {
    expect(inactivityDecay(4, 10000)).toBe(0);
  });
  it('grows past grace and caps at 40%', () => {
    expect(inactivityDecay(6, 10000)).toBe(500); // 2 days × 2.5%
    expect(inactivityDecay(100, 10000)).toBe(4000); // capped at 40%
  });
  it('is zero with no earned XP', () => {
    expect(inactivityDecay(30, 0)).toBe(0);
  });
});

describe('streakBreakPenalty', () => {
  it('does not penalize normal rest days (within grace)', () => {
    expect(streakBreakPenalty(1, 10)).toBe(0);
    expect(streakBreakPenalty(4, 10)).toBe(0); // still within grace
  });
  it('applies past grace for a real streak', () => {
    expect(streakBreakPenalty(6, 1)).toBe(0);   // streak of 1 not penalized
    expect(streakBreakPenalty(6, 10)).toBe(200); // 10 × 20
  });
  it('caps the penalty', () => {
    expect(streakBreakPenalty(6, 999)).toBe(1000);
  });
});

describe('decayInfo', () => {
  it('no loss while active (within grace)', () => {
    const info = decayInfo({ totalXp: 10000, streak: 5, lastWorkoutDate: '2026-05-22' }, NOW); // 2 days
    expect(info.decaying).toBe(false);
    expect(info.effectiveXp).toBe(10000);
  });
  it('loses XP after inactivity + a broken streak, but never below 0', () => {
    const info = decayInfo({ totalXp: 10000, streak: 10, lastWorkoutDate: '2026-05-14' }, NOW); // 10 days
    expect(info.decaying).toBe(true);
    expect(info.lost).toBeGreaterThan(0);
    expect(info.effectiveXp).toBe(10000 - info.lost);
    expect(info.effectiveXp).toBeGreaterThanOrEqual(0);
  });
  it('recovers fully the day you train', () => {
    const info = decayInfo({ totalXp: 10000, streak: 10, lastWorkoutDate: '2026-05-24' }, NOW); // today
    expect(info.effectiveXp).toBe(10000);
  });
});
