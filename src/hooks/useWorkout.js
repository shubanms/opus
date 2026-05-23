import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db.js';
import { getLevelFromTotalXP } from '../utils/rpg.js';
import useSettingsStore from '../store/settingsStore.js';

// All completed workouts newest-first.
export function useWorkouts() {
  return useLiveQuery(
    () => db.workouts.orderBy('createdAt').reverse().toArray(),
    []
  ) ?? [];
}

// Sets from the most recent session for a given exercise (for ghost text).
export function useLastSets(exerciseId) {
  return useLiveQuery(async () => {
    if (!exerciseId) return [];
    const sets = await db.sets.where('exerciseId').equals(exerciseId).toArray();
    if (sets.length === 0) return [];
    const maxId = sets.reduce((m, s) => (s.workoutId > m ? s.workoutId : m), 0);
    return sets
      .filter((s) => s.workoutId === maxId)
      .sort((a, b) => a.setNumber - b.setNumber);
  }, [exerciseId]) ?? [];
}

// All sets for a specific workout.
export function useWorkoutSets(workoutId) {
  return useLiveQuery(
    () => (workoutId ? db.sets.where('workoutId').equals(workoutId).toArray() : []),
    [workoutId]
  ) ?? [];
}

// Assembles everything a shareable card needs for a saved workout.
export function useShareData(workoutId) {
  return useLiveQuery(async () => {
    if (!workoutId) return null;
    const w = await db.workouts.get(workoutId);
    if (!w) return null;

    const sets = await db.sets.where('workoutId').equals(workoutId).toArray();
    const exIds = [...new Set(sets.map((s) => s.exerciseId))];
    const muscles = new Set();
    for (const id of exIds) {
      const ex = await db.exercises.get(id);
      if (ex?.muscleGroup) muscles.add(ex.muscleGroup);
    }

    const prs = await db.prs.where('workoutId').equals(workoutId).toArray();
    const weightPR = prs.find((p) => p.type === 'weight');
    let pr = null;
    if (weightPR) {
      const ex = await db.exercises.get(weightPR.exerciseId);
      pr = { exercise: ex?.name, value: weightPR.value };
    }

    const profile = await db.userProfile.get(1);
    return {
      name: w.name,
      athlete: profile?.name || null,
      date: w.date,
      duration: w.duration,
      totalVolume: w.totalVolume,
      totalSets: w.totalSets,
      xpEarned: w.xpEarned,
      muscles: [...muscles],
      pr,
      level: profile ? getLevelFromTotalXP(profile.totalXp) : 1,
      unit: useSettingsStore.getState().unit,
    };
  }, [workoutId]) ?? null;
}

// Workout sets grouped by exercise, with names. Pass null to skip loading.
export function useWorkoutDetail(workoutId) {
  return useLiveQuery(async () => {
    if (!workoutId) return [];
    const sets = await db.sets.where('workoutId').equals(workoutId).sortBy('setNumber');
    const groups = {};
    for (const s of sets) (groups[s.exerciseId] ??= []).push(s);
    const result = [];
    for (const [exId, exSets] of Object.entries(groups)) {
      const ex = await db.exercises.get(Number(exId));
      result.push({ exerciseId: Number(exId), name: ex?.name ?? 'Exercise', sets: exSets });
    }
    return result;
  }, [workoutId]) ?? [];
}
