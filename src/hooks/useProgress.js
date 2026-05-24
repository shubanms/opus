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

// Lifetime totals for the profile page.
export function useLifetimeStats() {
  return useLiveQuery(async () => {
    const workouts = await db.workouts.toArray();
    const prs = await db.prs.toArray();
    const totalVolume = workouts.reduce((a, w) => a + (w.totalVolume || 0), 0);
    const totalSets = workouts.reduce((a, w) => a + (w.totalSets || 0), 0);
    const seconds = workouts.reduce((a, w) => a + (w.duration || 0), 0);
    const dates = [...new Set(workouts.map((w) => w.date))].sort();
    let best = 0, run = 0, prev = null;
    for (const d of dates) {
      run = prev && (new Date(d) - new Date(prev)) / 86400000 === 1 ? run + 1 : 1;
      best = Math.max(best, run);
      prev = d;
    }
    return { workouts: workouts.length, totalVolume, totalSets, hours: seconds / 3600, prCount: prs.length, bestStreak: best };
  }, []) ?? { workouts: 0, totalVolume: 0, totalSets: 0, hours: 0, prCount: 0, bestStreak: 0 };
}

// Today's steps + water.
export function useDailyActivity() {
  return useLiveQuery(async () => {
    const date = new Date().toISOString().slice(0, 10);
    const e = await db.dailyLogs.where('date').equals(date).first();
    return { steps: e?.steps ?? 0, water: e?.water ?? 0 };
  }, []) ?? { steps: 0, water: 0 };
}

// Daily activity history (oldest→newest) for trend charts.
export function useActivityHistory() {
  return useLiveQuery(
    () => db.dailyLogs.orderBy('date').toArray(),
    []
  ) ?? [];
}

// Current bodyweight (kg) = most recent logged body-stat weight.
export function useCurrentBodyweight() {
  return useLiveQuery(
    () => db.bodyStats.orderBy('date').reverse().filter((s) => s.weight != null).first().then((s) => s?.weight ?? null),
    []
  ) ?? null;
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
// Counts bodyweight for bodyweight exercises using each workout's snapshot.
export function useExerciseVolume(exerciseId, limit = 10) {
  return useLiveQuery(async () => {
    if (!exerciseId) return [];
    const ex = await db.exercises.get(exerciseId);
    const isBw = ex?.equipment === 'bodyweight';
    const sets = await db.sets.where('exerciseId').equals(exerciseId).toArray();
    const byWorkout = {};
    for (const s of sets) {
      if (s.isWarmup) continue;
      (byWorkout[s.workoutId] ??= []).push(s);
    }
    const ids = Object.keys(byWorkout).map(Number).sort((a, b) => a - b);
    const result = [];
    for (const id of ids) {
      const w = await db.workouts.get(id);
      const bw = w?.bodyweightKg || 0;
      const volume = byWorkout[id].reduce(
        (a, s) => a + ((isBw ? bw + (s.weight || 0) : (s.weight || 0)) * (s.reps || 0)),
        0
      );
      result.push({ label: w?.date ? w.date.slice(5) : String(id), volume: Math.round(volume) });
    }
    return result.slice(-limit);
  }, [exerciseId]) ?? [];
}

// Stub — weekly volume aggregation implemented in Sprint 8
export function useVolumeByWeek() { return []; }
