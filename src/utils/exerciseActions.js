import { db } from '../db/db.js';
import { computeVolume } from './volume.js';
import { setXp } from './historyMath.js';
import { weekKeyOfDateKey } from './quests.js';
import {
  acknowledgeEmptyHistory,
  putBackRewards,
  recomputePRs,
  settleDerived,
} from './workoutActions.js';

export async function toggleFavorite(exerciseId) {
  const ex = await db.exercises.get(exerciseId);
  if (ex) await db.exercises.update(exerciseId, { favorite: !ex.favorite });
}

export async function setExerciseColor(exerciseId, color) {
  await db.exercises.update(exerciseId, { color: color ?? null });
}

async function recomputeWorkoutTotals(workoutId) {
  const workout = await db.workouts.get(workoutId);
  const sets = (await db.sets.where('workoutId').equals(workoutId).toArray()).filter((s) => !s.isWarmup);
  await db.workouts.update(workoutId, {
    totalVolume: await computeVolume(sets, workout?.bodyweightKg),
    totalSets: sets.length,
  });
}

const weeksOf = (workouts) => [...new Set(workouts.map((w) => weekKeyOfDateKey(w?.date)).filter(Boolean))].sort();

// Every table a custom-exercise delete or restore writes.
const CASCADE = () => [db.exercises, db.sets, db.prs, db.templateExercises, db.exerciseNotes, db.workouts, db.energyLogs];

/**
 * Fully removes a custom exercise and everything it contributed: the library
 * entry, its logged sets, records, routine links and coaching note — and what
 * those sets were worth to the sessions they were in.
 *
 * It used to stop at the rows. A session that held only this lift was left as
 * an empty shell that still counted as a session and a streak day, with all
 * its XP; sessions that kept other lifts kept this one's XP too; badges and
 * quests it had earned stayed earned. Now an emptied session is deleted, a
 * surviving one gives back the base XP of the sets it lost (multipliers are not
 * re-scored — see historyMath.setXp), and badges and claims are reconciled
 * like any other delete.
 */
export async function deleteCustomExercise(exerciseId) {
  const exercise = await db.exercises.get(exerciseId);
  if (!exercise || !exercise.isCustom) return null;

  const sets = await db.sets.where('exerciseId').equals(exerciseId).toArray();
  const prs = await db.prs.where('exerciseId').equals(exerciseId).toArray();
  const links = await db.templateExercises.where('exerciseId').equals(exerciseId).toArray();
  const notes = await db.exerciseNotes.where('exerciseId').equals(exerciseId).toArray();

  // Which sessions survive (they keep another lift's working sets) and which
  // empty out — a session left with nothing but warm-ups is one the app would
  // never have saved, so it goes too, warm-ups and all.
  const affected = (await db.workouts.bulkGet([...new Set(sets.map((s) => s.workoutId))])).filter(Boolean);
  const emptied = [];
  const leftovers = []; // other lifts' warm-ups in emptied sessions
  for (const w of affected) {
    const others = await db.sets.where('workoutId').equals(w.id).filter((s) => s.exerciseId !== exerciseId).toArray();
    if (!others.some((s) => !s.isWarmup)) {
      emptied.push(w);
      leftovers.push(...others);
    }
  }
  const emptiedIds = [...new Set(emptied.map((w) => w.id))];
  const energyLogs = emptiedIds.length ? await db.energyLogs.where('workoutId').anyOf(emptiedIds).toArray() : [];

  // Taking every session with it is a deliberate act, not a browser wipe.
  if (emptiedIds.length && emptiedIds.length >= (await db.workouts.count())) acknowledgeEmptyHistory();

  // XP actually given back per surviving session (never below zero), so the
  // undo returns exactly that and can never mint XP.
  const xpApplied = {};
  await db.transaction('rw', CASCADE(), async () => {
    await db.sets.where('exerciseId').equals(exerciseId).delete();
    await db.prs.where('exerciseId').equals(exerciseId).delete();
    await db.templateExercises.where('exerciseId').equals(exerciseId).delete();
    await db.exerciseNotes.where('exerciseId').equals(exerciseId).delete();
    await db.exercises.delete(exerciseId);
    if (emptiedIds.length) {
      if (leftovers.length) await db.sets.bulkDelete(leftovers.map((s) => s.id));
      await db.energyLogs.where('workoutId').anyOf(emptiedIds).delete();
      await db.workouts.bulkDelete(emptiedIds);
    }
    for (const w of affected) {
      if (emptiedIds.includes(w.id)) continue;
      const lostXp = sets.filter((s) => s.workoutId === w.id).reduce((a, s) => a + setXp(s), 0);
      const next = Math.max(0, (w.xpEarned || 0) - lostXp);
      xpApplied[w.id] = (w.xpEarned || 0) - next;
      await db.workouts.update(w.id, { xpEarned: next });
    }
  });

  for (const id of Object.keys(xpApplied)) await recomputeWorkoutTotals(Number(id));
  // Warm-ups never hold a record, so only this lift's records went — no other
  // exercise needs a rebuild. The affected weeks are the only ones whose quest
  // totals can have dropped.
  const lost = await settleDerived({ weeks: weeksOf(affected) });

  return { exercise, sets, leftovers, prs, links, notes, workouts: emptied, energyLogs, xpApplied, ...lost };
}

/**
 * Put a deleted custom exercise back, with the history that went with it:
 * the sessions it emptied, its sets in the sessions that survived (and the XP
 * they gave back), its records, routine links and note, and the badges and
 * claims the delete took.
 */
export async function restoreCustomExercise(snapshot) {
  if (!snapshot?.exercise) return;
  const surviving = Object.keys(snapshot.xpApplied ?? {}).map(Number);
  await db.transaction('rw', CASCADE(), async () => {
    await db.exercises.put(snapshot.exercise);
    if (snapshot.workouts?.length) await db.workouts.bulkPut(snapshot.workouts);
    if (snapshot.energyLogs?.length) await db.energyLogs.bulkPut(snapshot.energyLogs);
    if (snapshot.sets?.length) await db.sets.bulkPut(snapshot.sets);
    if (snapshot.leftovers?.length) await db.sets.bulkPut(snapshot.leftovers);
    if (snapshot.prs?.length) await db.prs.bulkPut(snapshot.prs);
    if (snapshot.links?.length) await db.templateExercises.bulkPut(snapshot.links);
    if (snapshot.notes?.length) await db.exerciseNotes.bulkPut(snapshot.notes);
    for (const id of surviving) {
      const w = await db.workouts.get(id);
      if (w) await db.workouts.update(id, { xpEarned: (w.xpEarned || 0) + (snapshot.xpApplied[id] || 0) });
    }
  });
  for (const id of surviving) if (await db.workouts.get(id)) await recomputeWorkoutTotals(id);
  // The records come back as they were; rebuilding confirms them against the
  // restored sets, and keeps their dates (see recomputePRs).
  await recomputePRs(snapshot.exercise.id);
  await putBackRewards(snapshot);

  const weeks = weeksOf([...(snapshot.workouts ?? []), ...(await db.workouts.bulkGet(surviving))]);
  await settleDerived(weeks.length ? { since: weeks[0] } : undefined);
}
