import { create } from 'zustand';
import { db } from '../db/db.js';
import useUserStore from './userStore.js';
import useSettingsStore from './settingsStore.js';
import { PR_BONUS, calcWorkoutXP } from '../utils/rpg.js';
import { todaysDungeon, isDungeonCleared, dungeonReward, affixEffects } from '../utils/dungeon.js';
import { strengthKcal } from '../utils/calories.js';
import { computeVolume } from '../utils/volume.js';
import { getCurrentBodyweight } from '../utils/healthActions.js';
import {
  serialize,
  deserialize,
  isStale,
  normalizeSession,
  makeUid,
  renumber,
  removeSetAt,
  insertSetAt,
  hasSets,
  sameSession,
  canRestoreSession,
  lastSetAt,
} from '../utils/workoutSession.js';
import { moveItem } from '../utils/reorder.js';
import { todayKey } from '../utils/dateKey.js';
import { buildVerdict } from '../utils/verdict.js';
import { RECORD_TYPES, beats, bestSetFor, isRecordSet } from '../utils/records.js';
import { sessionIron } from '../utils/economy.js';
import { streakAfterSession, levelUpDecision } from '../utils/sessionRewards.js';
import { startRest as newRest, adjustRest, retargetRest } from '../utils/restClock.js';
import { checkStrengthSet } from '../utils/loadStep.js';

const ACTIVE_KEY = 'opus_active_workout';
// A session too old to resume silently, parked until you say what to do with
// it. Its own key, so starting a fresh session cannot overwrite it.
const STALE_KEY = 'opus_stale_workout';

function readSession(key) {
  try {
    return normalizeSession(deserialize(localStorage.getItem(key)));
  } catch {
    return null;
  }
}

// Restore the in-progress session from a previous run (lock/reload). One that
// is too old to resume used to be deleted on the spot — sets and all, with no
// word — which is exactly what happens to the session you forgot to finish
// last night. It is parked instead, and the workout screen asks.
function loadSaved() {
  let active = null;
  let stale = null;
  try {
    const saved = readSession(ACTIVE_KEY);
    if (saved && !isStale(saved)) active = saved;
    else if (saved) {
      localStorage.removeItem(ACTIVE_KEY);
      if (hasSets(saved)) {
        stale = { ...saved, rest: null };
        localStorage.setItem(STALE_KEY, serialize(stale));
      }
    }
    if (!stale) {
      const parked = readSession(STALE_KEY);
      if (parked && hasSets(parked)) stale = parked;
      else if (parked) localStorage.removeItem(STALE_KEY);
    }
  } catch {
    /* storage unavailable — start clean */
  }
  return { active, stale };
}

const restored = typeof window !== 'undefined' ? loadSaved() : { active: null, stale: null };

function freshSession(fields) {
  return {
    id: null,
    sid: makeUid('w'),
    name: 'Workout',
    templateId: null,
    startedAt: Date.now(),
    energy: null,
    exercises: [],
    rest: null,
    ...fields,
  };
}

const plan = (e) => ({
  targetSets: e.targetSets ?? null,
  targetReps: e.targetReps ?? null,
  targetWeight: e.targetWeight ?? null,
  // The routine's own rest for this exercise wins over the default rest.
  targetRest: e.targetRest ?? null,
});

/**
 * A set as it may be stored. Strength sets need a whole number of reps of at
 * least one and a weight of zero or more — "60 kg × 0" used to log, show a PR
 * and count toward the dungeon, and a typed "-8" became negative volume.
 * Cardio bouts need a duration. Returns null for anything else.
 */
function cleanSet(data) {
  if (!data) return null;
  if (data.isCardio) {
    return Number(data.durationSec) > 0 ? { ...data, weight: 0, reps: 0 } : null;
  }
  const checked = checkStrengthSet({ weight: data.weight, reps: data.reps });
  if (!checked.ok) return null;
  return { ...data, weight: checked.weight, reps: checked.reps };
}

// Only one save at a time. A double tap on "Save & finish" ran the whole save
// twice: two workout rows, the sets twice over, XP/PR/streak bonuses paid twice
// and the routine advanced twice (+5 kg instead of +2.5). A second call while
// one is in flight gets the same promise back.
let finishing = null;
function onlyOnce(run) {
  if (finishing) return finishing;
  finishing = (async () => {
    try {
      return await run();
    } finally {
      finishing = null;
    }
  })();
  return finishing;
}

