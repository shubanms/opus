import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db.js';
import { getLevelFromTotalXP } from '../utils/rpg.js';
import { groupSetsInOrder, recordSetIds } from '../utils/historyMath.js';
import useSettingsStore from '../store/settingsStore.js';

const newestFirst = () => db.workouts.orderBy('createdAt').reverse().toArray();

// All completed workouts newest-first. `[]` while loading — Home and others
// rely on that shape, so it stays.
export function useWorkouts() {
  return useLiveQuery(newestFirst, []) ?? [];
}

/**
 * The same list, but able to say "not loaded yet". History used to flash
 * "No workouts yet" on every visit for anyone with a history, because the
 * first render could not tell an empty list from one still on its way.
 */
export function useWorkoutList() {
  const workouts = useLiveQuery(newestFirst, []);
  return { workouts: workouts ?? [], loading: workouts === undefined };
}

/**
 * workout id → the names of the lifts in it, for searching History by
 * exercise. Only loaded while a search is active (`enabled`): it reads every
 * set, which a plain visit to History has no need to.
 */
export function useHistoryIndex(enabled) {
  return useLiveQuery(async () => {
    if (!enabled) return null;
    const [sets, exercises] = await Promise.all([db.sets.toArray(), db.exercises.toArray()]);
    const nameOf = new Map(exercises.map((e) => [e.id, e.name]));
    const index = new Map();
    for (const s of sets) {
      const name = nameOf.get(s.exerciseId);
      if (!name) continue;
      if (!index.has(s.workoutId)) index.set(s.workoutId, new Set());
      index.get(s.workoutId).add(name);
    }
    return new Map([...index].map(([id, names]) => [id, [...names]]));
  }, [enabled]) ?? null;
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

/**
 * A workout's sets grouped by exercise, in the order the exercises were done,
 * with each exercise's name and kind and `isRecord` on every set that holds a
 * record today. Pass null to skip loading.
 *
 * Grouping used to go through a plain object, whose integer keys iterate in
 * ascending order — so every session read in catalogue order (Bench Press,
 * id 3, above the Squat you actually opened with).
 */
export function useWorkoutDetail(workoutId) {
  return useLiveQuery(async () => {
    if (!workoutId) return [];
    const sets = await db.sets.where('workoutId').equals(workoutId).toArray();
    const groups = groupSetsInOrder(sets);
    const exercises = await db.exercises.bulkGet(groups.map((g) => g.exerciseId));
    const records = recordSetIds(sets, await db.prs.where('workoutId').equals(workoutId).toArray(), workoutId);
    return groups.map((g, i) => {
      const ex = exercises[i];
      return {
        exerciseId: g.exerciseId,
        name: ex?.name ?? 'Exercise',
        isCardio: ex?.equipment === 'cardio' || g.sets.some((s) => s.isCardio),
        isBodyweight: ex?.equipment === 'bodyweight',
        sets: g.sets.map((s) => (records.has(s.id) ? { ...s, isRecord: true } : s)),
      };
    });
  }, [workoutId]) ?? [];
}
