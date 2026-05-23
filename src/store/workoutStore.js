import { create } from 'zustand';
import { db } from '../db/db.js';
import { PR_BONUS, STREAK_BONUS_PER_DAY, getLevelFromTotalXP, getTitle } from '../utils/rpg.js';

const useWorkoutStore = create((set, get) => ({
  activeWorkout: null,

  startWorkout(name = 'Workout', templateId = null) {
    set({
      activeWorkout: {
        id: null,
        name,
        templateId,
        startedAt: Date.now(),
        exercises: [],
      },
    });
  },

  setWorkoutName(name) {
    const w = get().activeWorkout;
    if (w) set({ activeWorkout: { ...w, name } });
  },

  startFromTemplate(template) {
    set({
      activeWorkout: {
        id: null,
        name: template.name,
        templateId: template.id,
        startedAt: Date.now(),
        exercises: (template.exercises ?? []).map(e => ({
          exerciseId: e.id,
          name: e.name,
          sets: [],
        })),
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

  async completeWorkout(xpEarned = 0) {
    const w = get().activeWorkout;
    if (!w) return null;
    const duration = Math.round((Date.now() - w.startedAt) / 1000);
    const allSets = w.exercises.flatMap(e => e.sets);
    const workingSets = allSets.filter(s => !s.isWarmup);
    const totalVolume = Math.round(workingSets.reduce((s, x) => s + x.weight * x.reps, 0));
    const totalSets = workingSets.length;
    const today = new Date().toISOString().slice(0, 10);

    const workoutId = await db.workouts.add({
      date: today,
      templateId: w.templateId,
      name: w.name,
      status: 'completed',
      duration,
      notes: '',
      xpEarned,
      totalVolume,
      totalSets,
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
          completedAt: s.completedAt,
        });
      }
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
      await userStore.addXP(totalGain);
      result.xpEarned = totalGain;
      result.streakBonus = streakBonus;
      result.leveledUp = newLevel > oldLevel;
      result.newLevel = newLevel;
      result.newTitle = getTitle(newLevel);
    }

    set({ activeWorkout: null });
    return result;
  },

  discardWorkout() {
    set({ activeWorkout: null });
  },
}));

export default useWorkoutStore;
