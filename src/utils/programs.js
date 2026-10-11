// Classic bundled training programs. Pure data + a resolver. Each program is a
// week of day-routines using catalog exercise names, with a progression scheme
// so installed routines auto-advance (see utils/progression.js). Installing a
// program creates normal routines (fully editable/deletable). Unit-tested to
// guarantee every exercise name resolves to the seeded catalog.
//
// The rule for this file: a card promises exactly what installing delivers.
// Three of them didn't. "PPL — push, pull and legs twice each week" installed
// three days. "5/3/1 … percentage-based" was a plain 5×5 adding 5 kg every
// session to every lift, overhead press and curls included. And StrongLifts'
// fixed A/B/A week trains the press and deadlift once a week, which its card
// didn't say. So: six real PPL days, an honest name for the 4-day program,
// steps sized per lift (`step`, kg — big lower-body lifts move 5, everything
// else 2.5), and descriptions that say what the engine actually does.
//
// Routines installed together share progress on a lift they prescribe
// identically (templateActions.advanceProgression): StrongLifts' squat is one
// lift across Monday, Wednesday and Friday, not three that each move weekly.

const linear = { mode: 'linear', weightStep: 2.5, deloadAfterMisses: 3 };
const dbl = { mode: 'double', weightStep: 2.5, deloadAfterMisses: 3 };

// Per-lift steps (kg). Unlisted exercises use the program's weightStep.
const BIG = 5;

