import { create } from 'zustand';
import { db } from '../db/db.js';

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
    const workoutId = await db.workouts.add({
      date: new Date().toISOString().slice(0, 10),
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
    set({ activeWorkout: null });
    return workoutId;
  },

  discardWorkout() {
    set({ activeWorkout: null });
  },
}));

export default useWorkoutStore;
