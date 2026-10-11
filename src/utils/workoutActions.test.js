// Delete / undo / edit against an in-memory database (see fakeDb.test-helper).
// Each scenario here was reproduced against the real app before it was fixed.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { holder, resetDb, installLocalStorage } from './fakeDb.test-helper.js';

vi.mock('../db/db.js', async () => {
  const m = await import('./fakeDb.test-helper.js');
  return { db: m.holder.db };
});

installLocalStorage();
const {
  deleteWorkout, restoreWorkout, recomputePRs, healRecords,
  updateWorkoutSet, revertSetEdit, addWorkoutSet, deleteWorkoutSet, restoreWorkoutSet, moveWorkoutDate,
} = await import('./workoutActions.js');
const { default: useUserStore } = await import('../store/userStore.js');
const { default: useSettingsStore } = await import('../store/settingsStore.js');

const db = holder.db;
const at = (y, m, d, h = 18, min = 0) => new Date(y, m - 1, d, h, min).getTime();

async function profile(extra = {}) {
  useUserStore.setState({ profile: null, loaded: false });
  await db.userProfile.put({ id: 1, name: 'T', level: 1, xp: 0, totalXp: 0, title: 'First Rep', streak: 0, lastWorkoutDate: null, ...extra });
  await useUserStore.getState().init();
}

const benchRows = async () =>
  (await db.prs.where('exerciseId').equals(1).toArray()).sort((a, b) => a.type.localeCompare(b.type));

beforeEach(() => {
  resetDb();
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(2026, 9, 7, 12, 0)); // Wed 7 Oct 2026, local
  useSettingsStore.setState({ onboarded: true, hadData: true, lastKnownWorkouts: 3 });
});
afterEach(() => vi.useRealTimers());

// Three sessions: bench in W1 and W3 (W3's supersedes W1's records, as the
// live save path upserts them), squat this week. A "New Heights" claim for W1.
async function threeWeeks() {
  await db.exercises.bulkAdd([
    { id: 1, name: 'Bench Press', muscleGroup: 'chest', equipment: 'barbell' },
    { id: 2, name: 'Squat', muscleGroup: 'quadriceps', equipment: 'barbell' },
  ]);
  await db.workouts.add({ id: 1, date: '2026-09-08', status: 'completed', xpEarned: 200, totalVolume: 500, totalSets: 1, createdAt: at(2026, 9, 8, 19) });
  await db.sets.add({ id: 11, workoutId: 1, exerciseId: 1, setNumber: 1, weight: 100, reps: 5, completedAt: at(2026, 9, 8, 18, 30) });
  await db.workouts.add({ id: 2, date: '2026-09-22', status: 'completed', xpEarned: 210, totalVolume: 630, totalSets: 1, createdAt: at(2026, 9, 22, 19) });
  await db.sets.add({ id: 21, workoutId: 2, exerciseId: 1, setNumber: 1, weight: 105, reps: 6, completedAt: at(2026, 9, 22, 18, 30) });
  // The live path stamps a record when the session is SAVED (19:00), which a
  // rebuild from sets (18:30) cannot know — the undo test depends on that.
  await db.prs.bulkAdd([
    { id: 1, exerciseId: 1, type: 'weight', value: 105, achievedAt: at(2026, 9, 22, 19), workoutId: 2 },
    { id: 2, exerciseId: 1, type: 'reps', value: 6, achievedAt: at(2026, 9, 22, 19), workoutId: 2 },
    { id: 3, exerciseId: 1, type: 'volume', value: 630, achievedAt: at(2026, 9, 22, 19), workoutId: 2 },
  ]);
  await db.workouts.add({ id: 3, date: '2026-10-06', status: 'completed', xpEarned: 150, totalVolume: 300, totalSets: 1, createdAt: at(2026, 10, 6, 19) });
  await db.sets.add({ id: 31, workoutId: 3, exerciseId: 2, setNumber: 1, weight: 60, reps: 5, completedAt: at(2026, 10, 6, 18, 30) });
  await db.prs.bulkAdd([
    { id: 4, exerciseId: 2, type: 'weight', value: 60, achievedAt: at(2026, 10, 6, 19), workoutId: 3 },
    { id: 5, exerciseId: 2, type: 'reps', value: 5, achievedAt: at(2026, 10, 6, 19), workoutId: 3 },
    { id: 6, exerciseId: 2, type: 'volume', value: 300, achievedAt: at(2026, 10, 6, 19), workoutId: 3 },
  ]);
  await db.questClaims.add({ weekKey: '2026-09-07', questId: 'pr1', xp: 100, claimedAt: at(2026, 9, 9) });
  await db.achievements.add({ key: 'first', unlockedAt: at(2026, 9, 8) });
  await profile({ xp: 710, totalXp: 710, level: 2, streak: 2, lastWorkoutDate: '2026-10-06' });
}

