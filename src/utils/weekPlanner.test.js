import { describe, it, expect } from 'vitest';
import { makeRng } from './routineGenerator.js';
import {
  SPLITS, SPLIT_LIST, planWeek, weekdayLayout, restFor, sessionCount, resolveDays,
} from './weekPlanner.js';

const MUSCLES = [
  'chest', 'triceps', 'biceps', 'front-deltoids', 'back-deltoids',
  'upper-back', 'lower-back', 'trapezius', 'abs', 'obliques',
  'quadriceps', 'hamstring', 'gluteal', 'calves', 'forearm',
];
const LEVELS = ['beginner', 'intermediate', 'advanced'];
const EQUIP = ['barbell', 'dumbbell', 'cable'];

// Synthetic catalog: 3 exercises per muscle (one per difficulty), ids stable.
const catalog = [];
for (const m of MUSCLES) {
  LEVELS.forEach((difficulty, i) => {
    catalog.push({ id: `${m}-${i}`, name: `${m}-${i}`, muscleGroup: m, difficulty, equipment: EQUIP[i] });
  });
}
const byId = new Map(catalog.map((e) => [e.id, e]));

describe('SPLITS catalog', () => {
  it('exposes the six splits', () => {
    expect(Object.keys(SPLITS).sort()).toEqual(['arnold', 'bro', 'fullBody', 'ppl', 'ulppl', 'upperLower']);
    expect(SPLIT_LIST).toHaveLength(6);
    for (const s of SPLIT_LIST) { expect(s.label).toBeTruthy(); expect(s.days.length).toBeGreaterThan(0); }
  });
});

describe('weekdayLayout', () => {
  it('spreads training days with rest gaps', () => {
    expect(weekdayLayout(3)).toEqual([1, 3, 5]);
    expect(weekdayLayout(4)).toEqual([1, 2, 4, 5]);
    expect(weekdayLayout(6)).toEqual([1, 2, 3, 4, 5, 6]);
  });
});

describe('restFor', () => {
  it('rests compounds longer than isolation, and long > short', () => {
    expect(restFor('standard', true)).toBeGreaterThan(restFor('standard', false));
    expect(restFor('long', true)).toBeGreaterThan(restFor('short', true));
  });
});

describe('sessionCount', () => {
  it('scales exercise count with the time budget, clamped', () => {
    expect(sessionCount(30, 'intermediate')).toBe(4);
    expect(sessionCount(60, 'intermediate')).toBe(6);
    expect(sessionCount(120, 'intermediate')).toBe(8);
    expect(sessionCount(0, 'advanced')).toBe(7); // falls back to level default
  });
});

describe('resolveDays', () => {
  it('snaps to the nearest allowed day count', () => {
    expect(resolveDays('ppl', 3)).toBe(3);
    expect(resolveDays('ppl', 5)).toBe(6); // ppl allows [3,6]
    expect(resolveDays('bro', 3)).toBe(5); // bro allows [5]
  });
});

describe('planWeek', () => {
  it('PPL 6-day → six labelled days on Mon–Sat with populated exercises', () => {
    const week = planWeek({ split: 'ppl', days: 6, level: 'intermediate', sessionMinutes: 60, rest: 'standard', exercises: catalog, rng: makeRng(42) });
    expect(week.map((d) => d.name)).toEqual(['Push A', 'Pull A', 'Legs A', 'Push B', 'Pull B', 'Legs B']);
    expect(week.map((d) => d.dayOfWeek)).toEqual([1, 2, 3, 4, 5, 6]);
    for (const day of week) {
      expect(day.exercises.length).toBeGreaterThan(0);
      for (const ex of day.exercises) {
        expect(ex.targetSets).toBeGreaterThan(0);
        expect(ex.targetReps).toBeGreaterThan(0);
        expect(ex.targetRest).toBeGreaterThan(0);
        // every exercise belongs to that day's muscle groups
        expect(day.groups).toContain(byId.get(ex.exerciseId).muscleGroup);
      }
    }
  });

  it('PPL 3-day → three days on Mon/Wed/Fri', () => {
    const week = planWeek({ split: 'ppl', days: 3, level: 'beginner', exercises: catalog, rng: makeRng(7) });
    expect(week.map((d) => d.name)).toEqual(['Push', 'Pull', 'Legs']);
    expect(week.map((d) => d.dayOfWeek)).toEqual([1, 3, 5]);
  });

  it('Full Body 4-day → four Full Body days', () => {
    const week = planWeek({ split: 'fullBody', days: 4, level: 'intermediate', exercises: catalog, rng: makeRng(1) });
    expect(week).toHaveLength(4);
    expect(week.map((d) => d.name)).toEqual(['Full Body A', 'Full Body B', 'Full Body C', 'Full Body D']);
    expect(week.map((d) => d.dayOfWeek)).toEqual([1, 2, 4, 5]);
  });

  it('is deterministic for a given seed', () => {
    const a = planWeek({ split: 'arnold', days: 6, exercises: catalog, rng: makeRng(99) });
    const b = planWeek({ split: 'arnold', days: 6, exercises: catalog, rng: makeRng(99) });
    expect(a).toEqual(b);
  });

  it('returns [] for an unknown split', () => {
    expect(planWeek({ split: 'nope', days: 3, exercises: catalog, rng: makeRng(1) })).toEqual([]);
  });
});
