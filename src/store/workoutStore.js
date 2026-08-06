import { create } from 'zustand';
import { db } from '../db/db.js';
import useUserStore from './userStore.js';
import useSettingsStore from './settingsStore.js';
import { PR_BONUS, STREAK_BONUS_PER_DAY, getLevelFromTotalXP, getTitle } from '../utils/rpg.js';
import { todaysDungeon, isDungeonCleared, dungeonReward, affixEffects } from '../utils/dungeon.js';
import { strengthKcal } from '../utils/calories.js';
import { computeVolume } from '../utils/volume.js';
import { getCurrentBodyweight } from '../utils/healthActions.js';
import { serialize, deserialize, isStale } from '../utils/workoutSession.js';
import { moveItem } from '../utils/reorder.js';
import { todayKey } from '../utils/dateKey.js';
import { buildVerdict } from '../utils/verdict.js';

const ACTIVE_KEY = 'opus_active_workout';

// Restore a non-stale in-progress session from a previous run (lock/reload).
function loadActive() {
  try {
    const saved = deserialize(localStorage.getItem(ACTIVE_KEY));
    if (saved && !isStale(saved)) return saved;
    if (saved) localStorage.removeItem(ACTIVE_KEY);
  } catch {
    /* ignore */
  }
  return null;
}

const restored = loadActive();

