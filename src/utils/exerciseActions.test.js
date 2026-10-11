// Deleting a custom exercise has to take everything it contributed with it —
// and Undo has to bring exactly that back. Against an in-memory database.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { holder, resetDb, installLocalStorage } from './fakeDb.test-helper.js';

vi.mock('../db/db.js', async () => {
  const m = await import('./fakeDb.test-helper.js');
  return { db: m.holder.db };
});

installLocalStorage();
const { deleteCustomExercise, restoreCustomExercise } = await import('./exerciseActions.js');
const { default: useUserStore } = await import('../store/userStore.js');
const { default: useSettingsStore } = await import('../store/settingsStore.js');

const db = holder.db;
const at = (y, m, d, h = 18) => new Date(y, m - 1, d, h).getTime();

async function profile(extra = {}) {
  useUserStore.setState({ profile: null, loaded: false });
  await db.userProfile.put({ id: 1, name: 'T', level: 1, xp: 0, totalXp: 0, title: 'First Rep', streak: 0, lastWorkoutDate: null, ...extra });
  await useUserStore.getState().init();
}

beforeEach(async () => {
  resetDb();
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(2026, 9, 7, 12, 0));
  useSettingsStore.setState({ onboarded: true, hadData: true });
  await db.exercises.bulkAdd([
    { id: 1, name: 'Bench Press', muscleGroup: 'chest', equipment: 'barbell' },
    { id: 200, name: 'My Curl', muscleGroup: 'biceps', equipment: 'dumbbell', isCustom: true },
  ]);
});
afterEach(() => vi.useRealTimers());

