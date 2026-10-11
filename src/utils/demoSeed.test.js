import { describe, it, expect } from 'vitest';
import { buildDemoWorkouts, dungeonSessionDate, demoExerciseNames, STREAK_DAYS } from './demoSeed.js';
import { shiftKey } from './dateKey.js';
import { currentDayRun } from './streak.js';

const TODAY = '2026-10-11';

describe('demo seed builder', () => {
  const ws = buildDemoWorkouts(TODAY);

  it('spans about three weeks, oldest first, never in the future', () => {
    const dates = ws.map((w) => w.date);
    expect([...dates].sort()).toEqual(dates);
    expect(new Set(dates).size).toBe(dates.length);
    expect(dates.at(-1) < TODAY).toBe(true);
    expect(dates[0]).toBe(shiftKey(TODAY, -21));
  });

  it('ends in a 12-day streak', () => {
    const run = currentDayRun(ws.map((w) => w.date), []);
    expect(run).toBeGreaterThanOrEqual(STREAK_DAYS);
  });

  it('mixes push, pull and legs with sane totals', () => {
    expect(new Set(ws.map((w) => w.name))).toEqual(new Set(['Push Day', 'Pull Day', 'Leg Day']));
    for (const w of ws) {
      expect(w.sets.length).toBe(w.totalSets);
      expect(w.totalVolume).toBeGreaterThan(0);
      expect(w.xpEarned).toBeGreaterThan(20);
      for (const s of w.sets) {
        expect(s.weight).toBeGreaterThanOrEqual(0);
        expect(s.weight).toBeLessThan(250);
        expect(s.reps).toBeGreaterThan(0);
      }
    }
  });

  it('progresses: the newest session of a split outlifts the oldest', () => {
    const bench = (w) => w.sets.find((s) => s.exercise === 'Bench Press')?.weight;
    const pushes = ws.filter((w) => w.name === 'Push Day');
    expect(bench(pushes.at(-1))).toBeGreaterThan(bench(pushes[0]));
  });

  it('flags exactly one dungeon clear and names its exercises', () => {
    expect(ws.filter((w) => w.dungeon).length).toBe(1);
    expect(dungeonSessionDate(ws)).toBeTruthy();
    expect(demoExerciseNames()).toContain('Back Squat');
  });
});