describe('deleteWorkout: records keep their dates', () => {
  it('deleting an older session leaves records it did not hold untouched', async () => {
    await threeWeeks();
    const before = await benchRows();
    await deleteWorkout(1);
    expect(await benchRows()).toEqual(before);
  });

  it('a record that changes hands takes the date and workout of the set that now holds it', async () => {
    await threeWeeks();
    await deleteWorkout(2);
    const rows = await benchRows();
    expect(rows.map((p) => [p.type, p.value, p.workoutId])).toEqual([
      ['reps', 5, 1], ['volume', 500, 1], ['weight', 100, 1],
    ]);
    // 8 Sep, not today: this is what Hall of Records, Wrapped and the PR quest read.
    expect(rows.every((p) => p.achievedAt === at(2026, 9, 8, 18, 30))).toBe(true);
  });

  it('undo puts every record back exactly — ids, values, dates, workouts', async () => {
    await threeWeeks();
    const before = await benchRows();
    const snap = await deleteWorkout(2);
    await restoreWorkout(snap);
    expect(await benchRows()).toEqual(before);
  });

  it('heals records an older build re-dated to "now" with no workout', async () => {
    await threeWeeks();
    await db.prs.update(1, { achievedAt: Date.now(), workoutId: null });
    expect(await healRecords()).toBe(1);
    const weight = (await benchRows()).find((p) => p.type === 'weight');
    expect(weight).toMatchObject({ id: 1, value: 105, workoutId: 2, achievedAt: at(2026, 9, 22, 18, 30) });
    expect(await healRecords()).toBe(0);
  });

  it('recomputePRs keeps a record on the first set to reach it, not a later tie', async () => {
    await threeWeeks();
    await db.workouts.add({ id: 4, date: '2026-09-29', status: 'completed', xpEarned: 1, createdAt: at(2026, 9, 29, 19) });
    await db.sets.add({ id: 41, workoutId: 4, exerciseId: 1, setNumber: 1, weight: 105, reps: 1, completedAt: at(2026, 9, 29, 18) });
    await recomputePRs(1);
    expect((await benchRows()).find((p) => p.type === 'weight').workoutId).toBe(2);
  });
});

describe('deleteWorkout: quests and badges', () => {
  it('deleting an unrelated session keeps a past week\'s fairly-won PR claim', async () => {
    await threeWeeks();
    await deleteWorkout(3);
    expect((await db.questClaims.toArray()).map((c) => c.questId)).toEqual(['pr1']);
    // 200 + 210 workouts + 50 "First Rep" + 100 claim.
    expect((await db.userProfile.get(1)).totalXp).toBe(560);
  });

  it('a claim the deleted session itself earned is taken back, and undo returns it', async () => {
    await threeWeeks();
    const snap = await deleteWorkout(1);
    expect(await db.questClaims.count()).toBe(0);
    expect(snap.questClaims.map((c) => c.questId)).toEqual(['pr1']);
    await restoreWorkout(snap);
    expect((await db.questClaims.toArray()).map((c) => c.questId)).toEqual(['pr1']);
    expect((await db.userProfile.get(1)).totalXp).toBe(710);
  });

  it('delete A, delete B, undo A: only what A took comes back', async () => {
    await db.exercises.add({ id: 1, name: 'Bench Press', muscleGroup: 'chest', equipment: 'barbell' });
    for (let i = 1; i <= 10; i++) {
      await db.workouts.add({ id: i, date: `2026-09-${String(i).padStart(2, '0')}`, status: 'completed', xpEarned: 100, totalVolume: 1000, totalSets: 1, createdAt: at(2026, 9, i) });
      await db.sets.add({ workoutId: i, exerciseId: 1, setNumber: 1, weight: 100, reps: 10, completedAt: at(2026, 9, i) });
    }
    await recomputePRs(1);
    await db.achievements.bulkAdd([
      { key: 'first', unlockedAt: 1 }, { key: 'w10', unlockedAt: 2 }, { key: 'vol10k', unlockedAt: 3 }, { key: 'streak7', unlockedAt: 4 },
    ]);
    await profile({ xp: 1350, totalXp: 1350, level: 3, streak: 10, lastWorkoutDate: '2026-09-10' });

    const snapA = await deleteWorkout(10);
    expect(snapA.achievements.map((a) => a.key).sort()).toEqual(['vol10k', 'w10']);
    const snapB = await deleteWorkout(9);
    expect(snapB.achievements).toEqual([]);
    await restoreWorkout(snapA);

    const keys = (await db.achievements.toArray()).map((a) => a.key).sort();
    // 9 sessions, 9,000 kg: Getting Serious and Ten Tonne must stay locked.
    expect(keys).toEqual(['first', 'streak7']);
    expect((await db.userProfile.get(1)).totalXp).toBe(900 + 50 + 100);
  });

  it('a delete that costs a level costs that level\'s badge', async () => {
    await db.workouts.add({ id: 1, date: '2026-09-01', status: 'completed', xpEarned: 4800, totalVolume: 10, totalSets: 1, createdAt: at(2026, 9, 1) });
    await db.workouts.add({ id: 2, date: '2026-09-03', status: 'completed', xpEarned: 100, totalVolume: 10, totalSets: 1, createdAt: at(2026, 9, 3) });
    await db.achievements.bulkAdd([{ key: 'first', unlockedAt: 1 }, { key: 'level5', unlockedAt: 2 }]);
    await profile({ xp: 4950, totalXp: 4950, level: 5, streak: 1, lastWorkoutDate: '2026-09-03' });
    const snap = await deleteWorkout(1);
    expect((await db.userProfile.get(1)).level).toBe(1);
    expect((await db.achievements.toArray()).map((a) => a.key)).toEqual(['first']);
    await restoreWorkout(snap);
    expect((await db.achievements.toArray()).map((a) => a.key).sort()).toEqual(['first', 'level5']);
    expect((await db.userProfile.get(1)).level).toBe(5);
  });
});

