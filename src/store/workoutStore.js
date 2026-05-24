import { create } from 'zustand';
import { db } from '../db/db.js';
import { PR_BONUS, STREAK_BONUS_PER_DAY, getLevelFromTotalXP, getTitle } from '../utils/rpg.js';
import { computeVolume } from '../utils/volume.js';
import { getCurrentBodyweight } from '../utils/healthActions.js';
import { serialize, deserialize, isStale } from '../utils/workoutSession.js';
import { moveItem } from '../utils/reorder.js';

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
    const today = new Date().toISOString().slice(0, 10);

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

    const workoutId = await db.workouts.add({
      date: today,
      templateId: w.templateId,
      name: w.name,
      status: 'completed',
      duration,
      notes: w.notes ?? '',
      xpEarned,
      totalVolume,
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
        });
      }
    }

    if (w.energy) {
      await db.energyLogs.add({ workoutId, level: w.energy });
    }

    // PR detection
    let prBonus = 0;
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
        }
      };
      await upsert('weight', maxWeight);
      await upsert('reps', maxReps);
      await upsert('volume', maxVol);
    }

    // XP + streak (lazy import to avoid circular dep)
    const { default: useUserStore } = await import('./userStore.js');
    const userStore = useUserStore.getState();
    const profile = userStore.profile;
    const result = {
      workoutId,
      prCount: prBonus / PR_BONUS,
      xpEarned: xpEarned + prBonus,
      leveledUp: false,
      newLevel: profile?.level ?? 1,
      newTitle: profile?.title ?? 'First Rep',
    };

    if (profile) {
      const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
      let streak = profile.streak ?? 0;
      if (profile.lastWorkoutDate !== today) {
        streak = profile.lastWorkoutDate === yesterday ? streak + 1 : 1;
        await userStore.updateProfile({ lastWorkoutDate: today, streak });
      }
      const streakBonus = streak * STREAK_BONUS_PER_DAY;
      const totalGain = xpEarned + prBonus + streakBonus;
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