export const PROGRAMS = [
  {
    id: 'stronglifts_5x5',
    name: 'StrongLifts 5×5',
    desc: 'Squat every session, alternating A (bench, row) and B (press, deadlift). Hit every set and the weight goes up next time; fail a lift three sessions running and it drops back 10%. Planned as a fixed A/B/A week, so the press and deadlift come once a week — start Workout B on alternate Fridays to run it as written.',
    level: 'Beginner', daysPerWeek: 3, progression: linear,
    schedule: [
      { name: 'Workout A', dayOfWeek: 1, exercises: [
        { name: 'Back Squat', sets: 5, reps: 5 },
        { name: 'Bench Press', sets: 5, reps: 5 },
        { name: 'Barbell Row', sets: 5, reps: 5 },
      ] },
      { name: 'Workout B', dayOfWeek: 3, exercises: [
        { name: 'Back Squat', sets: 5, reps: 5 },
        { name: 'Overhead Press', sets: 5, reps: 5 },
        { name: 'Deadlift', sets: 1, reps: 5, step: BIG },
      ] },
      { name: 'Workout A (Fri)', dayOfWeek: 5, exercises: [
        { name: 'Back Squat', sets: 5, reps: 5 },
        { name: 'Bench Press', sets: 5, reps: 5 },
        { name: 'Barbell Row', sets: 5, reps: 5 },
      ] },
    ],
  },
  {
    id: 'gzclp',
    name: 'GZCLP',
    desc: 'Four days in GZCL’s tiers: a heavy 5×3 main lift, a 3×10 second lift and a 3×15 accessory. Complete the sets and the weight goes up next time; miss a lift three sessions running and it drops back 10% (simpler than GZCLP’s rep-scheme changes).',
    level: 'Beginner–Int', daysPerWeek: 4, progression: linear,
    schedule: [
      { name: 'Day 1 · Squat', dayOfWeek: 1, exercises: [
        { name: 'Back Squat', sets: 5, reps: 3, step: BIG },
        { name: 'Bench Press', sets: 3, reps: 10 },
        { name: 'Lat Pulldown', sets: 3, reps: 15 },
      ] },
      { name: 'Day 2 · OHP', dayOfWeek: 2, exercises: [
        { name: 'Overhead Press', sets: 5, reps: 3 },
        { name: 'Deadlift', sets: 3, reps: 10, step: BIG },
        { name: 'Cable Row', sets: 3, reps: 15 },
      ] },
      { name: 'Day 3 · Bench', dayOfWeek: 4, exercises: [
        { name: 'Bench Press', sets: 5, reps: 3 },
        { name: 'Back Squat', sets: 3, reps: 10, step: BIG },
        { name: 'Lat Pulldown', sets: 3, reps: 15 },
      ] },
      { name: 'Day 4 · Deadlift', dayOfWeek: 5, exercises: [
        { name: 'Deadlift', sets: 5, reps: 3, step: BIG },
        { name: 'Overhead Press', sets: 3, reps: 10 },
        { name: 'Cable Row', sets: 3, reps: 15 },
      ] },
    ],
  },
  {
    id: 'ppl',
    name: 'Push / Pull / Legs',
    desc: 'Six days: push, pull and legs twice a week — A days built on bench, deadlift and squat, B days on the press, pull-ups and front squat. Complete every set and the weight goes up next time; otherwise it holds until you do.',
    level: 'Intermediate', daysPerWeek: 6, progression: dbl,
    schedule: [
      { name: 'Push A', dayOfWeek: 1, exercises: [
        { name: 'Bench Press', sets: 4, reps: 6 },
        { name: 'Overhead Press', sets: 3, reps: 8 },
        { name: 'Incline Bench Press', sets: 3, reps: 10 },
        { name: 'Lateral Raise', sets: 3, reps: 15 },
        { name: 'Tricep Pushdown', sets: 3, reps: 12 },
      ] },
      { name: 'Pull A', dayOfWeek: 2, exercises: [
        { name: 'Deadlift', sets: 3, reps: 5, step: BIG },
        { name: 'Barbell Row', sets: 4, reps: 8 },
        { name: 'Lat Pulldown', sets: 3, reps: 12 },
        { name: 'Face Pull', sets: 3, reps: 15 },
        { name: 'Barbell Curl', sets: 3, reps: 12 },
      ] },
      { name: 'Legs A', dayOfWeek: 3, exercises: [
        { name: 'Back Squat', sets: 4, reps: 6, step: BIG },
        { name: 'Romanian Deadlift', sets: 3, reps: 10 },
        { name: 'Leg Press', sets: 3, reps: 12, step: BIG },
        { name: 'Lying Leg Curl', sets: 3, reps: 12 },
        { name: 'Standing Calf Raise', sets: 4, reps: 15 },
      ] },
      { name: 'Push B', dayOfWeek: 4, exercises: [
        { name: 'Overhead Press', sets: 4, reps: 6 },
        { name: 'Dumbbell Bench Press', sets: 3, reps: 10 },
        { name: 'Cable Crossover', sets: 3, reps: 12 },
        { name: 'Lateral Raise', sets: 3, reps: 15 },
        { name: 'Skull Crusher', sets: 3, reps: 12 },
      ] },
      { name: 'Pull B', dayOfWeek: 5, exercises: [
        { name: 'Pull-Up', sets: 4, reps: 8 },
        { name: 'Cable Row', sets: 3, reps: 10 },
        { name: 'Dumbbell Row', sets: 3, reps: 10 },
        { name: 'Reverse Flye', sets: 3, reps: 15 },
        { name: 'Hammer Curl', sets: 3, reps: 12 },
      ] },
      { name: 'Legs B', dayOfWeek: 6, exercises: [
        { name: 'Front Squat', sets: 4, reps: 8 },
        { name: 'Hip Thrust', sets: 3, reps: 10 },
        { name: 'Bulgarian Split Squat', sets: 3, reps: 10 },
        { name: 'Seated Leg Curl', sets: 3, reps: 12 },
        { name: 'Seated Calf Raise', sets: 4, reps: 15 },
      ] },
    ],
  },
  {
    id: 'upper_lower',
    name: 'Upper / Lower',
    desc: 'Four days: upper and lower body twice a week each, with different main lifts on the A and B days. Complete every set and the weight goes up next time; otherwise it holds until you do.',
    level: 'Intermediate', daysPerWeek: 4, progression: dbl,
    schedule: [
      { name: 'Upper A', dayOfWeek: 1, exercises: [
        { name: 'Bench Press', sets: 4, reps: 6 },
        { name: 'Barbell Row', sets: 4, reps: 8 },
        { name: 'Overhead Press', sets: 3, reps: 10 },
        { name: 'Lat Pulldown', sets: 3, reps: 12 },
        { name: 'Barbell Curl', sets: 3, reps: 12 },
      ] },
      { name: 'Lower A', dayOfWeek: 2, exercises: [
        { name: 'Back Squat', sets: 4, reps: 6, step: BIG },
        { name: 'Romanian Deadlift', sets: 3, reps: 8 },
        { name: 'Leg Press', sets: 3, reps: 12, step: BIG },
        { name: 'Lying Leg Curl', sets: 3, reps: 12 },
        { name: 'Standing Calf Raise', sets: 4, reps: 15 },
      ] },
      { name: 'Upper B', dayOfWeek: 4, exercises: [
        { name: 'Overhead Press', sets: 4, reps: 6 },
        { name: 'Pull-Up', sets: 4, reps: 8 },
        { name: 'Incline Bench Press', sets: 3, reps: 10 },
        { name: 'Cable Row', sets: 3, reps: 12 },
        { name: 'Tricep Pushdown', sets: 3, reps: 12 },
      ] },
      { name: 'Lower B', dayOfWeek: 5, exercises: [
        { name: 'Deadlift', sets: 4, reps: 5, step: BIG },
        { name: 'Front Squat', sets: 3, reps: 8 },
        { name: 'Hip Thrust', sets: 3, reps: 12 },
        { name: 'Seated Leg Curl', sets: 3, reps: 12 },
        { name: 'Seated Calf Raise', sets: 4, reps: 15 },
      ] },
    ],
  },
  {
    // Historical id: this card used to be labelled "5/3/1 for Beginners".
    id: 'five_three_one',
    name: 'Big Four Strength',
    desc: 'One main lift a day — press, deadlift, bench, squat — then two assistance moves. 5/3/1’s weekly layout without its percentage waves: hit every set and the weight goes up next time, in small steps on the presses and assistance work, bigger ones on squat and deadlift.',
    level: 'Beginner–Int', daysPerWeek: 4, progression: linear,
    schedule: [
      { name: 'Press Day', dayOfWeek: 1, exercises: [
        { name: 'Overhead Press', sets: 5, reps: 5 },
        { name: 'Chin-Up', sets: 3, reps: 10 },
        { name: 'Tricep Dip', sets: 3, reps: 12 },
      ] },
      { name: 'Deadlift Day', dayOfWeek: 2, exercises: [
        { name: 'Deadlift', sets: 3, reps: 5, step: BIG },
        { name: 'Good Morning', sets: 3, reps: 10 },
        { name: 'Hanging Leg Raise', sets: 3, reps: 12 },
      ] },
      { name: 'Bench Day', dayOfWeek: 4, exercises: [
        { name: 'Bench Press', sets: 5, reps: 5 },
        { name: 'Dumbbell Row', sets: 3, reps: 10 },
        { name: 'Dumbbell Curl', sets: 3, reps: 12 },
      ] },
      { name: 'Squat Day', dayOfWeek: 5, exercises: [
        { name: 'Back Squat', sets: 5, reps: 5, step: BIG },
        { name: 'Leg Press', sets: 3, reps: 10, step: BIG },
        { name: 'Standing Calf Raise', sets: 4, reps: 15 },
      ] },
    ],
  },
];