describe('deleteCustomExercise', () => {
  it('a session that held only this lift goes too — it was not a session any more', async () => {
    await db.workouts.add({ id: 1, date: '2026-09-01', status: 'completed', xpEarned: 300, totalVolume: 2000, totalSets: 2, createdAt: at(2026, 9, 1) });
    await db.energyLogs.add({ workoutId: 1, level: 4 });
    await db.sets.bulkAdd([
      { workoutId: 1, exerciseId: 200, setNumber: 1, weight: 20, reps: 50, completedAt: 1 },
      { workoutId: 1, exerciseId: 200, setNumber: 2, weight: 20, reps: 50, completedAt: 2 },
    ]);
    await db.workouts.add({ id: 2, date: '2026-09-02', status: 'completed', xpEarned: 80, totalVolume: 500, totalSets: 1, createdAt: at(2026, 9, 2) });
    await db.sets.add({ workoutId: 2, exerciseId: 1, setNumber: 1, weight: 50, reps: 10, completedAt: 3 });
    await db.exerciseNotes.add({ exerciseId: 200, text: 'Slow negatives', updatedAt: 1 });
    await db.achievements.bulkAdd([{ key: 'first', unlockedAt: 1 }, { key: 'architect', unlockedAt: 2 }]);
    await profile({ xp: 480, totalXp: 480, level: 2, streak: 2, lastWorkoutDate: '2026-09-02' });

    const snap = await deleteCustomExercise(200);
    expect(await db.workouts.get(1)).toBeUndefined();
    expect(await db.energyLogs.count()).toBe(0);
    expect(await db.exerciseNotes.count()).toBe(0);
    // "Architect" (made a custom exercise) is no longer true.
    expect((await db.achievements.toArray()).map((a) => a.key)).toEqual(['first']);
    expect((await db.userProfile.get(1))).toMatchObject({ totalXp: 80 + 50, streak: 1, lastWorkoutDate: '2026-09-02' });

    await restoreCustomExercise(snap);
    expect(await db.workouts.get(1)).toMatchObject({ xpEarned: 300, totalSets: 2 });
    expect(await db.energyLogs.count()).toBe(1);
    expect((await db.exerciseNotes.toArray()).map((n) => n.text)).toEqual(['Slow negatives']);
    expect((await db.achievements.toArray()).map((a) => a.key).sort()).toEqual(['architect', 'first']);
    expect((await db.userProfile.get(1)).totalXp).toBe(480);
  });

  it('a session that keeps other lifts gives back this lift\'s base XP and totals', async () => {
    await db.workouts.add({ id: 1, date: '2026-09-01', status: 'completed', xpEarned: 300, totalVolume: 1500, totalSets: 2, createdAt: at(2026, 9, 1) });
    await db.sets.bulkAdd([
      { workoutId: 1, exerciseId: 1, setNumber: 1, weight: 100, reps: 10, completedAt: 1 },
      { workoutId: 1, exerciseId: 200, setNumber: 1, weight: 50, reps: 10, bonusXp: 7, completedAt: 2 },
    ]);
    const records = [
      { id: 1, exerciseId: 200, type: 'weight', value: 50, achievedAt: 2, workoutId: 1 },
      { id: 2, exerciseId: 200, type: 'reps', value: 10, achievedAt: 2, workoutId: 1 },
      { id: 3, exerciseId: 200, type: 'volume', value: 500, achievedAt: 2, workoutId: 1 },
    ];
    await db.prs.bulkAdd(records);
    await db.templates.add({ id: 9, name: 'Arms' });
    await db.templateExercises.add({ templateId: 9, exerciseId: 200, orderIndex: 0 });
    await profile({ xp: 300, totalXp: 300 });

    const snap = await deleteCustomExercise(200);
    // 50×10 = 50 base XP + its 7 crit bonus come off; the multiplier is not re-scored.
    expect(await db.workouts.get(1)).toMatchObject({ xpEarned: 243, totalVolume: 1000, totalSets: 1 });
    expect(await db.prs.count()).toBe(0);
    expect(await db.templateExercises.count()).toBe(0);
    expect(snap.xpApplied).toEqual({ 1: 57 });

    await restoreCustomExercise(snap);
    expect(await db.workouts.get(1)).toMatchObject({ xpEarned: 300, totalVolume: 1500, totalSets: 2 });
    expect(await db.prs.toArray()).toEqual(records);
    expect(await db.templateExercises.count()).toBe(1);
  });

  it('a session left with only another lift\'s warm-ups goes too, and comes back whole', async () => {
    await db.workouts.add({ id: 1, date: '2026-09-01', status: 'completed', xpEarned: 120, totalVolume: 1000, totalSets: 1, createdAt: at(2026, 9, 1) });
    await db.workouts.add({ id: 2, date: '2026-09-03', status: 'completed', xpEarned: 90, totalVolume: 900, totalSets: 1, createdAt: at(2026, 9, 3) });
    await db.sets.bulkAdd([
      { id: 1, workoutId: 1, exerciseId: 1, setNumber: 1, weight: 40, reps: 10, isWarmup: true, completedAt: 1 },
      { id: 2, workoutId: 1, exerciseId: 200, setNumber: 1, weight: 100, reps: 10, completedAt: 2 },
      { id: 3, workoutId: 2, exerciseId: 1, setNumber: 1, weight: 90, reps: 10, completedAt: 3 },
    ]);
    await profile({ xp: 210, totalXp: 210 });
    const before = await db.sets.toArray();

    const snap = await deleteCustomExercise(200);
    expect(await db.workouts.get(1)).toBeUndefined();
    expect((await db.sets.toArray()).map((s) => s.id)).toEqual([3]);

    await restoreCustomExercise(snap);
    expect(await db.workouts.get(1)).toBeTruthy();
    expect(await db.sets.toArray()).toEqual(before);
  });

  it('emptying every session is a deliberate act, not a wipe', async () => {
    await db.workouts.add({ id: 1, date: '2026-09-01', status: 'completed', xpEarned: 30, createdAt: at(2026, 9, 1) });
    await db.sets.add({ workoutId: 1, exerciseId: 200, setNumber: 1, weight: 20, reps: 5 });
    await profile();
    await deleteCustomExercise(200);
    expect(await db.workouts.count()).toBe(0);
    expect(useSettingsStore.getState().hadData).toBe(false);
  });

  it('never deletes a stock exercise', async () => {
    expect(await deleteCustomExercise(1)).toBeNull();
    expect(await db.exercises.get(1)).toBeTruthy();
  });
});
