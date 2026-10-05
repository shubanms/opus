// Lifetime totals per exercise — the "Top exercises" ranking. Pure + tested.
//
// Volume is bodyweight-aware, the same way a workout's total is (volume.js):
// a pull-up moves your body, so ranking it on added weight alone put every
// bodyweight lift last with "0 kg" beside it, under lat pulldowns that move
// less. Cardio has no tonnage at all; it ranks on time instead of pretending.

/** How an exercise is measured: 'weighted' | 'bodyweight' | 'cardio'. */
export function exerciseKind(exercise, set) {
  if (set?.isCardio || exercise?.equipment === 'cardio') return 'cardio';
  if (exercise?.equipment === 'bodyweight') return 'bodyweight';
  return 'weighted';
}

/**
 * Every exercise with working sets, heaviest lifetime volume first.
 *
 * `exercises` is the catalogue (or the subset in play); `bodyweightByWorkout`
 * maps workoutId → the bodyweight snapshot stored on that workout. Rows:
 * `{ exerciseId, name, muscleGroup, kind, sets, reps, volume, seconds }`.
 * Unlimited on purpose — filter first, then take the top N, or a muscle with
 * plenty of history reads as "nothing logged" because its lifts sat at #25.
 */
export function rankExercises(sets, exercises = [], bodyweightByWorkout = {}) {
  const byId = new Map((exercises ?? []).map((e) => [e.id, e]));
  const rows = new Map();
  for (const s of sets ?? []) {
    if (!s || s.isWarmup) continue;
    const ex = byId.get(s.exerciseId);
    let row = rows.get(s.exerciseId);
    if (!row) {
      row = {
        exerciseId: s.exerciseId,
        name: ex?.name ?? 'Unknown exercise',
        muscleGroup: ex?.muscleGroup ?? null,
        kind: exerciseKind(ex, s),
        sets: 0,
        reps: 0,
        volume: 0,
        seconds: 0,
      };
      rows.set(s.exerciseId, row);
    }
    const reps = Number(s.reps) || 0;
    row.sets += 1;
    row.reps += reps;
    if (row.kind === 'cardio') {
      row.seconds += Number(s.durationSec) || 0;
    } else {
      const added = Number(s.weight) || 0;
      const load = row.kind === 'bodyweight' ? (Number(bodyweightByWorkout[s.workoutId]) || 0) + added : added;
      row.volume += load * reps;
    }
  }
  return [...rows.values()].sort(
    (a, b) => b.volume - a.volume || b.seconds - a.seconds || b.sets - a.sets || a.name.localeCompare(b.name)
  );
}
