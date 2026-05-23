import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db.js';

// Returns personal records for an exercise, newest first.
export function usePRs(exerciseId) {
  return useLiveQuery(
    () => exerciseId
      ? db.prs.where('exerciseId').equals(exerciseId).reverse().sortBy('achievedAt')
      : [],
    [exerciseId]
  ) ?? [];
}

// Returns body stat entries newest-first.
export function useBodyStats() {
  return useLiveQuery(
    () => db.bodyStats.orderBy('date').reverse().toArray(),
    []
  ) ?? [];
}

// Returns sleep logs newest-first.
export function useSleepLogs() {
  return useLiveQuery(
    () => db.sleepLogs.orderBy('date').reverse().toArray(),
    []
  ) ?? [];
}

function mondayOf(date) {
  const d = new Date(date);
  const day = (d.getDay() + 6) % 7; // 0 = Monday
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d;
}

// Total volume per week for the last `weeks` weeks (oldest → newest).
export function useWeeklyVolume(weeks = 8) {
  return useLiveQuery(async () => {
    const workouts = await db.workouts.toArray();
    const thisMon = mondayOf(new Date());
    const buckets = [];
    for (let i = weeks - 1; i >= 0; i--) {
      const m = new Date(thisMon);
      m.setDate(thisMon.getDate() - i * 7);
      buckets.push({ key: m.getTime(), label: `${m.getMonth() + 1}/${m.getDate()}`, volume: 0 });
    }
    const byKey = Object.fromEntries(buckets.map((b) => [b.key, b]));
    for (const w of workouts) {
      const k = mondayOf(new Date(w.date)).getTime();
      if (byKey[k]) byKey[k].volume += w.totalVolume ?? 0;
    }
    return buckets.map((b) => ({ label: b.label, volume: Math.round(b.volume) }));
  }, [weeks]) ?? [];
}

// Working-set count per muscle group, most-trained first.
export function useMuscleFrequency() {
  return useLiveQuery(async () => {
    const sets = (await db.sets.toArray()).filter((s) => !s.isWarmup);
    const exIds = [...new Set(sets.map((s) => s.exerciseId))];
    const muscleByEx = {};
    for (const id of exIds) {
      const ex = await db.exercises.get(id);
      muscleByEx[id] = ex?.muscleGroup;
    }
    const counts = {};
    for (const s of sets) {
      const m = muscleByEx[s.exerciseId];
      if (m) counts[m] = (counts[m] ?? 0) + 1;
    }
    return Object.entries(counts)
      .map(([muscle, count]) => ({ muscle, count }))
      .sort((a, b) => b.count - a.count);
  }, []) ?? [];
}

// Set of ISO dates on which a workout was completed (for the heatmap).
export function useWorkoutDays() {
  return useLiveQuery(async () => {
    const workouts = await db.workouts.toArray();
    return new Set(workouts.map((w) => w.date));
  }, []) ?? new Set();
}

// Best weight per session for an exercise (last `limit` sessions).
export function useExerciseMaxWeight(exerciseId, limit = 10) {
  return useLiveQuery(async () => {
    if (!exerciseId) return [];
    const sets = await db.sets.where('exerciseId').equals(exerciseId).toArray();
    const byWorkout = {};
    for (const s of sets) {
      if (s.isWarmup) continue;
      byWorkout[s.workoutId] = Math.max(byWorkout[s.workoutId] ?? 0, s.weight);
    }
    const ids = Object.keys(byWorkout).map(Number).sort((a, b) => a - b);
    const result = [];
    for (const id of ids) {
      const w = await db.workouts.get(id);
      result.push({ label: w?.date ? w.date.slice(5) : String(id), value: byWorkout[id] });
    }
    return result.slice(-limit);
  }, [exerciseId]) ?? [];
}

// Per-session volume for an exercise (last `limit` sessions, oldest→newest).
export function useExerciseVolume(exerciseId, limit = 10) {
  return useLiveQuery(async () => {
    if (!exerciseId) return [];
    const sets = await db.sets.where('exerciseId').equals(exerciseId).toArray();
    const byWorkout = {};
    for (const s of sets) {
      if (s.isWarmup) continue;
      byWorkout[s.workoutId] = (byWorkout[s.workoutId] ?? 0) + s.weight * s.reps;
    }
    const ids = Object.keys(byWorkout).map(Number).sort((a, b) => a - b);
    const result = [];
    for (const id of ids) {
      const w = await db.workouts.get(id);
      result.push({
        label: w?.date ? w.date.slice(5) : String(id),
        volume: Math.round(byWorkout[id]),
      });
    }
    return result.slice(-limit);
  }, [exerciseId]) ?? [];
}

// Stub — weekly volume aggregation implemented in Sprint 8
export function useVolumeByWeek() { return []; }
