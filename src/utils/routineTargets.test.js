import { describe, it, expect } from 'vitest';
import { targetsFromSets, lastSession, canRefreshRoutine, sameLiftInStep } from './routineTargets.js';

describe('targetsFromSets', () => {
  it('working-set count, median reps, top weight', () => {
    const t = targetsFromSets([
      { weight: 40, reps: 10, isWarmup: true },
      { weight: 80, reps: 8 },
      { weight: 80, reps: 7 },
      { weight: 77.5, reps: 6 },
    ]);
    expect(t).toEqual({ targetSets: 3, targetReps: 7, targetWeight: 80 });
  });

  it('bodyweight work has no target weight', () => {
    expect(targetsFromSets([{ weight: 0, reps: 12 }, { weight: 0, reps: 10 }])).toEqual({ targetSets: 2, targetReps: 12, targetWeight: null });
  });

  it('ignores cardio and handles nothing', () => {
    expect(targetsFromSets([{ isCardio: true, durationSec: 600 }])).toEqual({ targetSets: null, targetReps: null, targetWeight: null });
    expect(targetsFromSets(undefined)).toEqual({ targetSets: null, targetReps: null, targetWeight: null });
  });
});

describe('lastSession', () => {
  const workouts = [
    { id: 10, date: '2026-09-20', createdAt: 5 },
    { id: 4, date: '2026-09-27', createdAt: 1 }, // newer by date despite the lower id (an import)
    { id: 11, date: '2026-09-27', createdAt: 0 },
  ];
  const sets = [
    { workoutId: 10, setNumber: 1, weight: 70, reps: 8 },
    { workoutId: 4, setNumber: 2, weight: 75, reps: 6 },
    { workoutId: 4, setNumber: 1, weight: 75, reps: 8 },
    { workoutId: 11, setNumber: 1, weight: 72.5, reps: 8 },
    { workoutId: 99, setNumber: 1, weight: 200, reps: 1 }, // workout deleted
  ];

  it('picks the latest workout by date, then save time', () => {
    const last = lastSession(sets, workouts);
    expect(last.workout.id).toBe(4);
    expect(last.sets.map((s) => s.setNumber)).toEqual([1, 2]);
  });

  it('is null with no surviving sessions', () => {
    expect(lastSession([{ workoutId: 99 }], workouts)).toBeNull();
    expect(lastSession([], [])).toBeNull();
  });
});

describe('canRefreshRoutine', () => {
  it('refreshes only what "Save as routine" wrote itself', () => {
    expect(canRefreshRoutine({ autoKey: 'push', source: 'auto', dayOfWeek: 1 }, 'push')).toBe(true);
    expect(canRefreshRoutine({ autoKey: 'push', source: 'plan', dayOfWeek: null }, 'push')).toBe(false);
    expect(canRefreshRoutine({ autoKey: 'push', source: 'user' }, 'push')).toBe(false);
    expect(canRefreshRoutine({ autoKey: 'pull', source: 'auto' }, 'push')).toBe(false);
  });

  it('legacy rows (no source) only when they have no weekday — planned days always had one', () => {
    expect(canRefreshRoutine({ autoKey: 'push', dayOfWeek: 1 }, 'push')).toBe(false);
    expect(canRefreshRoutine({ autoKey: 'push', dayOfWeek: null }, 'push')).toBe(true);
    expect(canRefreshRoutine({ autoKey: 'push' }, 'push')).toBe(true);
  });

  it('a planner key never matches a session key', () => {
    expect(canRefreshRoutine({ autoKey: 'plan:legs', source: 'plan', dayOfWeek: 3 }, 'legs')).toBe(false);
  });

  it('never matches without a key, or a planner key against a session key', () => {
    expect(canRefreshRoutine({ autoKey: null, source: 'auto' }, null)).toBe(false);
    expect(canRefreshRoutine(null, 'push')).toBe(false);
    expect(canRefreshRoutine({ autoKey: 'plan:push', dayOfWeek: null }, 'push')).toBe(false);
  });
});

describe('sameLiftInStep', () => {
  const squat = { exerciseId: 1, targetSets: 5, targetReps: 5, targetWeight: 100 };

  it('same lift, same prescription, same weight', () => {
    expect(sameLiftInStep(squat, { ...squat })).toBe(true);
    expect(sameLiftInStep(squat, { ...squat, targetWeight: 100.004 })).toBe(true); // lb rounding
    expect(sameLiftInStep({ ...squat, targetWeight: null }, { ...squat, targetWeight: null })).toBe(true);
  });

  it('a different prescription, weight or exercise is a different lift', () => {
    expect(sameLiftInStep(squat, { ...squat, targetSets: 3, targetReps: 10 })).toBe(false);
    expect(sameLiftInStep(squat, { ...squat, targetWeight: 90 })).toBe(false);
    expect(sameLiftInStep(squat, { ...squat, targetWeight: null })).toBe(false);
    expect(sameLiftInStep(squat, { ...squat, exerciseId: 2 })).toBe(false);
    expect(sameLiftInStep(squat, null)).toBe(false);
  });
});
