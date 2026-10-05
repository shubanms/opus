import { db } from '../db/db.js';
import useSettingsStore from '../store/settingsStore.js';
import { getLevelFromTotalXP, getTitle } from './rpg.js';
import { ACHIEVEMENTS, reconcileAchievements } from './achievements.js';
import { reconcileQuests } from './questActions.js';
import { recordsFromSets } from './records.js';
import { weekKeyOfDateKey } from './quests.js';
import { parseKey, todayKey } from './dateKey.js';
import {
  applyXpDelta,
  leavesSessionEmpty,
  mergeRecordRows,
  nextSetNumber,
  planDateMove,
  removedRows,
  setKcal,
  setXpDelta,
  workoutTotals,
} from './historyMath.js';

/** When a session happened, for dating the records it holds. */
function sessionTime(w) {
  if (Number.isFinite(w?.createdAt)) return w.createdAt;
  return parseKey(w?.date)?.getTime();
}

/**
 * Rebuild an exercise's record rows from its remaining sets.
 *
 * Records keep the date and workout of the set that actually set them
 * (`records.recordsFromSets`), and a record still held by the same session is
 * left untouched (`historyMath.mergeRecordRows`). The old rebuild stamped every
 * surviving record `Date.now()` with no workout, so deleting one Push session
 * moved every bench record to today — and Hall of Records, Wrapped and the
 * weekly PR quest all moved with it. Even an Undo left them re-dated.
 */
export async function recomputePRs(exerciseId) {
  const sets = await db.sets.where('exerciseId').equals(exerciseId).toArray();
  const ids = [...new Set(sets.map((s) => s.workoutId))];
  const workouts = (await db.workouts.bulkGet(ids)).filter(Boolean);
  const when = new Map(workouts.map((w) => [w.id, sessionTime(w)]));
  // A set whose session no longer exists is not history.
  const live = sets.filter((s) => when.has(s.workoutId));
  const fresh = recordsFromSets(exerciseId, live, { workoutTime: (id) => when.get(id) });
  const old = await db.prs.where('exerciseId').equals(exerciseId).toArray();
  const { put, add, del } = mergeRecordRows(old, fresh);
  if (del.length) await db.prs.bulkDelete(del);
  if (put.length) await db.prs.bulkPut(put);
  if (add.length) await db.prs.bulkAdd(add);
}

/**
 * Give records damaged by the old rebuild their real date back. Those rows are
 * recognisable — a saved session always stamps its workout, only the old
 * rebuild wrote `workoutId: null` — so this costs one scan of a small table
 * and does nothing once they are fixed.
 */