describe('deleteWorkout: the wipe alarm', () => {
  it('deleting your last workout on purpose disarms the "history is missing" alarm first', async () => {
    await db.workouts.add({ id: 1, date: '2026-10-01', status: 'completed', xpEarned: 10, createdAt: at(2026, 10, 1) });
    await profile();
    await deleteWorkout(1);
    expect(useSettingsStore.getState().hadData).toBe(false);
  });

  it('leaves it armed while other sessions remain', async () => {
    await threeWeeks();
    await deleteWorkout(3);
    expect(useSettingsStore.getState().hadData).toBe(true);
  });
});

describe('editing a saved session', () => {
  it('a corrected weight moves totals, records and XP by the base difference — and undo reverses it exactly', async () => {
    await threeWeeks();
    const before = { workout: await db.workouts.get(2), prs: await benchRows(), totalXp: (await db.userProfile.get(1)).totalXp };
    // 105×6 was really 110×6: base XP 63 → 66.
    const snap = await updateWorkoutSet(21, { weight: 110 });
    const w = await db.workouts.get(2);
    expect(w.totalVolume).toBe(660);
    expect(w.totalSets).toBe(1);
    expect(w.xpEarned).toBe(213);
    expect((await benchRows()).find((p) => p.type === 'weight')).toMatchObject({ value: 110, workoutId: 2 });
    expect((await db.userProfile.get(1)).totalXp).toBe(before.totalXp + 3);

    await revertSetEdit(snap);
    expect(await db.workouts.get(2)).toEqual(before.workout);
    expect(await benchRows()).toEqual(before.prs);
    expect((await db.userProfile.get(1)).totalXp).toBe(before.totalXp);
  });

  it('marking a set as a warm-up takes it out of totals and records', async () => {
    await threeWeeks();
    await addWorkoutSet(2, 1, { weight: 60, reps: 10 });
    const warm = (await db.sets.where('workoutId').equals(2).toArray()).find((s) => s.weight === 60);
    await updateWorkoutSet(warm.id, { isWarmup: true });
    const w = await db.workouts.get(2);
    expect(w.totalSets).toBe(1);
    expect(w.totalVolume).toBe(630);
    expect(w.xpEarned).toBe(210);
  });

  it('a forgotten set is numbered after its siblings and can set a record', async () => {
    await threeWeeks();
    const added = await addWorkoutSet(2, 1, { weight: 107.5, reps: 3 });
    expect(added.set).toMatchObject({ setNumber: 2, weight: 107.5, reps: 3, isWarmup: false });
    expect(added.set.completedAt).toBe(at(2026, 9, 22, 18, 30) + 1000);
    const w = await db.workouts.get(2);
    expect(w).toMatchObject({ totalSets: 2, totalVolume: 630 + 323, xpEarned: 210 + 32 });
    expect((await benchRows()).find((p) => p.type === 'weight')).toMatchObject({ value: 107.5, workoutId: 2 });
  });

  it('deleting a set offers it back exactly; deleting the last set takes the session', async () => {
    await threeWeeks();
    await addWorkoutSet(2, 1, { weight: 50, reps: 10 });
    const before = await db.workouts.get(2);
    const extra = (await db.sets.where('workoutId').equals(2).toArray()).find((s) => s.weight === 50);
    const snap = await deleteWorkoutSet(extra.id);
    expect(snap.kind).toBe('set');
    expect((await db.workouts.get(2)).totalSets).toBe(1);
    await restoreWorkoutSet(snap);
    expect(await db.workouts.get(2)).toEqual(before);

    const last = await deleteWorkoutSet(31);
    expect(last.kind).toBe('workout');
    expect(await db.workouts.get(3)).toBeUndefined();
    await restoreWorkoutSet(last);
    expect(await db.workouts.get(3)).toBeTruthy();
  });

  it('deleting a session\'s last working set takes the session, warm-ups and all — undo brings it all back', async () => {
    await threeWeeks();
    await db.sets.add({ id: 30, workoutId: 3, exerciseId: 2, setNumber: 0, weight: 30, reps: 10, isWarmup: true, completedAt: at(2026, 10, 6, 18) });
    const before = { workout: await db.workouts.get(3), sets: await db.sets.where('workoutId').equals(3).toArray() };
    const snap = await deleteWorkoutSet(31);
    expect(snap.kind).toBe('workout');
    expect(await db.workouts.get(3)).toBeUndefined();
    expect(await db.sets.where('workoutId').equals(3).count()).toBe(0);
    await restoreWorkoutSet(snap);
    expect(await db.workouts.get(3)).toEqual(before.workout);
    expect(await db.sets.where('workoutId').equals(3).toArray()).toEqual(before.sets);
  });

  it('cardio bouts give back their calories when deleted', async () => {
    await threeWeeks();
    await db.workouts.update(3, { totalCalories: 400 });
    await db.sets.add({ id: 32, workoutId: 3, exerciseId: 2, setNumber: 2, weight: 0, reps: 0, isCardio: true, durationSec: 900, calories: 150, bonusXp: 15 });
    const snap = await deleteWorkoutSet(32);
    expect((await db.workouts.get(3)).totalCalories).toBe(250);
    expect((await db.workouts.get(3)).xpEarned).toBe(135);
    await restoreWorkoutSet(snap);
    expect((await db.workouts.get(3))).toMatchObject({ totalCalories: 400, xpEarned: 150 });
  });

  it('XP never goes below zero, and undo returns exactly what was taken', async () => {
    await threeWeeks();
    await db.workouts.update(2, { xpEarned: 20 });
    const snap = await updateWorkoutSet(21, { weight: 0, reps: 1 });
    expect((await db.workouts.get(2)).xpEarned).toBe(0);
    expect(snap.xpApplied).toBe(-20);
    await revertSetEdit(snap);
    expect((await db.workouts.get(2)).xpEarned).toBe(20);
  });
});

