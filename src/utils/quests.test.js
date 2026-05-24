import { describe, it, expect } from 'vitest';
import { weeklyQuests, weekKeyOf, weekIndex, QUEST_POOL } from './quests.js';

const monday = new Date('2026-05-18T09:00:00'); // a Monday
const sameWeek = new Date('2026-05-24T22:00:00'); // the following Sunday
const nextWeek = new Date('2026-05-25T09:00:00'); // next Monday

describe('weekKeyOf', () => {
  it('is stable across a single week', () => {
    expect(weekKeyOf(sameWeek)).toBe(weekKeyOf(monday));
  });
  it('changes on the next Monday', () => {
    expect(weekKeyOf(nextWeek)).not.toBe(weekKeyOf(monday));
  });
  it('returns the Monday date', () => {
    expect(weekKeyOf(sameWeek)).toBe('2026-05-18');
  });
});

describe('weeklyQuests', () => {
  it('returns 3 quests', () => {
    expect(weeklyQuests(monday)).toHaveLength(3);
  });
  it('picks distinct metrics', () => {
    const metrics = weeklyQuests(monday).map((q) => q.metric);
    expect(new Set(metrics).size).toBe(metrics.length);
  });
  it('is deterministic within a week', () => {
    expect(weeklyQuests(monday)).toEqual(weeklyQuests(sameWeek));
  });
  it('rotates across weeks', () => {
    const a = weeklyQuests(monday).map((q) => q.id).join(',');
    const b = weeklyQuests(nextWeek).map((q) => q.id).join(',');
    expect(a).not.toBe(b);
  });
  it('only returns quests from the pool', () => {
    const ids = new Set(QUEST_POOL.map((q) => q.id));
    for (const q of weeklyQuests(monday)) expect(ids.has(q.id)).toBe(true);
  });
});

describe('weekIndex', () => {
  it('increments by one each week', () => {
    expect(weekIndex(nextWeek) - weekIndex(monday)).toBe(1);
  });
});
