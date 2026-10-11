// Quest claims are re-checked only where a change could have moved them, by
// the same rule the quest board uses. Against an in-memory database.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { holder, resetDb, installLocalStorage } from './fakeDb.test-helper.js';

vi.mock('../db/db.js', async () => {
  const m = await import('./fakeDb.test-helper.js');
  return { db: m.holder.db };
});

installLocalStorage();
const { reconcileQuests } = await import('./questActions.js');
const db = holder.db;

beforeEach(async () => {
  resetDb();
  await db.exercises.add({ id: 7, name: 'Bench Press', muscleGroup: 'chest' });
  // W1 (7 Sep): bench 100 — a first record. W3 (21 Sep): bench 105 beats it.
  await db.workouts.bulkAdd([
    { id: 1, date: '2026-09-07', status: 'completed', createdAt: 1, totalVolume: 500 },
    { id: 2, date: '2026-09-22', status: 'completed', createdAt: 2, totalVolume: 630 },
  ]);
  await db.sets.bulkAdd([
    { workoutId: 1, exerciseId: 7, weight: 100, reps: 5 },
    { workoutId: 2, exerciseId: 7, weight: 105, reps: 6 },
  ]);
  // The PR rows say W3 holds every record — W1's are gone from the table.
  await db.prs.bulkAdd([
    { exerciseId: 7, type: 'weight', value: 105, achievedAt: 2, workoutId: 2 },
    { exerciseId: 7, type: 'reps', value: 6, achievedAt: 2, workoutId: 2 },
    { exerciseId: 7, type: 'volume', value: 630, achievedAt: 2, workoutId: 2 },
  ]);
});

const claims = async () => (await db.questClaims.toArray()).map((c) => `${c.weekKey}:${c.questId}`).sort();

describe('reconcileQuests', () => {
  it('a week whose record was later beaten keeps its "New Heights" claim', async () => {
    await db.questClaims.add({ weekKey: '2026-09-07', questId: 'pr1', xp: 100 });
    await reconcileQuests();
    expect(await claims()).toEqual(['2026-09-07:pr1']);
  });

  it('only the weeks in scope are judged', async () => {
    // Neither claim holds (one session a week), but only W1 is in scope.
    await db.questClaims.bulkAdd([
      { weekKey: '2026-09-07', questId: 'sessions3', xp: 120 },
      { weekKey: '2026-09-21', questId: 'sessions3', xp: 120 },
    ]);
    await reconcileQuests({ weeks: ['2026-09-07'] });
    expect(await claims()).toEqual(['2026-09-21:sessions3']);
  });

  it('`since` covers that week and every later one', async () => {
    await db.questClaims.bulkAdd([
      { weekKey: '2026-08-31', questId: 'sessions3', xp: 120 },
      { weekKey: '2026-09-07', questId: 'sessions3', xp: 120 },
      { weekKey: '2026-09-21', questId: 'sessions3', xp: 120 },
    ]);
    await reconcileQuests({ since: '2026-09-07' });
    expect(await claims()).toEqual(['2026-08-31:sessions3']);
  });

  it('a Monday session counts in its own week wherever the phone is', async () => {
    // 7 Sep 2026 is a Monday. Read as UTC it was Sunday evening in New York,
    // and the claim that week earned was taken back.
    await db.questClaims.add({ weekKey: '2026-09-07', questId: 'vol5k', xp: 140 });
    await db.workouts.update(1, { totalVolume: 5000 });
    await reconcileQuests();
    expect(await claims()).toEqual(['2026-09-07:vol5k']);
  });

  it('leaves unknown quest ids alone', async () => {
    await db.questClaims.add({ weekKey: '2026-09-07', questId: 'from-a-future-version', xp: 1 });
    await reconcileQuests();
    expect(await claims()).toEqual(['2026-09-07:from-a-future-version']);
  });
});