describe('moving a session to another day', () => {
  it('moves the session, its sets and its records together, and re-dates the streak', async () => {
    await threeWeeks();
    const res = await moveWorkoutDate(3, '2026-10-02');
    expect(res).toMatchObject({ from: '2026-10-06', to: '2026-10-02' });
    const w = await db.workouts.get(3);
    expect(w.date).toBe('2026-10-02');
    expect(w.createdAt).toBe(at(2026, 10, 2, 19));
    expect((await db.sets.get(31)).completedAt).toBe(at(2026, 10, 2, 18, 30));
    const squat = await db.prs.where('exerciseId').equals(2).toArray();
    expect(squat.every((p) => p.achievedAt === at(2026, 10, 2, 19))).toBe(true);
    expect((await db.userProfile.get(1)).lastWorkoutDate).toBe('2026-10-02');
  });

  it('moving a session earlier can hand it a record, and undo hands it back', async () => {
    await threeWeeks();
    const before = await benchRows();
    // Bench 105 moved before the 100 session: now 105 came first; nothing changes hands
    // (105 still the best), but its date moves with it.
    const res = await moveWorkoutDate(2, '2026-09-01');
    expect((await benchRows()).find((p) => p.type === 'weight')).toMatchObject({ workoutId: 2, achievedAt: at(2026, 9, 1, 19) });
    await moveWorkoutDate(2, res.from, { restore: res.derived });
    expect(await benchRows()).toEqual(before);
  });

  it('refuses the future and no-op moves', async () => {
    await threeWeeks();
    expect(await moveWorkoutDate(3, '2026-10-08')).toBeNull();
    expect(await moveWorkoutDate(3, '2026-10-06')).toBeNull();
    expect(await moveWorkoutDate(3, 'not a date')).toBeNull();
  });

  it('moving onto today never puts the session in the future', async () => {
    await threeWeeks();
    // Saved at 19:00 on 6 Oct; it is 12:00 on 7 Oct.
    await moveWorkoutDate(3, '2026-10-07');
    const w = await db.workouts.get(3);
    expect(w.date).toBe('2026-10-07');
    expect(w.createdAt).toBeLessThanOrEqual(Date.now());
  });
});
