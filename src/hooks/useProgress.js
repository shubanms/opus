import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db.js';
import { bestEstimate, sessionEstimates } from '../utils/oneRepMax.js';
import { computeStats } from '../utils/achievements.js';
import { inWeekOf, weeklyTotals } from '../utils/weeks.js';
import { rankExercises } from '../utils/exerciseStats.js';
import { shortDate } from '../utils/dateKey.js';
import { useTodayKey } from './useTodayKey.js';

// Every chart label here is `shortDate` ("17 Aug"): day-first with a month
// name, the one short date format the app uses. Axes used to print "8/17"
// (month-first — ambiguous to most of the world) and "08-17".
const sessionLabel = (w, id) => (w?.date ? shortDate(w.date) : String(id));

// Workouts in calendar order. Ids are creation order, which an import or a
// backfilled session does not follow.
async function workoutsInOrder(ids) {
  const rows = await db.workouts.bulkGet(ids);
  return ids
    .map((id, i) => ({ id, w: rows[i] }))
    .sort((a, b) => (a.w?.date ?? '').localeCompare(b.w?.date ?? '') || a.id - b.id);
}

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
//
// The best streak comes from the achievements' `computeStats` rather than a
// second count kept here: two copies of the same number had already drifted
// apart, and the achievement and boss gates read that one.
export function useLifetimeStats() {
  return useLiveQuery(async () => {
    const workouts = await db.workouts.toArray();
    const prs = await db.prs.toArray();
    const stats = await computeStats();
    const totalVolume = workouts.reduce((a, w) => a + (w.totalVolume || 0), 0);
    const totalSets = workouts.reduce((a, w) => a + (w.totalSets || 0), 0);
    const seconds = workouts.reduce((a, w) => a + (w.duration || 0), 0);
    return {
      workouts: workouts.length,
      totalVolume,
      totalSets,
      hours: seconds / 3600,
      prCount: prs.length,
      bestStreak: stats?.bestStreak ?? 0,
    };
  }, []) ?? { workouts: 0, totalVolume: 0, totalSets: 0, hours: 0, prCount: 0, bestStreak: 0 };
}

// Today's steps + water, and the day they are for.
//
// "Today" is a dependency, not something read inside the query: a live query
// only re-runs when its tables change, so a phone left on Home overnight kept
// showing yesterday's rings. It is also the LOCAL day — this used to be the
// UTC date, which in Los Angeles turned over at 5 pm.
export function useDailyActivity() {
  const today = useTodayKey();
  const row = useLiveQuery(async () => {
    const e = await db.dailyLogs.where('date').equals(today).first();
    return { date: today, steps: e?.steps ?? 0, water: e?.water ?? 0 };
  }, [today]);
  // Until the new day's query lands the hook still holds the old result; never
  // show (or celebrate against) another day's numbers as today's.
  return row?.date === today ? row : { date: today, steps: 0, water: 0 };
}

// Daily activity history (oldest→newest) for trend charts.
export function useActivityHistory() {
  return useLiveQuery(
    () => db.dailyLogs.orderBy('date').toArray(),
    []
  ) ?? [];
}

