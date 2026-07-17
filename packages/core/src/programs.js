// Classic bundled training programs. Pure data + a resolver. Each program is a
// week of day-routines using catalog exercise names, with a progression scheme
// so installed routines auto-advance (see utils/progression.js). Installing a
// program creates normal routines (fully editable/deletable). Unit-tested to
// guarantee every exercise name resolves to the seeded catalog.

const linear = { mode: 'linear', weightStep: 2.5, deloadAfterMisses: 3 };
const linearDL = { mode: 'linear', weightStep: 5, deloadAfterMisses: 3 };
const dbl = { mode: 'double', weightStep: 2.5, deloadAfterMisses: 3 };

export const PROGRAMS = [
  {
    id: 'stronglifts_5x5',
    name: 'StrongLifts 5×5',
    desc: 'The classic beginner barbell program — two alternating full-body days, add weight every session.',
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
        { name: 'Deadlift', sets: 1, reps: 5 },
      ] },
      { name: 'Workout A (wk2)', dayOfWeek: 5, exercises: [
        { name: 'Back Squat', sets: 5, reps: 5 },
        { name: 'Bench Press', sets: 5, reps: 5 },
        { name: 'Barbell Row', sets: 5, reps: 5 },
      ] },
    ],
  },
  {
    id: 'gzclp',
    name: 'GZCLP',
    desc: 'Linear progression with tiered rep schemes — a step up from 5×5 for steady intermediate gains.',
    level: 'Beginner–Int', daysPerWeek: 4, progression: linear,
    schedule: [
      { name: 'Day 1 · Squat', dayOfWeek: 1, exercises: [
        { name: 'Back Squat', sets: 5, reps: 3 },
        { name: 'Bench Press', sets: 3, reps: 10 },
        { name: 'Lat Pulldown', sets: 3, reps: 15 },
      ] },
      { name: 'Day 2 · OHP', dayOfWeek: 2, exercises: [
        { name: 'Overhead Press', sets: 5, reps: 3 },
        { name: 'Deadlift', sets: 3, reps: 10 },
        { name: 'Cable Row', sets: 3, reps: 15 },
      ] },
      { name: 'Day 3 · Bench', dayOfWeek: 4, exercises: [
        { name: 'Bench Press', sets: 5, reps: 3 },
        { name: 'Back Squat', sets: 3, reps: 10 },
        { name: 'Lat Pulldown', sets: 3, reps: 15 },
      ] },
      { name: 'Day 4 · Deadlift', dayOfWeek: 5, exercises: [
        { name: 'Deadlift', sets: 5, reps: 3 },
        { name: 'Overhead Press', sets: 3, reps: 10 },
        { name: 'Cable Row', sets: 3, reps: 15 },
      ] },
    ],
  },
  {
    id: 'ppl',
    name: 'Push / Pull / Legs',
    desc: 'A high-volume 6-day hypertrophy split — push, pull and legs twice each week.',
    level: 'Intermediate', daysPerWeek: 6, progression: dbl,
    schedule: [
      { name: 'Push', dayOfWeek: 1, exercises: [
        { name: 'Bench Press', sets: 4, reps: 8 },
        { name: 'Overhead Press', sets: 3, reps: 10 },
        { name: 'Incline Bench Press', sets: 3, reps: 10 },
        { name: 'Lateral Raise', sets: 3, reps: 15 },
        { name: 'Tricep Pushdown', sets: 3, reps: 12 },
      ] },
      { name: 'Pull', dayOfWeek: 2, exercises: [
        { name: 'Deadlift', sets: 3, reps: 6 },
        { name: 'Barbell Row', sets: 4, reps: 8 },
        { name: 'Lat Pulldown', sets: 3, reps: 12 },
        { name: 'Face Pull', sets: 3, reps: 15 },
        { name: 'Barbell Curl', sets: 3, reps: 12 },
      ] },
      { name: 'Legs', dayOfWeek: 3, exercises: [
        { name: 'Back Squat', sets: 4, reps: 8 },
        { name: 'Romanian Deadlift', sets: 3, reps: 10 },
        { name: 'Leg Press', sets: 3, reps: 12 },
        { name: 'Lying Leg Curl', sets: 3, reps: 12 },
        { name: 'Standing Calf Raise', sets: 4, reps: 15 },
      ] },
    ],
  },
  {
    id: 'upper_lower',
    name: 'Upper / Lower',
    desc: 'A balanced 4-day split hitting each half of the body twice — strength up top, size down low.',
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
        { name: 'Back Squat', sets: 4, reps: 6 },
        { name: 'Romanian Deadlift', sets: 3, reps: 8 },
        { name: 'Leg Press', sets: 3, reps: 12 },
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
        { name: 'Deadlift', sets: 4, reps: 5 },
        { name: 'Front Squat', sets: 3, reps: 8 },
        { name: 'Hip Thrust', sets: 3, reps: 12 },
        { name: 'Seated Leg Curl', sets: 3, reps: 12 },
        { name: 'Seated Calf Raise', sets: 4, reps: 15 },
      ] },
    ],
  },
  {
    id: 'five_three_one',
    name: '5/3/1 for Beginners',
    desc: "Wendler's percentage-based classic — four main lifts, slow and sustainable strength.",
    level: 'Int–Adv', daysPerWeek: 4, progression: linearDL,
    schedule: [
      { name: 'Press Day', dayOfWeek: 1, exercises: [
        { name: 'Overhead Press', sets: 5, reps: 5 },
        { name: 'Chin-Up', sets: 3, reps: 10 },
        { name: 'Tricep Dip', sets: 3, reps: 12 },
      ] },
      { name: 'Deadlift Day', dayOfWeek: 2, exercises: [
        { name: 'Deadlift', sets: 5, reps: 5 },
        { name: 'Good Morning', sets: 3, reps: 10 },
        { name: 'Hanging Leg Raise', sets: 3, reps: 12 },
      ] },
      { name: 'Bench Day', dayOfWeek: 4, exercises: [
        { name: 'Bench Press', sets: 5, reps: 5 },
        { name: 'Dumbbell Row', sets: 3, reps: 10 },
        { name: 'Dumbbell Curl', sets: 3, reps: 12 },
      ] },
      { name: 'Squat Day', dayOfWeek: 5, exercises: [
        { name: 'Back Squat', sets: 5, reps: 5 },
        { name: 'Leg Press', sets: 3, reps: 10 },
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

// Resolve a program into createTemplate-ready day payloads. `nameToId` maps a
// catalog exercise name → its id; names that don't resolve are skipped. Returns
// [{ name, dayOfWeek, progression, exercises: [{ exerciseId, targetSets, targetReps, targetWeight }] }].
export function resolveProgram(program, nameToId = {}) {
  return (program?.schedule ?? []).map((day) => ({
    name: day.name,
    dayOfWeek: day.dayOfWeek ?? null,
    progression: program.progression,
    exercises: day.exercises
      .map((e) => ({ exerciseId: nameToId[e.name], targetSets: e.sets, targetReps: e.reps, targetWeight: null }))
      .filter((e) => e.exerciseId != null),
  }));
}
