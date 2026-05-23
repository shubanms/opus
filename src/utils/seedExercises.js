// Curated exercise list — covers all 15 muscle groups with the movements people actually use.
// difficulty: 'beginner' | 'intermediate' | 'advanced'
const seed = [
  // ── Chest ─────────────────────────────────────────────────────────────────
  { name: 'Push-Up',                muscleGroup: 'chest',          equipment: 'bodyweight', difficulty: 'beginner'     },
  { name: 'Dumbbell Flye',          muscleGroup: 'chest',          equipment: 'dumbbell',   difficulty: 'beginner'     },
  { name: 'Bench Press',            muscleGroup: 'chest',          equipment: 'barbell',    difficulty: 'intermediate' },
  { name: 'Incline Bench Press',    muscleGroup: 'chest',          equipment: 'barbell',    difficulty: 'intermediate' },
  { name: 'Dumbbell Bench Press',   muscleGroup: 'chest',          equipment: 'dumbbell',   difficulty: 'intermediate' },
  { name: 'Decline Bench Press',    muscleGroup: 'chest',          equipment: 'barbell',    difficulty: 'intermediate' },
  { name: 'Cable Crossover',        muscleGroup: 'chest',          equipment: 'cable',      difficulty: 'intermediate' },
  { name: 'Chest Dip',              muscleGroup: 'chest',          equipment: 'bodyweight', difficulty: 'advanced'     },

  // ── Triceps ───────────────────────────────────────────────────────────────
  { name: 'Diamond Push-Up',        muscleGroup: 'triceps',        equipment: 'bodyweight', difficulty: 'beginner'     },
  { name: 'Overhead Tricep Ext.',   muscleGroup: 'triceps',        equipment: 'dumbbell',   difficulty: 'beginner'     },
  { name: 'Tricep Pushdown',        muscleGroup: 'triceps',        equipment: 'cable',      difficulty: 'beginner'     },
  { name: 'Close-Grip Bench Press', muscleGroup: 'triceps',        equipment: 'barbell',    difficulty: 'intermediate' },
  { name: 'Skull Crusher',          muscleGroup: 'triceps',        equipment: 'barbell',    difficulty: 'intermediate' },
  { name: 'Tricep Dip',             muscleGroup: 'triceps',        equipment: 'bodyweight', difficulty: 'intermediate' },

  // ── Biceps ────────────────────────────────────────────────────────────────
  { name: 'Dumbbell Curl',          muscleGroup: 'biceps',         equipment: 'dumbbell',   difficulty: 'beginner'     },
  { name: 'Hammer Curl',            muscleGroup: 'biceps',         equipment: 'dumbbell',   difficulty: 'beginner'     },
  { name: 'Concentration Curl',     muscleGroup: 'biceps',         equipment: 'dumbbell',   difficulty: 'beginner'     },
  { name: 'Barbell Curl',           muscleGroup: 'biceps',         equipment: 'barbell',    difficulty: 'intermediate' },
  { name: 'Preacher Curl',          muscleGroup: 'biceps',         equipment: 'barbell',    difficulty: 'intermediate' },
  { name: 'Cable Curl',             muscleGroup: 'biceps',         equipment: 'cable',      difficulty: 'intermediate' },

  // ── Front Deltoids / Shoulders ────────────────────────────────────────────
  { name: 'Lateral Raise',          muscleGroup: 'front-deltoids', equipment: 'dumbbell',   difficulty: 'beginner'     },
  { name: 'Front Raise',            muscleGroup: 'front-deltoids', equipment: 'dumbbell',   difficulty: 'beginner'     },
  { name: 'Dumbbell Shoulder Press',muscleGroup: 'front-deltoids', equipment: 'dumbbell',   difficulty: 'intermediate' },
  { name: 'Arnold Press',           muscleGroup: 'front-deltoids', equipment: 'dumbbell',   difficulty: 'intermediate' },
  { name: 'Overhead Press',         muscleGroup: 'front-deltoids', equipment: 'barbell',    difficulty: 'advanced'     },

  // ── Rear Deltoids ─────────────────────────────────────────────────────────
  { name: 'Reverse Flye',           muscleGroup: 'back-deltoids',  equipment: 'dumbbell',   difficulty: 'beginner'     },
  { name: 'Face Pull',              muscleGroup: 'back-deltoids',  equipment: 'cable',      difficulty: 'beginner'     },
  { name: 'Rear Delt Row',          muscleGroup: 'back-deltoids',  equipment: 'dumbbell',   difficulty: 'intermediate' },

  // ── Upper Back ────────────────────────────────────────────────────────────
  { name: 'Cable Row',              muscleGroup: 'upper-back',     equipment: 'cable',      difficulty: 'beginner'     },
  { name: 'Dumbbell Row',           muscleGroup: 'upper-back',     equipment: 'dumbbell',   difficulty: 'beginner'     },
  { name: 'Lat Pulldown',           muscleGroup: 'upper-back',     equipment: 'cable',      difficulty: 'beginner'     },
  { name: 'Chest-Supported Row',    muscleGroup: 'upper-back',     equipment: 'machine',    difficulty: 'beginner'     },
  { name: 'Barbell Row',            muscleGroup: 'upper-back',     equipment: 'barbell',    difficulty: 'intermediate' },
  { name: 'Pull-Up',                muscleGroup: 'upper-back',     equipment: 'bodyweight', difficulty: 'intermediate' },
  { name: 'Chin-Up',                muscleGroup: 'upper-back',     equipment: 'bodyweight', difficulty: 'intermediate' },
  { name: 'T-Bar Row',              muscleGroup: 'upper-back',     equipment: 'barbell',    difficulty: 'advanced'     },

  // ── Trapezius ─────────────────────────────────────────────────────────────
  { name: 'Dumbbell Shrug',         muscleGroup: 'trapezius',      equipment: 'dumbbell',   difficulty: 'beginner'     },
  { name: 'Cable Shrug',            muscleGroup: 'trapezius',      equipment: 'cable',      difficulty: 'beginner'     },
  { name: 'Barbell Shrug',          muscleGroup: 'trapezius',      equipment: 'barbell',    difficulty: 'intermediate' },

  // ── Lower Back ────────────────────────────────────────────────────────────
  { name: 'Back Extension',         muscleGroup: 'lower-back',     equipment: 'bodyweight', difficulty: 'beginner'     },
  { name: 'Romanian Deadlift',      muscleGroup: 'lower-back',     equipment: 'barbell',    difficulty: 'intermediate' },
  { name: 'Good Morning',           muscleGroup: 'lower-back',     equipment: 'barbell',    difficulty: 'intermediate' },
  { name: 'Deadlift',               muscleGroup: 'lower-back',     equipment: 'barbell',    difficulty: 'advanced'     },

  // ── Abs ───────────────────────────────────────────────────────────────────
  { name: 'Crunch',                 muscleGroup: 'abs',            equipment: 'bodyweight', difficulty: 'beginner'     },
  { name: 'Sit-Up',                 muscleGroup: 'abs',            equipment: 'bodyweight', difficulty: 'beginner'     },
  { name: 'Plank',                  muscleGroup: 'abs',            equipment: 'bodyweight', difficulty: 'beginner'     },
  { name: 'Cable Crunch',           muscleGroup: 'abs',            equipment: 'cable',      difficulty: 'intermediate' },
  { name: 'Hanging Leg Raise',      muscleGroup: 'abs',            equipment: 'bodyweight', difficulty: 'intermediate' },
  { name: 'Ab Wheel Rollout',       muscleGroup: 'abs',            equipment: 'bodyweight', difficulty: 'advanced'     },

  // ── Obliques ──────────────────────────────────────────────────────────────
  { name: 'Side Plank',             muscleGroup: 'obliques',       equipment: 'bodyweight', difficulty: 'beginner'     },
  { name: 'Oblique Crunch',         muscleGroup: 'obliques',       equipment: 'bodyweight', difficulty: 'beginner'     },
  { name: 'Russian Twist',          muscleGroup: 'obliques',       equipment: 'bodyweight', difficulty: 'intermediate' },
  { name: 'Cable Woodchop',         muscleGroup: 'obliques',       equipment: 'cable',      difficulty: 'intermediate' },

  // ── Quadriceps ────────────────────────────────────────────────────────────
  { name: 'Leg Press',              muscleGroup: 'quadriceps',     equipment: 'machine',    difficulty: 'beginner'     },
  { name: 'Leg Extension',          muscleGroup: 'quadriceps',     equipment: 'machine',    difficulty: 'beginner'     },
  { name: 'Lunges',                 muscleGroup: 'quadriceps',     equipment: 'bodyweight', difficulty: 'beginner'     },
  { name: 'Bulgarian Split Squat',  muscleGroup: 'quadriceps',     equipment: 'dumbbell',   difficulty: 'intermediate' },
  { name: 'Hack Squat',             muscleGroup: 'quadriceps',     equipment: 'machine',    difficulty: 'intermediate' },
  { name: 'Back Squat',             muscleGroup: 'quadriceps',     equipment: 'barbell',    difficulty: 'advanced'     },
  { name: 'Front Squat',            muscleGroup: 'quadriceps',     equipment: 'barbell',    difficulty: 'advanced'     },

  // ── Hamstrings ────────────────────────────────────────────────────────────
  { name: 'Lying Leg Curl',         muscleGroup: 'hamstring',      equipment: 'machine',    difficulty: 'beginner'     },
  { name: 'Seated Leg Curl',        muscleGroup: 'hamstring',      equipment: 'machine',    difficulty: 'beginner'     },
  { name: 'Stiff-Leg Deadlift',     muscleGroup: 'hamstring',      equipment: 'barbell',    difficulty: 'intermediate' },
  { name: 'Nordic Curl',            muscleGroup: 'hamstring',      equipment: 'bodyweight', difficulty: 'advanced'     },

  // ── Glutes ────────────────────────────────────────────────────────────────
  { name: 'Glute Bridge',           muscleGroup: 'gluteal',        equipment: 'bodyweight', difficulty: 'beginner'     },
  { name: 'Cable Kickback',         muscleGroup: 'gluteal',        equipment: 'cable',      difficulty: 'beginner'     },
  { name: 'Hip Thrust',             muscleGroup: 'gluteal',        equipment: 'barbell',    difficulty: 'intermediate' },
  { name: 'Sumo Deadlift',          muscleGroup: 'gluteal',        equipment: 'barbell',    difficulty: 'advanced'     },

  // ── Calves ────────────────────────────────────────────────────────────────
  { name: 'Seated Calf Raise',      muscleGroup: 'calves',         equipment: 'machine',    difficulty: 'beginner'     },
  { name: 'Standing Calf Raise',    muscleGroup: 'calves',         equipment: 'machine',    difficulty: 'beginner'     },
  { name: 'Donkey Calf Raise',      muscleGroup: 'calves',         equipment: 'bodyweight', difficulty: 'intermediate' },

  // ── Forearms ──────────────────────────────────────────────────────────────
  { name: 'Wrist Curl',             muscleGroup: 'forearm',        equipment: 'barbell',    difficulty: 'beginner'     },
  { name: 'Reverse Wrist Curl',     muscleGroup: 'forearm',        equipment: 'barbell',    difficulty: 'beginner'     },
  { name: "Farmer's Walk",          muscleGroup: 'forearm',        equipment: 'dumbbell',   difficulty: 'intermediate' },
];

export default seed.map((e, i) => ({
  ...e,
  id: i + 1,
  secondaryMuscles: [],
  description: '',
  isCustom: false,
  wgerId: null,
}));