/**
 * Save a session: the rows, the records, the rewards. Throws if the database
 * write fails, in which case nothing at all was written — the caller keeps
 * the session and can retry without creating a duplicate.
 */
async function finishSession(w, xpEarned, { endAt } = {}) {
  const end = Number.isFinite(endAt) && endAt >= w.startedAt ? endAt : Date.now();
  const duration = Math.max(0, Math.round((end - w.startedAt) / 1000));
  // The session belongs to the day it *started*: 23:30 → 00:20 is the
  // evening's workout, not tomorrow's — for the calendar, the streak and the
  // dungeon it was started for.
  const startDay = todayKey(new Date(w.startedAt));

  // Strength sets with no reps are not sets (only an older build could have
  // logged one); they are dropped rather than saved as junk rows.
  const exercises = w.exercises.map((e) => ({
    ...e,
    sets: renumber(e.sets.filter((s) => s.isCardio || Number(s.reps) >= 1)),
  }));
  const flatSets = exercises.flatMap((e) => e.sets.map((s) => ({ ...s, exerciseId: e.exerciseId })));
  const totalSets = flatSets.filter((s) => !s.isWarmup).length;

  // Don't save (or reward) an empty session — discard it instead. Prevents
  // farming XP by finishing a workout with nothing logged.
  if (totalSets === 0) return { discarded: true };

  // Everything read before anything is written, so the write itself is one
  // transaction with nothing but database work inside it.
  const bodyweightKg = await getCurrentBodyweight();
  const totalVolume = await computeVolume(flatSets, bodyweightKg);

  // Calories: cardio bouts carry a precise (ACSM/MET) figure; lifting is a MET
  // estimate over the non-cardio portion of the session.
  const cardioKcal = flatSets.reduce((a, s) => a + (s.calories || 0), 0);
  const cardioMin = flatSets.reduce((a, s) => a + (s.durationSec || 0), 0) / 60;
  const hasStrength = flatSets.some((s) => !s.isCardio && !s.isWarmup);
  const strengthMin = hasStrength ? Math.max(0, duration / 60 - cardioMin) : 0;
  const totalCalories = Math.round(cardioKcal + strengthKcal({ weightKg: bodyweightKg ?? 70, minutes: strengthMin }));

  // userStore is imported statically (no circular dependency): a lazy import()
  // here is a separate chunk that can fail to load on a stale service-worker
  // shell, which would throw mid-save and silently strand the finish.
  const userStore = useUserStore.getState();
  const profile = userStore.profile;
  const beforeXp = profile?.totalXp ?? 0;

  // Achievements are a lazy import (and outside the transaction below). The
  // lifetime stats before the save are what the level was capped by.
  let achievements = null;
  let statsBefore = null;
  try {
    achievements = await import('../utils/achievements.js');
    statsBefore = await achievements.computeStats();
  } catch (e) {
    console.error('Lifetime stats unavailable (workout still saves):', e);
  }

  // Daily Dungeon: decided now, but only claimed once the save has committed —
  // a failed save must not spend today's clear.
  const settings = useSettingsStore.getState();
  const dungeon = w.dungeon && w.dungeon === startDay ? todaysDungeon(startDay) : null;
  const cleared = Boolean(dungeon) && isDungeonCleared(dungeon, { isDungeonSession: true, workingSets: totalSets });
  const claimable = cleared && settings.lastDungeonClaim !== startDay;

  let workoutId = null;
  let duplicateOf = null;
  const prs = [];
  let xp = xpEarned;
  let streak = null;
  let streakBonus = 0;
  let dungeonXpBonus = 0;
  let dungeonIron = 0;

  // One transaction: the workout, its sets, its energy log and its records
  // land together or not at all. It used to be a dozen separate writes, so a
  // failure halfway left a workout with half its sets — and a retry saved the
  // whole session a second time next to it.
  await db.transaction('rw', db.workouts, db.sets, db.energyLogs, db.prs, async () => {
    // Already saved? Two tabs on one session, or a save that committed just
    // before the app was killed: the session id is on the row.
    if (w.sid) {
      const existing = await db.workouts.filter((r) => r.sessionId === w.sid).first();
      if (existing) {
        duplicateOf = existing.id;
        return;
      }
    }
    const sameDay = await db.workouts.where('date').equals(startDay).count();

    workoutId = await db.workouts.add({
      date: startDay,
      startedAt: w.startedAt,
      sessionId: w.sid ?? null,
      templateId: w.templateId ?? null,
      name: (w.name ?? '').trim() || 'Workout',
      status: 'completed',
      duration,
      notes: w.notes ?? '',
      xpEarned,
      totalVolume,
      totalCalories,
      totalSets,
      bodyweightKg,
      createdAt: Date.now(),
    });

    await db.sets.bulkAdd(
      flatSets.map((s) => ({
        workoutId,
        exerciseId: s.exerciseId,
        setNumber: s.setNumber,
        reps: s.reps ?? 0,
        weight: s.weight ?? 0,
        rpe: s.rpe ?? null,
        isWarmup: s.isWarmup ?? false,
        note: s.note ?? null,
        completedAt: s.completedAt,
        crit: s.crit ?? false,
        bonusXp: s.bonusXp ?? 0,
        isCardio: s.isCardio ?? false,
        durationSec: s.durationSec ?? null,
        speedKmh: s.speedKmh ?? null,
        incline: s.incline ?? null,
        distanceKm: s.distanceKm ?? null,
        calories: s.calories ?? 0,
      }))
    );

    if (w.energy) await db.energyLogs.add({ workoutId, level: w.energy });

    // Records, by the shared rule (utils/records.js): working sets with at
    // least one rep, beating the standing record by more than kg↔lb rounding.
    // In pounds a repeated best came back as 77.50079 kg and was a "new
    // record" every session; a weight-only set with no reps was a record too.
    // `prs` carries enough to celebrate a record by name and show what it beat.
    let prBonus = 0;
    for (const ex of exercises) {
      const eligible = ex.sets.filter(isRecordSet);
      if (!eligible.length) continue;
      const standing = await db.prs.where('exerciseId').equals(ex.exerciseId).toArray();
      for (const type of RECORD_TYPES) {
        const best = bestSetFor(eligible, type);
        if (!best) continue;
        const prev = standing
          .filter((p) => p.type === type)
          .reduce((top, p) => (!top || p.value > top.value ? p : top), null);
        if (!beats(best.value, prev?.value, type)) continue;
        const record = {
          exerciseId: ex.exerciseId,
          type,
          value: best.value,
          achievedAt: best.achievedAt ?? Date.now(),
          workoutId,
        };
        if (prev) await db.prs.put({ ...prev, ...record });
        else await db.prs.add(record);
        prBonus += PR_BONUS;
        prs.push({ exerciseId: ex.exerciseId, name: ex.name, type, value: best.value, prev: prev?.value ?? null });
      }
    }

    if (claimable) {
      dungeonXpBonus = Math.round((xpEarned + prBonus) * (affixEffects(dungeon.affixes).xpMult - 1));
      dungeonIron = dungeonReward(dungeon, { prCount: prs.length });
    }
    if (profile) {
      streak = streakAfterSession(profile, startDay, { firstOfDay: sameDay === 0 });
      streakBonus = streak.bonus;
    }
    // The full gained XP is stored so deleting the workout reverses it exactly.
    xp = xpEarned + prBonus + streakBonus + dungeonXpBonus;
    await db.workouts.update(workoutId, {
      xpEarned: xp,
      // What the finish toast says this session paid, excluding the dungeon.
      ironEarned: sessionIron(prs.length),
      dungeonIron,
      dungeonDate: claimable ? startDay : null,
    });
  });

  if (duplicateOf != null) return { alreadySaved: true, workoutId: duplicateOf };

  if (claimable) settings.claimDungeon(dungeonIron, startDay);
  const dungeonResult = claimable
    ? { name: dungeon.name, iron: dungeonIron, xpBonus: dungeonXpBonus, cleared: true }
    : cleared
      ? { name: dungeon.name, iron: 0, alreadyCleared: true, cleared: true }
      : null;

  const result = {
    workoutId,
    prCount: prs.length,
    prs,
    xpEarned: xp,
    ironEarned: sessionIron(prs.length),
    streakBonus,
    leveledUp: false,
    newLevel: profile?.level ?? 1,
    newTitle: profile?.title ?? 'First Rep',
    dungeon: dungeonResult,
    totalCalories,
    date: startDay,
  };

  // The session is saved; from here on a failure costs a reward, never the
  // workout, so each step stands alone.
  if (profile) {
    try {
      if (streak?.changed) {
        await userStore.updateProfile({ lastWorkoutDate: streak.lastWorkoutDate, streak: streak.streak });
      }
      await userStore.addXP(xp);
    } catch (e) {
      console.error('Profile update failed (workout still saved):', e);
    }
  }

  try {
    result.newAchievements = achievements ? await achievements.checkAchievements() : [];
  } catch (e) {
    console.error('Achievement check failed (workout still saved):', e);
    result.newAchievements = [];
  }

  // Level-up is decided last: after badges have paid their XP, and on the
  // boss-capped level you are actually shown.
  if (profile) {
    try {
      const statsAfter = achievements ? await achievements.computeStats() : null;
      const afterXp = useUserStore.getState().profile?.totalXp ?? beforeXp + xp;
      const lv = levelUpDecision({ beforeXp, afterXp, statsBefore, statsAfter });
      result.leveledUp = lv.leveledUp;
      result.newLevel = lv.level;
      result.newTitle = lv.title;
    } catch (e) {
      console.error('Level check failed (workout still saved):', e);
    }
  }

  // The verdict: one honest line about the session, stored on the row so it
  // survives, can be re-read in History, and reverts naturally with a delete.
  // Wrapped because a failure here must never cost someone their workout.
  try {
    const previous = (await db.workouts.orderBy('createdAt').reverse().limit(9).toArray()).filter(
      (r) => r.id !== workoutId
    );
    // Only the immediately-preceding session's advice is open. Advice has a
    // shelf life of exactly one session: if you skipped it, the new session
    // raises its own concern on its own merits rather than the app relitigating
    // something you were told three weeks ago.
    const verdict = buildVerdict({
      session: { totalVolume, totalSets, prCount: prs.length },
      sets: flatSets,
      recentVolumes: previous.map((r) => r.totalVolume ?? 0),
      openAdvice: previous[0]?.advice ?? null,
    });
    await db.workouts.update(workoutId, {
      verdict: verdict.text,
      advice: verdict.advice,
      // Unindexed, so no migration. Stored only so the card can mark the
      // sessions where you actually did the thing it asked for.
      closedAdvice: verdict.closedKey,
    });
    result.verdict = verdict;
  } catch (e) {
    console.error('Verdict failed (workout still saved):', e);
  }

  return result;
}

