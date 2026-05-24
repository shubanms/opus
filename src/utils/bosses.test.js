import { describe, it, expect } from 'vitest';
import { levelCap, cappedLevel, activeBoss, bossList } from './bosses.js';

const none = { totalVolume: 0, bestStreak: 0, prCount: 0, muscleVariety: 0 };
const past10 = { ...none, totalVolume: 30000 };           // clears boss10 only
const all = { totalVolume: 200000, bestStreak: 30, prCount: 20, muscleVariety: 15 };

describe('levelCap', () => {
  it('caps at the first uncleared gate', () => {
    expect(levelCap(none)).toBe(10);
    expect(levelCap(past10)).toBe(20);
    expect(levelCap(all)).toBe(Infinity);
  });
  it('caps at 10 with no stats', () => {
    expect(levelCap(null)).toBe(10);
  });
});

describe('cappedLevel', () => {
  it('blocks a high raw level at the uncleared gate', () => {
    expect(cappedLevel(14, none)).toBe(10);
    expect(cappedLevel(14, past10)).toBe(14); // boss10 cleared, next gate is 20
  });
  it('does not affect levels below the gate', () => {
    expect(cappedLevel(8, none)).toBe(8);
  });
  it('is uncapped once all bosses are cleared', () => {
    expect(cappedLevel(50, all)).toBe(50);
  });
});

describe('activeBoss', () => {
  it('returns the blocking boss when the gate is reached', () => {
    expect(activeBoss(12, none).key).toBe('boss10');
    expect(activeBoss(25, past10).key).toBe('boss20');
  });
  it('is null when the gate has not been reached on XP', () => {
    expect(activeBoss(8, none)).toBeNull();
  });
  it('is null when nothing is blocking', () => {
    expect(activeBoss(50, all)).toBeNull();
  });
});

describe('bossList', () => {
  it('flags cleared bosses', () => {
    const list = bossList(past10);
    expect(list.find((b) => b.gate === 10).cleared).toBe(true);
    expect(list.find((b) => b.gate === 20).cleared).toBe(false);
  });
});