export async function healRecords() {
  const stale = await db.prs.filter((p) => p.workoutId == null).toArray();
  const ids = [...new Set(stale.map((p) => p.exerciseId))];
  for (const id of ids) await recomputePRs(id);
  return ids.length;
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

/**
 * After history changes: re-derive the profile, then take back whatever the
 * new history no longer supports. Returns the badge and claim rows it removed
 * — only those — so an undo can put back exactly what this change took.
 *
 * Order matters. Level badges are judged against the level stored on the
 * profile, so the profile is rebuilt *before* badges are reconciled (the other
 * way round, a delete that cost you level 5 kept "Forged"). And a badge or
 * claim taken back takes its XP with it, which can cost a level again — hence
 * the second, cheap pass.
 *
 * `scope` limits which weeks' quest claims are re-checked (see
 * `reconcileQuests`).
 */
export async function settleDerived(scope) {
  const badgesBefore = await db.achievements.toArray();
  const claimsBefore = await db.questClaims.toArray();
  await recomputeProfile();
  await reconcileAchievements();
  await reconcileQuests(scope);
  await recomputeProfile();
  const count = await db.achievements.count();
  await reconcileAchievements();
  if ((await db.achievements.count()) !== count) await recomputeProfile();
  return {
    achievements: removedRows(badgesBefore, await db.achievements.toArray()),
    questClaims: removedRows(claimsBefore, await db.questClaims.toArray()),
  };
}

/**
 * Put back badges and claims a change took away. Never duplicates one that
 * has been earned again since (same badge key, same quest in the same week).
 * The settle that follows takes back anything the restored history still does
 * not support — so a stale snapshot cannot resurrect what a *later* delete
 * revoked.
 */
export async function putBackRewards({ achievements = [], questClaims = [] } = {}) {
  const haveBadges = new Set((await db.achievements.toArray()).map((a) => a.key));
  const badges = achievements.filter((a) => !haveBadges.has(a.key));
  if (badges.length) await db.achievements.bulkPut(badges);
  const claimKey = (c) => `${c.weekKey}|${c.questId}`;
  const haveClaims = new Set((await db.questClaims.toArray()).map(claimKey));
  const claims = questClaims.filter((c) => !haveClaims.has(claimKey(c)));
  if (claims.length) await db.questClaims.bulkPut(claims);
}

/**
 * Deleting your own last workout is not a browser wipe, but the wipe detector
 * cannot tell them apart (onboarded + had data + zero workouts). So an in-app
 * delete that empties history says so first — before the rows go, or the live
 * count would reach zero and the alarm would fire in between. Undo re-arms it
 * on its own: the alert's `noteData` sees the workout come back.
 */
export function acknowledgeEmptyHistory() {
  try {
    useSettingsStore.getState().acceptWipe();
  } catch {
    /* no storage to write to — nothing to tell */
  }
}

/** The weeks whose quest claims a change to these dates can affect. */
const weekOf = (dateKey) => weekKeyOfDateKey(dateKey);
const sinceWeek = (...dateKeys) => {
  const weeks = dateKeys.map(weekOf).filter(Boolean).sort();
  return weeks.length ? { since: weeks[0] } : undefined;
};

/** These exercises' record rows as they stand, for an undo to put back. */
async function recordRowsOf(exerciseIds) {
  const ids = [...new Set(exerciseIds)];
  return ids.length ? db.prs.where('exerciseId').anyOf(ids).toArray() : [];
}

/**
 * Rebuild these exercises' records — starting, on an undo, from the rows as
 * they were before the change. A put-back row the history still supports is
 * kept exactly (down to the moment its session was saved, which a rebuild
 * from sets alone cannot know); one it no longer supports is corrected, so a
 * stale snapshot can never lie about a record.
 */
async function rebuildRecords(exerciseIds, restoreRows) {
  if (restoreRows?.length) await db.prs.bulkPut(restoreRows);
  for (const id of new Set(exerciseIds)) await recomputePRs(id);
}

/**
 * Delete a workout, returning everything needed to put it back.
 *
 * The snapshot is the rows themselves, keys included, so a restore is a
 * `bulkPut` rather than a re-derivation — the workout comes back with its own
 * id, and everything keyed to that id lines up again. In memory only: an undo
 * that survives a reload is not something anyone expects, and persisting one
 * would mean a second copy of every deleted workout on disk.
 *
 * Badges and claims are snapshotted as *the rows this delete removed*, never
 * the whole table: a full-table snapshot, restored after a second delete, put
 * back badges the second delete had rightly taken.
 */
export async function deleteWorkout(workoutId) {
  const workout = await db.workouts.get(workoutId);
  if (!workout) return null;

  const sets = await db.sets.where('workoutId').equals(workoutId).toArray();
  const energyLogs = await db.energyLogs.where('workoutId').equals(workoutId).toArray();
  const affected = [...new Set(sets.map((s) => s.exerciseId))];
  const prs = await recordRowsOf(affected);

  if ((await db.workouts.count()) <= 1) acknowledgeEmptyHistory();

  await db.transaction('rw', db.workouts, db.sets, db.energyLogs, async () => {
    await db.sets.where('workoutId').equals(workoutId).delete();
    await db.energyLogs.where('workoutId').equals(workoutId).delete();
    await db.workouts.delete(workoutId);
  });

  await rebuildRecords(affected);
  // Removing a session can only lower its own week's quest totals, and can
  // only make later sessions *more* of a record, never less — so its week is
  // the only one whose claims need re-checking. Re-checking every claimed week
  // is what used to revoke fairly-won quests from months ago.
  const week = weekOf(workout.date);
  const lost = await settleDerived(week ? { weeks: [week] } : undefined);

  return { workout, sets, energyLogs, prs, achievements: lost.achievements, questClaims: lost.questClaims };
}

/** Put a deleted workout back, and re-derive everything the delete reverted. */
export async function restoreWorkout(snapshot) {
  if (!snapshot?.workout) return;
  await db.transaction('rw', db.workouts, db.sets, db.energyLogs, async () => {
    await db.workouts.put(snapshot.workout);
    if (snapshot.sets?.length) await db.sets.bulkPut(snapshot.sets);
    if (snapshot.energyLogs?.length) await db.energyLogs.bulkPut(snapshot.energyLogs);
  });

  // Records come back as the rows they were, checked against the restored
  // sets. Badges and quest claims are not derivable (`reconcile*` only ever
  // removes, and claiming is a deliberate act), so the rows this delete
  // removed are put back, then checked against the restored history.
  const affected = [...new Set((snapshot.sets ?? []).map((s) => s.exerciseId))];
  await rebuildRecords(affected, snapshot.prs);
  await putBackRewards(snapshot);
  // A restored session can make a later one stop being a record, so every
  // week from its own onwards is re-checked.
  await settleDerived(sinceWeek(snapshot.workout.date));
}

// ---------------------------------------------------------------------------
// Editing a saved session
//
// Every change returns a snapshot its inverse accepts, so each one can be
// offered back with Undo. Each snapshot carries `derived` — the record rows of
// the lifts involved as they stood before, and the badges and claims the
// change took — because none of those can be re-derived on the way back.
// ---------------------------------------------------------------------------

const NO_DERIVED = { prs: [], achievements: [], questClaims: [] };

/**
 * After a change to one session's sets: its stored totals, its XP, the
 * records of the lifts involved, and everything that reads those.
 *
 * XP moves by the base-XP difference of the sets that changed. The intensity
 * and effort multipliers the session was first scored with are NOT re-scored:
 * they depended on the records as they stood that day, which an edit cannot
 * reconstruct.
 *
 * `restore` is a previous change's `derived`, when this is its undo.
 */
async function refreshWorkout(workoutId, { exerciseIds = [], xpDelta = 0, kcalDelta = 0, prsBefore, restore } = {}) {
  const workout = await db.workouts.get(workoutId);
  if (!workout) return { xpApplied: 0, kcalApplied: 0, derived: NO_DERIVED };
  const sets = await db.sets.where('workoutId').equals(workoutId).toArray();
  const rows = (await db.exercises.bulkGet([...new Set(sets.map((s) => s.exerciseId))])).filter(Boolean);
  const bodyweightIds = new Set(rows.filter((e) => e.equipment === 'bodyweight').map((e) => e.id));
  const totals = workoutTotals(sets, { bodyweightKg: workout.bodyweightKg, bodyweightIds });
  const xp = applyXpDelta(workout.xpEarned, xpDelta);
  const patch = { ...totals, xpEarned: xp.xpEarned };
  let kcalApplied = 0;
  if (kcalDelta && Number.isFinite(workout.totalCalories)) {
    const next = Math.max(0, workout.totalCalories + kcalDelta);
    kcalApplied = next - workout.totalCalories;
    patch.totalCalories = next;
  }
  await db.workouts.update(workoutId, patch);
  await rebuildRecords(exerciseIds, restore?.prs);
  if (restore) await putBackRewards(restore);
  // A heavier set can stop a later session's set being a record, so claims
  // from this session's week onwards are re-checked.
  const lost = await settleDerived(sinceWeek(workout.date));
  return { xpApplied: xp.applied, kcalApplied, derived: { prs: prsBefore ?? [], ...lost } };
}

const cleanWeight = (v) => Math.max(0, Number(v) || 0);
const cleanReps = (v) => Math.max(0, Math.round(Number(v) || 0));

/**
 * Correct a logged set: weight (kg), reps, warm-up. Cardio bouts are not
 * edited here (only deleted). Returns `{ before, after, xpApplied, derived }`
 * for `revertSetEdit`, or null when nothing changed.
 */
export async function updateWorkoutSet(setId, changes = {}) {
  const before = await db.sets.get(setId);
  if (!before || before.isCardio) return null;
  const after = { ...before };
  if ('weight' in changes) after.weight = cleanWeight(changes.weight);
  if ('reps' in changes) after.reps = cleanReps(changes.reps);
  if ('isWarmup' in changes) after.isWarmup = !!changes.isWarmup;
  if (after.weight === before.weight && after.reps === before.reps && !!after.isWarmup === !!before.isWarmup) {
    return null;
  }
  const prsBefore = await recordRowsOf([before.exerciseId]);
  await db.sets.put(after);
  const r = await refreshWorkout(before.workoutId, {
    exerciseIds: [before.exerciseId],
    xpDelta: setXpDelta(before, after),
    prsBefore,
  });
  return { before, after, xpApplied: r.xpApplied, derived: r.derived };
}

/** Undo `updateWorkoutSet`: the old values, the exact XP change reversed. */
export async function revertSetEdit(snapshot) {
  const { before } = snapshot ?? {};
  if (!before || !(await db.sets.get(before.id))) return;
  await db.sets.put(before);
  await refreshWorkout(before.workoutId, {
    exerciseIds: [before.exerciseId],
    xpDelta: -(snapshot.xpApplied ?? 0),
    restore: snapshot.derived,
  });
}

/**
 * Add a set that was forgotten at the time. It is placed just after the last
 * set of that lift in the session, so it orders — and dates its record, if it
 * sets one — as part of the session. Earns base XP; no crit is rolled after
 * the fact. Undo is `deleteWorkoutSet(set.id, { restore: derived })`.
 */
export async function addWorkoutSet(workoutId, exerciseId, fields = {}) {
  const workout = await db.workouts.get(workoutId);
  if (!workout || exerciseId == null) return null;
  const sets = await db.sets.where('workoutId').equals(workoutId).toArray();
  const siblings = sets.filter((s) => s.exerciseId === exerciseId);
  const last =
    siblings.reduce((m, s) => Math.max(m, Number(s.completedAt) || 0), 0) || sessionTime(workout) || Date.now();
  const row = {
    workoutId,
    exerciseId,
    setNumber: nextSetNumber(sets, exerciseId),
    reps: cleanReps(fields.reps),
    weight: cleanWeight(fields.weight),
    rpe: null,
    isWarmup: !!fields.isWarmup,
    note: null,
    completedAt: last + 1000,
    crit: false,
    bonusXp: 0,
    isCardio: false,
    durationSec: null,
    speedKmh: null,
    incline: null,
    distanceKm: null,
    calories: 0,
  };
  const prsBefore = await recordRowsOf([exerciseId]);
  const id = await db.sets.add(row);
  const r = await refreshWorkout(workoutId, { exerciseIds: [exerciseId], xpDelta: setXpDelta(null, row), prsBefore });
  return { set: { ...row, id }, xpApplied: r.xpApplied, derived: r.derived };
}

/**
 * Delete one set. A set whose loss would leave the session empty (see
 * `leavesSessionEmpty`) takes the session with it, and the snapshot then holds
 * the whole workout (`kind: 'workout'`). `restore` is a previous change's
 * `derived`, when this is the undo of `addWorkoutSet`.
 */
export async function deleteWorkoutSet(setId, { restore } = {}) {
  const set = await db.sets.get(setId);
  if (!set) return null;
  const sessionSets = await db.sets.where('workoutId').equals(set.workoutId).toArray();
  if (leavesSessionEmpty(set, sessionSets)) {
    const workout = await deleteWorkout(set.workoutId);
    return workout ? { kind: 'workout', workout } : null;
  }
  const prsBefore = await recordRowsOf([set.exerciseId]);
  await db.sets.delete(setId);
  const r = await refreshWorkout(set.workoutId, {
    exerciseIds: [set.exerciseId],
    xpDelta: setXpDelta(set, null),
    kcalDelta: -setKcal(set),
    prsBefore,
    restore,
  });
  return { kind: 'set', set, xpApplied: r.xpApplied, kcalApplied: r.kcalApplied, derived: r.derived };
}

/** Undo `deleteWorkoutSet`. */
export async function restoreWorkoutSet(snapshot) {
  if (snapshot?.kind === 'workout') return restoreWorkout(snapshot.workout);
  const set = snapshot?.set;
  // Nothing to put it back into if its session has gone since.
  if (!set || !(await db.workouts.get(set.workoutId))) return;
  await db.sets.put(set);
  await refreshWorkout(set.workoutId, {
    exerciseIds: [set.exerciseId],
    xpDelta: -(snapshot.xpApplied ?? 0),
    kcalDelta: -(snapshot.kcalApplied ?? 0),
    restore: snapshot.derived,
  });
}

/**
 * Move a session to another day (never into the future). Its sets and the
 * records it holds move with it, records are re-ranked (moving a session
 * earlier can make it the first to a record), and the streak, profile and
 * quests follow. Returns `{ workoutId, from, to, derived }` or null when the
 * move is not allowed; undo is the same call back to `from` with
 * `{ restore: derived }`.
 */
export async function moveWorkoutDate(workoutId, toKey, { restore } = {}) {
  const workout = await db.workouts.get(workoutId);
  if (!workout) return null;
  const sets = await db.sets.where('workoutId').equals(workoutId).toArray();
  const exerciseIds = [...new Set(sets.map((s) => s.exerciseId))];
  const prsBefore = await recordRowsOf(exerciseIds);
  const plan = planDateMove({
    workout,
    sets,
    records: prsBefore,
    toKey,
    todayKey: todayKey(),
    now: Date.now(),
  });
  if (!plan) return null;

  await db.transaction('rw', db.workouts, db.sets, db.prs, async () => {
    await db.workouts.update(workoutId, plan.workout);
    for (const s of plan.sets) await db.sets.update(s.id, { completedAt: s.completedAt });
    for (const r of plan.records) await db.prs.update(r.id, { achievedAt: r.achievedAt });
  });
  await rebuildRecords(exerciseIds, restore?.prs);
  if (restore) await putBackRewards(restore);
  const lost = await settleDerived(sinceWeek(workout.date, toKey));
  return { workoutId, from: workout.date, to: toKey, derived: { prs: prsBefore, ...lost } };
}