const useWorkoutStore = create((set, get) => {
  // Apply `fn` to the live session's exercise list. No session → no-op.
  const editExercises = (fn) => {
    const w = get().activeWorkout;
    if (!w) return;
    set({ activeWorkout: { ...w, exercises: fn(w.exercises) } });
  };
  const editSets = (exerciseId, fn) =>
    editExercises((list) => list.map((e) => (e.exerciseId !== exerciseId ? e : { ...e, sets: fn(e.sets) })));
  const begin = (fields) => set({ resumed: false, resumeCued: false, activeWorkout: freshSession(fields) });

  return {
    activeWorkout: restored.active,
    resumed: !!restored.active,
    // The "picked up where you left off" chime plays once per resume, not on
    // every visit to the workout tab until the banner is dismissed.
    resumeCued: false,
    staleWorkout: restored.stale,

    dismissResumed() {
      set({ resumed: false });
    },

    markResumeCued() {
      set({ resumeCued: true });
    },

    startWorkout(name = 'Workout', templateId = null) {
      begin({ name, templateId });
    },

    setWorkoutName(name) {
      const w = get().activeWorkout;
      if (w) set({ activeWorkout: { ...w, name } });
    },

    setEnergy(level) {
      const w = get().activeWorkout;
      if (w) set({ activeWorkout: { ...w, energy: level } });
    },

    setWorkoutNotes(notes) {
      const w = get().activeWorkout;
      if (w) set({ activeWorkout: { ...w, notes } });
    },

    startFromTemplate(template) {
      begin({
        name: template.name,
        templateId: template.id,
        exercises: (template.exercises ?? []).map((e) => ({ exerciseId: e.id, name: e.name, ...plan(e), sets: [] })),
      });
    },

    // Start today's Daily Dungeon as a themed session. `exercises` are pre-picked
    // for the dungeon's muscle groups; `dungeon` marks the session so completing
    // it (with enough working sets) clears the dungeon and awards its Iron.
    startDungeon(dungeon, exercises) {
      begin({
        name: dungeon.name,
        dungeon: dungeon.dateKey,
        exercises: (exercises ?? []).map((e) => ({ exerciseId: e.exerciseId ?? e.id, name: e.name, ...plan(e), sets: [] })),
      });
    },

    async repeatWorkout(workoutId) {
      const w = await db.workouts.get(workoutId);
      if (!w) return;
      const sets = await db.sets.where('workoutId').equals(workoutId).toArray();
      const orderedIds = [];
      for (const s of sets) if (!orderedIds.includes(s.exerciseId)) orderedIds.push(s.exerciseId);
      const exercises = [];
      for (const id of orderedIds) {
        const ex = await db.exercises.get(id);
        exercises.push({ exerciseId: id, name: ex?.name ?? 'Exercise', sets: [] });
      }
      begin({ name: w.name, templateId: w.templateId ?? null, exercises });
    },

    addExercise(exercise) {
      const w = get().activeWorkout;
      if (!w) return;
      if (w.exercises.some((e) => e.exerciseId === exercise.id)) return;
      editExercises((list) => [...list, { exerciseId: exercise.id, name: exercise.name, sets: [] }]);
    },

    /**
     * Log a set. Returns the stored set (with its `uid` and `setNumber`), or
     * null when the input is not a set at all.
     */
    logSet(exerciseId, setData) {
      const w = get().activeWorkout;
      if (!w?.exercises.some((e) => e.exerciseId === exerciseId)) return null;
      const clean = cleanSet(setData);
      if (!clean) return null;
      let logged = null;
      editSets(exerciseId, (sets) => {
        logged = { completedAt: Date.now(), ...clean, uid: makeUid('s'), setNumber: sets.length + 1 };
        return [...sets, logged];
      });
      return logged;
    },

    /**
     * Correct a logged set in place — the fix for a typo used to be delete
     * and re-log, which is what produced the duplicate set numbers. The patch
     * goes through the same checks as a new set; an invalid one changes
     * nothing and returns null.
     */
    updateSet(exerciseId, setNumber, patch) {
      const ex = get().activeWorkout?.exercises.find((e) => e.exerciseId === exerciseId);
      const cur = ex?.sets.find((s) => s.setNumber === setNumber);
      if (!cur) return null;
      const next = cleanSet({ ...cur, ...patch });
      if (!next) return null;
      const updated = { ...next, uid: cur.uid, setNumber: cur.setNumber, editedAt: Date.now() };
      editSets(exerciseId, (sets) => sets.map((s) => (s.uid === cur.uid ? updated : s)));
      return updated;
    },

    // Rate a set after the fact. The RPE picker asked *before* logging, which is
    // both the wrong moment and an extra gate on the core action; this is what
    // the post-set effort chips write through.
    setSetRpe(exerciseId, setNumber, rpe) {
      editSets(exerciseId, (sets) => sets.map((s) => (s.setNumber === setNumber ? { ...s, rpe } : s)));
    },

    setSetNote(exerciseId, setNumber, note) {
      editSets(exerciseId, (sets) => sets.map((s) => (s.setNumber === setNumber ? { ...s, note } : s)));
    },

    toggleWarmup(exerciseId, setNumber) {
      editSets(exerciseId, (sets) => sets.map((s) => (s.setNumber === setNumber ? { ...s, isWarmup: !s.isWarmup } : s)));
    },

    /**
     * Remove one set and renumber the rest 1..n. Returns what an undo needs
     * (`restoreSet`), or null if there was nothing to remove.
     */
    removeSet(exerciseId, setNumber) {
      const w = get().activeWorkout;
      const ex = w?.exercises.find((e) => e.exerciseId === exerciseId);
      if (!ex) return null;
      const { sets, removed, index } = removeSetAt(ex.sets, setNumber);
      if (!removed) return null;
      editSets(exerciseId, () => sets);
      return { sid: w.sid, startedAt: w.startedAt, exerciseId, set: removed, index };
    },

    /** Undo a removeSet — only into the same session, and only if the exercise is still there. */
    restoreSet(snap) {
      const w = get().activeWorkout;
      if (!snap || !sameSession(w, snap)) return false;
      if (!w.exercises.some((e) => e.exerciseId === snap.exerciseId)) return false;
      editSets(snap.exerciseId, (sets) => insertSetAt(sets, snap.set, snap.index));
      return true;
    },

    /** Remove an exercise (and its sets). Returns what `restoreExercise` needs. */
    removeExercise(exerciseId) {
      const w = get().activeWorkout;
      const index = w?.exercises.findIndex((e) => e.exerciseId === exerciseId) ?? -1;
      if (index < 0) return null;
      const exercise = w.exercises[index];
      editExercises((list) => list.filter((e) => e.exerciseId !== exerciseId));
      return { sid: w.sid, startedAt: w.startedAt, exercise, index };
    },

    restoreExercise(snap) {
      const w = get().activeWorkout;
      if (!snap || !sameSession(w, snap)) return false;
      if (w.exercises.some((e) => e.exerciseId === snap.exercise.exerciseId)) return false;
      editExercises((list) => {
        const at = Math.max(0, Math.min(snap.index, list.length));
        return [...list.slice(0, at), snap.exercise, ...list.slice(at)];
      });
      return true;
    },

    /**
     * Swap an exercise for another.
     *
     * Before any sets are logged it is a straight replacement — the common
     * case, the bench is taken before you start. Once sets exist they belong
     * to the lift that was actually done: they used to move onto the new
     * exercise, so two sets of 100 kg bench saved as 100 kg *dumbbell* press
     * records. Now the original keeps its sets and the replacement goes in
     * right after it. Either way the routine's weight target does not carry
     * over — 80 kg is a bench number, not a dumbbell one.
     *
     * Returns 'replaced', 'added', or null.
     */
    swapExercise(oldId, exercise) {
      const w = get().activeWorkout;
      if (!w || oldId === exercise.id) return null;
      if (w.exercises.some((e) => e.exerciseId === exercise.id)) return null; // no duplicates
      const i = w.exercises.findIndex((e) => e.exerciseId === oldId);
      if (i < 0) return null;
      const old = w.exercises[i];
      const replacement = {
        ...old,
        exerciseId: exercise.id,
        name: exercise.name,
        targetWeight: null,
        sets: [],
      };
      if (!old.sets.length) {
        editExercises((list) => list.map((e, j) => (j === i ? replacement : e)));
        return 'replaced';
      }
      editExercises((list) => [...list.slice(0, i + 1), replacement, ...list.slice(i + 1)]);
      return 'added';
    },

    // Reorder an exercise up (-1) or down (+1). Superset grouping re-derives from
    // the new order, so moving a member out of its run naturally breaks the link.
    moveExercise(exerciseId, dir) {
      const w = get().activeWorkout;
      if (!w) return;
      const i = w.exercises.findIndex((e) => e.exerciseId === exerciseId);
      if (i < 0) return;
      const exercises = moveItem(w.exercises, i, dir);
      if (exercises === w.exercises) return;
      set({ activeWorkout: { ...w, exercises } });
    },

    // Toggle whether an exercise is chained into a superset with the one above it.
    // Members of a superset share a supersetId; rest is taken only after the last.
    toggleSuperset(exerciseId) {
      const w = get().activeWorkout;
      if (!w) return;
      const i = w.exercises.findIndex((e) => e.exerciseId === exerciseId);
      if (i <= 0) return;
      const cur = w.exercises[i];
      const prev = w.exercises[i - 1];
      const joined = cur.supersetId != null && cur.supersetId === prev.supersetId;
      const exercises = w.exercises.slice();
      if (joined) {
        exercises[i] = { ...cur, supersetId: null };
      } else {
        const groupId = prev.supersetId ?? Date.now();
        exercises[i - 1] = { ...prev, supersetId: groupId };
        exercises[i] = { ...cur, supersetId: groupId };
      }
      set({ activeWorkout: { ...w, exercises } });
    },

    // ---- Rest -------------------------------------------------------------
    // Part of the session, so the write-through persists it: a rest survives
    // a locked phone, a reload, and a wander to another tab — and a new
    // session starts without one.

    startRest(duration) {
      const w = get().activeWorkout;
      if (w) set({ activeWorkout: { ...w, rest: newRest(duration) } });
    },

    adjustRest(deltaSecs) {
      const w = get().activeWorkout;
      if (w?.rest) set({ activeWorkout: { ...w, rest: adjustRest(w.rest, deltaSecs) } });
    },

    /** Change the length of the running rest, keeping the time already rested. */
    retargetRest(duration) {
      const w = get().activeWorkout;
      if (w?.rest) set({ activeWorkout: { ...w, rest: retargetRest(w.rest, duration) } });
    },

    /** End the rest. With `endsAt`, only if it is still that rest (a new set may have started another). */
    clearRest(endsAt = null) {
      const w = get().activeWorkout;
      if (!w?.rest) return;
      if (endsAt != null && w.rest.endsAt !== endsAt) return;
      set({ activeWorkout: { ...w, rest: null } });
    },

    // ---- Finishing --------------------------------------------------------

    /**
     * Save the live session. Re-entrant calls while a save is in flight get
     * the same promise. `opts.endAt` ends the session at that time instead of
     * now (the "you stopped 50 minutes ago" offer).
     */
    completeWorkout(xpEarned = 0, opts = {}) {
      return onlyOnce(async () => {
        const w = get().activeWorkout;
        if (!w) return null;
        const result = await finishSession(w, xpEarned, opts);
        // Only clear the session that was saved — never one that replaced it.
        if (sameSession(get().activeWorkout, w)) set({ activeWorkout: null, resumed: false });
        return result;
      });
    },

    /**
     * Save the parked, too-old session, ending it at its last set (the hours
     * after that were not training). XP is totalled exactly as the finish
     * screen would. Returns `{ result, snapshot }`.
     */
    saveStaleWorkout() {
      return onlyOnce(async () => {
        const w = get().staleWorkout;
        if (!w) return null;
        const rows = await db.prs.where('type').equals('weight').toArray();
        const bests = {};
        for (const p of rows) bests[p.exerciseId] = Math.max(bests[p.exerciseId] ?? 0, p.value ?? 0);
        const working = w.exercises.flatMap((e) => e.sets.map((s) => ({ ...s, exerciseId: e.exerciseId })));
        const xp = calcWorkoutXP(working, bests);
        const result = await finishSession(w, xp, { endAt: lastSetAt(w) ?? w.startedAt });
        set({ staleWorkout: null });
        return { result, snapshot: w };
      });
    },

    /** Drop the parked session. Returns it, for an undo. */
    discardStaleWorkout() {
      const w = get().staleWorkout;
      set({ staleWorkout: null });
      return w;
    },

    restoreStaleWorkout(snapshot) {
      if (snapshot && !get().staleWorkout) set({ staleWorkout: snapshot });
    },

    /** End the live session without saving. Returns it, for an undo. */
    discardWorkout() {
      const w = get().activeWorkout;
      set({ activeWorkout: null, resumed: false });
      return w ? { ...w, rest: null } : null;
    },

    /**
     * Undo a discard. Never at the cost of a *different* session that has
     * work in it; an untouched one started in the meantime yields.
     */
    undoDiscard(snapshot) {
      if (!canRestoreSession(get().activeWorkout, snapshot)) return false;
      set({ activeWorkout: snapshot, resumed: false });
      return true;
    },
  };
});

// Write-through: mirror the live session (and a parked stale one) to
// localStorage on every change so a lock/reload restores it; clear the key
// when it ends.
if (typeof window !== 'undefined') {
  const mirror = (key, value) => {
    try {
      if (value) localStorage.setItem(key, serialize(value));
      else localStorage.removeItem(key);
    } catch {
      /* ignore */
    }
  };
  useWorkoutStore.subscribe((state, prev) => {
    if (state.activeWorkout !== prev.activeWorkout) mirror(ACTIVE_KEY, state.activeWorkout);
    if (state.staleWorkout !== prev.staleWorkout) mirror(STALE_KEY, state.staleWorkout);
  });
}

export default useWorkoutStore;
