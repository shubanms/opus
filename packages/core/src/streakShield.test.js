import { describe, it, expect } from 'vitest';
import { tokensEarned, tokenBalance, isShieldActive, shieldedDecay } from './streakShield.js';

describe('tokensEarned', () => {
  it('grants one token per 10 finished workouts', () => {
    expect(tokensEarned({ workouts: 9 })).toBe(0);
    expect(tokensEarned({ workouts: 10 })).toBe(1);
    expect(tokensEarned({ workouts: 25 })).toBe(2);
  });
  it('grants one token per 3 claimed quests', () => {
    expect(tokensEarned({ questClaims: 3 })).toBe(1);
    expect(tokensEarned({ questClaims: 8 })).toBe(2);
  });
  it('sums both sources (retro from history)', () => {
    expect(tokensEarned({ workouts: 20, questClaims: 6 })).toBe(2 + 2);
  });
  it('is 0 with no history', () => {
    expect(tokensEarned({})).toBe(0);
  });
});

describe('tokenBalance', () => {
  it('is earned minus spent', () => {
    expect(tokenBalance(5, 2)).toBe(3);
  });
  it('never goes negative when history shrinks below spent', () => {
    expect(tokenBalance(1, 3)).toBe(0);
  });
});

describe('isShieldActive', () => {
  it('is active while the protected lapse is still the current lapse', () => {
    expect(isShieldActive('2026-07-10', '2026-07-10')).toBe(true);
  });
  it('clears once you train again (lastWorkoutDate moves)', () => {
    expect(isShieldActive('2026-07-10', '2026-07-14')).toBe(false);
  });
  it('is inactive when no shield is set', () => {
    expect(isShieldActive(null, '2026-07-10')).toBe(false);
  });
});

describe('shieldedDecay', () => {
  const decaying = { effectiveXp: 800, lost: 200, decaying: true, days: 6 };
  it('waives the streak-break penalty when active', () => {
    const r = shieldedDecay(decaying, { active: true, streakPenalty: 120, earnedXp: 1000 });
    expect(r.lost).toBe(80);
    expect(r.effectiveXp).toBe(920);
    expect(r.shielded).toBe(true);
  });
  it('can end decay entirely if the penalty was the whole loss', () => {
    const r = shieldedDecay({ effectiveXp: 880, lost: 120, decaying: true }, { active: true, streakPenalty: 120, earnedXp: 1000 });
    expect(r.lost).toBe(0);
    expect(r.decaying).toBe(false);
  });
  it('is a no-op when inactive or not decaying', () => {
    expect(shieldedDecay(decaying, { active: false, streakPenalty: 120 })).toBe(decaying);
    const steady = { effectiveXp: 1000, lost: 0, decaying: false };
    expect(shieldedDecay(steady, { active: true, streakPenalty: 120 })).toBe(steady);
  });
  it('never credits back more than earned XP', () => {
    const r = shieldedDecay({ effectiveXp: 950, lost: 50, decaying: true }, { active: true, streakPenalty: 120, earnedXp: 1000 });
    expect(r.effectiveXp).toBe(1000);
  });
});
