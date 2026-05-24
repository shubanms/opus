import { describe, it, expect } from 'vitest';
import { isStaleRoutine, pickStalest, sessionCounts, STALE_WEEKS, STALE_SESSIONS } from './staleRoutine.js';
import { crossedGoal } from './goals.js';

const NOW = new Date('2026-05-24T12:00:00').getTime();
const weeksAgo = (w) => NOW - w * 7 * 86400000;

describe('isStaleRoutine', () => {
  it('needs both age and usage', () => {
    expect(isStaleRoutine({ createdAt: weeksAgo(6) }, 10, NOW)).toBe(true);
    expect(isStaleRoutine({ createdAt: weeksAgo(6) }, 3, NOW)).toBe(false); // too few sessions
    expect(isStaleRoutine({ createdAt: weeksAgo(1) }, 20, NOW)).toBe(false); // too new
  });
  it('is false for a brand-new routine', () => {
    expect(isStaleRoutine({ createdAt: NOW }, 0, NOW)).toBe(false);
  });
  it('exposes the thresholds', () => {
    expect(STALE_WEEKS).toBe(4);
    expect(STALE_SESSIONS).toBe(8);
  });
});

describe('sessionCounts / pickStalest', () => {
  const templates = [
    { id: 1, name: 'Old Push', createdAt: weeksAgo(8) },
    { id: 2, name: 'Older Pull', createdAt: weeksAgo(10) },
    { id: 3, name: 'New Legs', createdAt: weeksAgo(1) },
  ];
  const workouts = [
    ...Array.from({ length: 12 }, () => ({ templateId: 1 })),
    ...Array.from({ length: 9 }, () => ({ templateId: 2 })),
    ...Array.from({ length: 20 }, () => ({ templateId: 3 })),
    { templateId: null },
  ];
  it('counts sessions per template', () => {
    expect(sessionCounts(workouts)).toEqual({ 1: 12, 2: 9, 3: 20 });
  });
  it('returns the most-overused stale routine (ignores the too-new one)', () => {
    const s = pickStalest(templates, workouts, NOW);
    expect(s.id).toBe(1); // 12 sessions > 9; #3 is new so excluded despite 20
  });
  it('returns null when nothing is stale', () => {
    expect(pickStalest([{ id: 9, name: 'x', createdAt: NOW }], [{ templateId: 9 }], NOW)).toBeNull();
  });
});

describe('crossedGoal', () => {
  it('fires only on the upward crossing', () => {
    expect(crossedGoal(7000, 8200, 8000)).toBe(true);
    expect(crossedGoal(8200, 9000, 8000)).toBe(false); // already over
    expect(crossedGoal(8200, 5000, 8000)).toBe(false); // decrease
    expect(crossedGoal(0, 8000, 8000)).toBe(true);     // exactly hits
    expect(crossedGoal(2, 5, 0)).toBe(false);          // no goal
  });
});