const useWorkoutStore = create((set, get) => ({
  activeWorkout: restored,
  resumed: !!restored,

  dismissResumed() {
    set({ resumed: false });
  },

  startWorkout(name = 'Workout', templateId = null) {
    set({
      resumed: false,
      activeWorkout: {
        id: null,
        name,
        templateId,
        startedAt: Date.now(),
        energy: null,
        exercises: [],
      },
    });
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
    set({
      resumed: false,
      activeWorkout: {
        id: null,
        name: template.name,
        templateId: template.id,
        startedAt: Date.now(),
        energy: null,
        exercises: (template.exercises ?? []).map(e => ({
          exerciseId: e.id,
          name: e.name,
          targetSets: e.targetSets ?? null,
          targetReps: e.targetReps ?? null,
          targetWeight: e.targetWeight ?? null,
          sets: [],
        })),
      },
    });
  },

  // Start today's Daily Dungeon as a themed session. `exercises` are pre-picked
  // for the dungeon's muscle groups; `dungeon` marks the session so completing
  // it (with enough working sets) clears the dungeon and awards its Iron.
  startDungeon(dungeon, exercises) {
    set({
      resumed: false,
      activeWorkout: {
        id: null,
        name: dungeon.name,
        templateId: null,
        dungeon: dungeon.dateKey,
        startedAt: Date.now(),
        energy: null,
        exercises: (exercises ?? []).map((e) => ({
          exerciseId: e.exerciseId ?? e.id,
          name: e.name,
          targetSets: e.targetSets ?? null,
          targetReps: e.targetReps ?? null,
          targetWeight: e.targetWeight ?? null,
          sets: [],
        })),
      },
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
    set({
      resumed: false,
      activeWorkout: {
        id: null,
        name: w.name,
        templateId: w.templateId ?? null,
        startedAt: Date.now(),
        energy: null,
        exercises,
      },
    });
  },

  addExercise(exercise) {
    const w = get().activeWorkout;
    if (!w) return;
    const already = w.exercises.find(e => e.exerciseId === exercise.id);
    if (already) return;
    set({
      activeWorkout: {
        ...w,
        exercises: [
          ...w.exercises,
          { exerciseId: exercise.id, name: exercise.name, sets: [] },
        ],
      },
    });
  },

  logSet(exerciseId, setData) {
    const w = get().activeWorkout;
    if (!w) return;
    set({
      activeWorkout: {
        ...w,
        exercises: w.exercises.map(e =>
          e.exerciseId !== exerciseId
            ? e
            : {
                ...e,
                sets: [
                  ...e.sets,
                  { setNumber: e.sets.length + 1, completedAt: Date.now(), ...setData },
                ],
              }
        ),
      },
    });
  },

  // Rate a set after the fact. The RPE picker asked *before* logging, which is
  // both the wrong moment and an extra gate on the core action; this is what
  // the post-set effort chips write through.
  setSetRpe(exerciseId, setNumber, rpe) {
    const w = get().activeWorkout;
    if (!w) return;
    set({
      activeWorkout: {
        ...w,
        exercises: w.exercises.map(e =>
          e.exerciseId !== exerciseId
            ? e
            : { ...e, sets: e.sets.map(s => (s.setNumber === setNumber ? { ...s, rpe } : s)) }
        ),
      },
    });
  },

  setSetNote(exerciseId, setNumber, note) {
    const w = get().activeWorkout;
    if (!w) return;
    set({
      activeWorkout: {
        ...w,
        exercises: w.exercises.map(e =>
          e.exerciseId !== exerciseId
            ? e
            : { ...e, sets: e.sets.map(s => (s.setNumber === setNumber ? { ...s, note } : s)) }
        ),
      },
    });
  },

  removeSet(exerciseId, setNumber) {
    const w = get().activeWorkout;
    if (!w) return;
    set({
      activeWorkout: {
        ...w,
        exercises: w.exercises.map(e =>
          e.exerciseId !== exerciseId
            ? e
            : { ...e, sets: e.sets.filter(s => s.setNumber !== setNumber) }
        ),
      },
    });
  },

  toggleWarmup(exerciseId, setNumber) {
    const w = get().activeWorkout;
    if (!w) return;
    set({
      activeWorkout: {
        ...w,
        exercises: w.exercises.map(e =>
          e.exerciseId !== exerciseId
            ? e
            : {
                ...e,
                sets: e.sets.map(s =>
                  s.setNumber === setNumber ? { ...s, isWarmup: !s.isWarmup } : s
                ),
              }
        ),
      },
    });
  },

  removeExercise(exerciseId) {
    const w = get().activeWorkout;
    if (!w) return;
    set({
      activeWorkout: {
        ...w,
        exercises: w.exercises.filter(e => e.exerciseId !== exerciseId),
      },
    });
  },

  // Replace an exercise in the live session with another, keeping its logged
  // sets (0-set case is the common one — swapping before you start lifting).
  swapExercise(oldId, exercise) {
    const w = get().activeWorkout;
    if (!w || oldId === exercise.id) return;
    if (w.exercises.some(e => e.exerciseId === exercise.id)) return; // no duplicates
    set({
      activeWorkout: {
        ...w,
        exercises: w.exercises.map(e =>
          e.exerciseId !== oldId ? e : { ...e, exerciseId: exercise.id, name: exercise.name }
        ),
      },
    });
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
    const i = w.exercises.findIndex(e => e.exerciseId === exerciseId);
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

  async completeWorkout(xpEarned = 0) {
    const w = get().activeWorkout;
    if (!w) return null;
    const duration = Math.round((Date.now() - w.startedAt) / 1000);
    const allSets = w.exercises.flatMap(e => e.sets);
    const workingSets = allSets.filter(s => !s.isWarmup);
    const totalSets = workingSets.length;
    const today = todayKey();

    // Don't save (or reward) an empty session — discard it instead. Prevents
    // farming XP by finishing a workout with nothing logged.
    if (totalSets === 0) {
      set({ activeWorkout: null, resumed: false });
      return { discarded: true };
    }

    // Bodyweight counts toward volume; snapshot bodyweight for accurate history.
    const bodyweightKg = await getCurrentBodyweight();
    const flatSets = w.exercises.flatMap((e) => e.sets.map((s) => ({ ...s, exerciseId: e.exerciseId })));
    const totalVolume = await computeVolume(flatSets, bodyweightKg);

    // Calories: cardio bouts carry a precise (ACSM/MET) figure; lifting is a MET
    // estimate over the non-cardio portion of the session.
    const cardioKcal = allSets.reduce((a, s) => a + (s.calories || 0), 0);
    const cardioMin = allSets.reduce((a, s) => a + (s.durationSec || 0), 0) / 60;
    const hasStrength = allSets.some((s) => !s.isCardio && !s.isWarmup && ((s.weight || 0) > 0 || (s.reps || 0) > 0));
    const strengthMin = hasStrength ? Math.max(0, duration / 60 - cardioMin) : 0;
    const totalCalories = Math.round(cardioKcal + strengthKcal({ weightKg: bodyweightKg ?? 70, minutes: strengthMin }));

    const workoutId = await db.workouts.add({
      date: today,
      templateId: w.templateId,
      name: w.name,
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

    for (const ex of w.exercises) {
      for (const s of ex.sets) {
        await db.sets.add({
          workoutId,
          exerciseId: ex.exerciseId,
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
        });
      }
    }

    if (w.energy) {
      await db.energyLogs.add({ workoutId, level: w.energy });
    }

    // PR detection. `prs` carries enough detail to celebrate a record by name
    // and show what it beat — a bare count can only say "1 new record".
    let prBonus = 0;
    const prs = [];
    for (const ex of w.exercises) {
      const working = ex.sets.filter(s => !s.isWarmup && (s.weight > 0 || s.reps > 0));
      if (!working.length) continue;
      const maxWeight = Math.max(...working.map(s => s.weight));
      const maxReps = Math.max(...working.map(s => s.reps));
      const maxVol = Math.max(...working.map(s => s.weight * s.reps));
      const existing = await db.prs.where('exerciseId').equals(ex.exerciseId).toArray();
      const upsert = async (type, value) => {
        if (value <= 0) return;
        const prev = existing.find(p => p.type === type);
        if (!prev || value > prev.value) {
          const record = { exerciseId: ex.exerciseId, type, value, achievedAt: Date.now(), workoutId };
          if (prev) await db.prs.put({ ...prev, ...record });
          else await db.prs.add(record);
          prBonus += PR_BONUS;
          prs.push({
            exerciseId: ex.exerciseId,
            name: ex.name,
            type,
            value,
            prev: prev?.value ?? null,
          });
        }
      };
      await upsert('weight', maxWeight);
      await upsert('reps', maxReps);
      await upsert('volume', maxVol);
    }

    // XP + streak. userStore is imported statically (no circular dependency):
    // a lazy import() here is a separate chunk that can fail to load on a stale
    // service-worker shell, which would throw mid-save and silently strand the
    // finish. Keeping it static means the save path never depends on a runtime
    // chunk fetch.
    const userStore = useUserStore.getState();
    const profile = userStore.profile;
    const prCount = prs.length;

    // Daily Dungeon: if this was today's dungeon session and it cleared the
    // working-set objective, award its Iron (once per day) and apply the affix
    // XP bonus (Iron Will). Reward math is pure + unit-tested in dungeon.js.
    let dungeonResult = null;
    let dungeonXpBonus = 0;
    if (w.dungeon && w.dungeon === today) {
      const dungeon = todaysDungeon(today);
      const settings = useSettingsStore.getState();
      const cleared = isDungeonCleared(dungeon, { isDungeonSession: true, workingSets: totalSets });
      if (cleared && settings.lastDungeonClaim !== today) {
        const fx = affixEffects(dungeon.affixes);
        dungeonXpBonus = Math.round((xpEarned + prBonus) * (fx.xpMult - 1));
        const iron = dungeonReward(dungeon, { prCount });
        settings.claimDungeon(iron, today);
        dungeonResult = { name: dungeon.name, iron, xpBonus: dungeonXpBonus, cleared: true };
      } else if (cleared) {
        dungeonResult = { name: dungeon.name, iron: 0, alreadyCleared: true, cleared: true };
      }
    }

    const result = {
      workoutId,
      prCount,
      prs,
      xpEarned: xpEarned + prBonus,
      leveledUp: false,
      newLevel: profile?.level ?? 1,
      newTitle: profile?.title ?? 'First Rep',
      dungeon: dungeonResult,
      totalCalories,
    };

    if (profile) {
      const yesterday = todayKey(new Date(Date.now() - 86400000));
      let streak = profile.streak ?? 0;
      if (profile.lastWorkoutDate !== today) {
        streak = profile.lastWorkoutDate === yesterday ? streak + 1 : 1;
        await userStore.updateProfile({ lastWorkoutDate: today, streak });
      }
      const streakBonus = streak * STREAK_BONUS_PER_DAY;
      const totalGain = xpEarned + prBonus + streakBonus + dungeonXpBonus;
      const oldLevel = getLevelFromTotalXP(profile.totalXp);
      const newLevel = getLevelFromTotalXP(profile.totalXp + totalGain);
      // Persist the full gained XP so deletion can cleanly reverse it.
      await db.workouts.update(workoutId, { xpEarned: totalGain });
      await userStore.addXP(totalGain);
      result.xpEarned = totalGain;
      result.streakBonus = streakBonus;
      result.leveledUp = newLevel > oldLevel;
      result.newLevel = newLevel;
      result.newTitle = getTitle(newLevel);
    }

    try {
      const { checkAchievements } = await import('../utils/achievements.js');
      result.newAchievements = await checkAchievements();
    } catch (e) {
      console.error('Achievement check failed (workout still saved):', e);
      result.newAchievements = [];
    }

    // The verdict: one honest line about the session, stored on the row so it
    // survives, can be re-read in History, and reverts naturally with a delete.
    // Wrapped because a failure here must never cost someone their workout.
    try {
      const previous = (await db.workouts.orderBy('createdAt').reverse().limit(9).toArray()).filter(
        (w) => w.id !== workoutId
      );
      // Only the immediately-preceding session's advice is open. Advice has a
      // shelf life of exactly one session: if you skipped it, the new session
      // raises its own concern on its own merits rather than the app relitigating
      // something you were told three weeks ago.
      const verdict = buildVerdict({
        session: { totalVolume, totalSets, prCount },
        sets: flatSets,
        recentVolumes: previous.map((w) => w.totalVolume ?? 0),
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

    set({ activeWorkout: null, resumed: false });
    return result;
  },

  discardWorkout() {
    set({ activeWorkout: null, resumed: false });
  },
}));

// Write-through: mirror the active session to localStorage on every change so a
// lock/reload restores it; clear it when the workout ends.
if (typeof window !== 'undefined') {
  useWorkoutStore.subscribe((state) => {
    try {
      if (state.activeWorkout) localStorage.setItem(ACTIVE_KEY, serialize(state.activeWorkout));
      else localStorage.removeItem(ACTIVE_KEY);
    } catch {
      /* ignore */
    }
  });
}

export default useWorkoutStore;