export function programById(id) {
  return PROGRAMS.find((p) => p.id === id) || null;
}

// Every distinct exercise name a program references.
export function programExerciseNames(program) {
  return [...new Set((program?.schedule ?? []).flatMap((d) => d.exercises.map((e) => e.name)))];
}

/** The weekdays (0=Sun … 6=Sat) a program trains on. */
export function programDays(program) {
  return [...new Set((program?.schedule ?? []).map((d) => d.dayOfWeek).filter((d) => d != null))];
}

/**
 * Catalog name → id, built-in exercises first. A custom exercise that shares
 * a stock name ("Bench Press") used to win the lookup (last match wins), so a
 * program's bench day pointed at the custom row and its history.
 */
export function nameToIdMap(exercises) {
  const map = {};
  for (const e of exercises ?? []) if (e && !e.isCustom && !(e.name in map)) map[e.name] = e.id;
  for (const e of exercises ?? []) if (e?.isCustom && !(e.name in map)) map[e.name] = e.id;
  return map;
}

// Resolve a program into createTemplate-ready day payloads. `nameToId` maps a
// catalog exercise name → its id; names that don't resolve are skipped. Returns
// [{ name, dayOfWeek, progression, exercises: [{ exerciseId, targetSets,
// targetReps, targetWeight, weightStep }] }] — weightStep (kg) only where a lift
// steps differently from the program's scheme, null otherwise.
export function resolveProgram(program, nameToId = {}) {
  return (program?.schedule ?? []).map((day) => ({
    name: day.name,
    dayOfWeek: day.dayOfWeek ?? null,
    progression: program.progression,
    exercises: day.exercises
      .map((e) => ({
        exerciseId: nameToId[e.name],
        targetSets: e.sets,
        targetReps: e.reps,
        targetWeight: null,
        weightStep: e.step ?? null,
      }))
      .filter((e) => e.exerciseId != null),
  }));
}