// Current bodyweight (kg) = most recent logged body-stat weight. Positive only:
// a "-80" saved before entries were validated must not become the bodyweight.
export function useCurrentBodyweight() {
  return useLiveQuery(
    () => db.bodyStats.orderBy('date').reverse().filter((s) => s.weight > 0).first().then((s) => s?.weight ?? null),
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

// Total volume per week for the last `weeks` weeks (oldest → newest), bucketed
// by local Monday (utils/weeks.js). Re-reads when the day turns over, so a new
// week's bar appears on Monday without a new workout to trigger it.
export function useWeeklyVolume(weeks = 8) {
  const today = useTodayKey();
  return useLiveQuery(async () => {
    const workouts = await db.workouts.toArray();
    return weeklyTotals(workouts, { today, weeks }).map((b) => ({
      week: b.week,
      label: b.label,
      volume: Math.round(b.value),
    }));
  }, [weeks, today]) ?? [];
}

// Working-set count per muscle group for the current training week
// (Monday-aligned, matching quests). Lifetime totals cannot answer "am I doing
// enough chest work?" — the question is always about this week.
//
// The week is decided by the workout's date — the same rule as the recap and
// Home's "This week" tile — so a session that ran past midnight on Sunday
// counts in one week everywhere, not in two.
export function useWeeklyMuscleSets() {
  const today = useTodayKey();
  return useLiveQuery(async () => {
    const workouts = await db.workouts.toArray();
    const thisWeek = new Set(
      workouts.filter((w) => inWeekOf(w.date, today)).map((w) => w.id)
    );
    if (!thisWeek.size) return {};

    const sets = (await db.sets.toArray()).filter((s) => !s.isWarmup && thisWeek.has(s.workoutId));
    const exIds = [...new Set(sets.map((s) => s.exerciseId))];
    const muscleByEx = {};
    for (const id of exIds) {
      const ex = await db.exercises.get(id);
      if (ex?.muscleGroup) muscleByEx[id] = ex.muscleGroup;
    }

    const byMuscle = {};
    for (const s of sets) {
      const m = muscleByEx[s.exerciseId];
      if (m) byMuscle[m] = (byMuscle[m] ?? 0) + 1;
    }
    return byMuscle;
  }, [today]) ?? {};
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

// Progress photos, newest date first.
export function usePhotos() {
  return useLiveQuery(() => db.photos.orderBy('date').reverse().toArray(), []) ?? [];
}

// Set of local date keys on which a workout was completed (heatmap, calendar).
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
      if (s.isWarmup || s.isCardio) continue;
      byWorkout[s.workoutId] = Math.max(byWorkout[s.workoutId] ?? 0, s.weight || 0);
    }
    const ordered = await workoutsInOrder(Object.keys(byWorkout).map(Number));
    return ordered.map(({ id, w }) => ({ label: sessionLabel(w, id), value: byWorkout[id] })).slice(-limit);
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
    const ordered = await workoutsInOrder(Object.keys(byWorkout).map(Number));
    const result = ordered.map(({ id, w }) => {
      const bw = w?.bodyweightKg || 0;
      const volume = byWorkout[id].reduce(
        (a, s) => a + ((isBw ? bw + (s.weight || 0) : (s.weight || 0)) * (s.reps || 0)),
        0
      );
      return { label: sessionLabel(w, id), volume: Math.round(volume) };
    });
    return result.slice(-limit);
  }, [exerciseId]) ?? [];
}

// Best estimated 1RM (Epley) per session for an exercise (last `limit`,
// oldest→newest). Only sets of 1–12 reps count (utils/oneRepMax.js): a
// high-rep back-off set inflates the estimate past the real top set. Sessions
// with no estimable set are skipped.
export function useExerciseOneRepMax(exerciseId, limit = 10) {
  return useLiveQuery(async () => {
    if (!exerciseId) return [];
    const sets = await db.sets.where('exerciseId').equals(exerciseId).toArray();
    const best = sessionEstimates(sets);
    const ordered = await workoutsInOrder([...best.keys()]);
    return ordered
      .map(({ id, w }) => ({ label: sessionLabel(w, id), value: Math.round(best.get(id).value) }))
      .slice(-limit);
  }, [exerciseId]) ?? [];
}

// The all-time best estimated 1RM for an exercise and the set behind it:
// `{ value, weight, reps, workoutId, date }`, or null. Separate from the
// chart's last-N series so an old peak is not forgotten by it.
export function useExerciseBestOneRepMax(exerciseId) {
  return useLiveQuery(async () => {
    if (!exerciseId) return null;
    const best = bestEstimate(await db.sets.where('exerciseId').equals(exerciseId).toArray());
    if (!best) return null;
    const w = await db.workouts.get(best.workoutId);
    return { ...best, date: w?.date ?? null };
  }, [exerciseId]) ?? null;
}

// Every exercise you've done, heaviest lifetime volume first — bodyweight lifts
// counted with your bodyweight, cardio ranked by time (utils/exerciseStats.js).
// Unlimited: the By Exercise muscle filter runs on the full list and the page
// takes the top ten after it. Cutting first is how "Abs" — lit on the map —
// answered "No lifts logged for this muscle yet".
export function useTopExercises() {
  return useLiveQuery(async () => {
    const sets = (await db.sets.toArray()).filter((s) => !s.isWarmup);
    if (!sets.length) return [];
    const exIds = [...new Set(sets.map((s) => s.exerciseId))];
    const exercises = (await db.exercises.bulkGet(exIds)).filter(Boolean);
    const bodyweight = {};
    for (const w of await db.workouts.toArray()) bodyweight[w.id] = w.bodyweightKg || 0;
    return rankExercises(sets, exercises, bodyweight);
  }, []) ?? [];
}

// Every personal record across all exercises, newest first, with the
// exercise name joined in — powers the Hall of Records timeline.
export function useAllPRs() {
  return useLiveQuery(async () => {
    const prs = await db.prs.orderBy('achievedAt').reverse().toArray();
    if (!prs.length) return [];
    const names = {};
    for (const exId of [...new Set(prs.map((p) => p.exerciseId))]) {
      const ex = await db.exercises.get(exId);
      names[exId] = ex?.name ?? 'Unknown exercise';
    }
    return prs.map((p) => ({ ...p, exerciseName: names[p.exerciseId] }));
  }, []) ?? [];
}

// Stub — weekly volume aggregation implemented in Sprint 8
export function useVolumeByWeek() { return []; }
