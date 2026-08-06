import { db } from '../db/db.js';
import { getLevelFromTotalXP, getTitle } from './rpg.js';
import { ACHIEVEMENTS, reconcileAchievements } from './achievements.js';
import { reconcileQuests } from './questActions.js';

// Rebuild PR records for an exercise from its remaining (non-warmup) sets.
export async function recomputePRs(exerciseId) {
  await db.prs.where('exerciseId').equals(exerciseId).delete();
  const sets = (await db.sets.where('exerciseId').equals(exerciseId).toArray()).filter((s) => !s.isWarmup);
  if (!sets.length) return;
  const maxWeight = Math.max(...sets.map((s) => s.weight));
  const maxReps = Math.max(...sets.map((s) => s.reps));
  const maxVol = Math.max(...sets.map((s) => s.weight * s.reps));
  const add = async (type, value) => {
    if (value > 0) await db.prs.add({ exerciseId, type, value, achievedAt: Date.now(), workoutId: null });
  };
  await add('weight', maxWeight);
  await add('reps', maxReps);
  await add('volume', maxVol);
}

// Recompute profile XP/level/title + streak purely from remaining workouts.
export async function recomputeProfile() {
  const workouts = await db.workouts.toArray();
  const workoutXp = workouts.reduce((a, w) => a + (w.xpEarned ?? 0), 0);
  // Achievement XP is permanent (not tied to a workout) — add it back in.
  const unlocked = new Set((await db.achievements.toArray()).map((a) => a.key));
  const achievementXp = ACHIEVEMENTS.reduce((a, def) => a + (unlocked.has(def.key) ? (def.xp || 0) : 0), 0);
  // Claimed-quest XP is permanent too (not tied to a workout) — add it back in.
  const questXp = (await db.questClaims.toArray()).reduce((a, c) => a + (c.xp || 0), 0);
  const totalXp = workoutXp + achievementXp + questXp;
  const level = getLevelFromTotalXP(totalXp);
  const title = getTitle(level);

  const dates = [...new Set(workouts.map((w) => w.date))].sort();
  let streak = 0;
  let lastWorkoutDate = null;
  if (dates.length) {
    lastWorkoutDate = dates[dates.length - 1];
    streak = 1;
    for (let i = dates.length - 1; i > 0; i--) {
      const diff = (new Date(dates[i]) - new Date(dates[i - 1])) / 86400000;
      if (diff === 1) streak++;
      else break;
    }
  }

  const { default: useUserStore } = await import('../store/userStore.js');
  const store = useUserStore.getState();
  if (store.profile) {
    await store.updateProfile({ xp: totalXp, totalXp, level, title, streak, lastWorkoutDate });
  } else {
    const profile = await db.userProfile.get(1);
    if (profile) await db.userProfile.put({ ...profile, xp: totalXp, totalXp, level, title, streak, lastWorkoutDate });
  }
}

// Deletes a workout and reverses everything it contributed:
// its sets, energy log, PR records (recomputed), and XP/level/streak.
/**
 * Delete a workout, returning everything needed to put it back.
 *
 * The snapshot is the rows themselves, keys included, so a restore is a
 * `bulkPut` rather than a re-derivation — the workout comes back with its own
 * id, and everything keyed to that id lines up again. In memory only: an undo
 * that survives a reload is not something anyone expects, and persisting one
 * would mean a second copy of every deleted workout on disk.
 */
export async function deleteWorkout(workoutId) {
  const workout = await db.workouts.get(workoutId);
  if (!workout) return null;

  const sets = await db.sets.where('workoutId').equals(workoutId).toArray();
  const energyLogs = await db.energyLogs.where('workoutId').equals(workoutId).toArray();
  const affected = [...new Set(sets.map((s) => s.exerciseId))];
  // Unlocked badges and claimed quests are taken away by the reconciles below,
  // and a claim in particular cannot be re-derived — claiming is a deliberate
  // act, not a consequence of the data. So they are snapshotted, not recomputed.
  const achievements = await db.achievements.toArray();
  const questClaims = await db.questClaims.toArray();

  await db.sets.where('workoutId').equals(workoutId).delete();
  await db.energyLogs.where('workoutId').equals(workoutId).delete();
  await db.workouts.delete(workoutId);

  for (const exId of affected) await recomputePRs(exId);
  await reconcileAchievements();
  await reconcileQuests();
  await recomputeProfile();

  return { workout, sets, energyLogs, achievements, questClaims };
}

/** Put a deleted workout back, and re-derive everything the delete reverted. */
export async function restoreWorkout(snapshot) {
  if (!snapshot?.workout) return;
  await db.workouts.put(snapshot.workout);
  if (snapshot.sets?.length) await db.sets.bulkPut(snapshot.sets);
  if (snapshot.energyLogs?.length) await db.energyLogs.bulkPut(snapshot.energyLogs);

  // Records are derived, so recomputing brings them back exactly. Badges and
  // quest claims are not: `reconcile*` only ever *removes*, so re-running them
  // here would restore nothing. The snapshot is put back instead — which is
  // also the only way a claimed quest can return at all.
  if (snapshot.achievements?.length) await db.achievements.bulkPut(snapshot.achievements);
  if (snapshot.questClaims?.length) await db.questClaims.bulkPut(snapshot.questClaims);

  const affected = [...new Set((snapshot.sets ?? []).map((s) => s.exerciseId))];
  for (const exId of affected) await recomputePRs(exId);
  await recomputeProfile();
}
