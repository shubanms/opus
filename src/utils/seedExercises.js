// Fallback exercise list used when the Wger API is unavailable.
// muscleGroup values match react-body-highlighter muscle keys.
const seed = [
  // Chest
  { name: 'Bench Press',            muscleGroup: 'chest',          equipment: 'barbell' },
  { name: 'Incline Bench Press',    muscleGroup: 'chest',          equipment: 'barbell' },
  { name: 'Decline Bench Press',    muscleGroup: 'chest',          equipment: 'barbell' },
  { name: 'Dumbbell Flye',          muscleGroup: 'chest',          equipment: 'dumbbell' },
  { name: 'Cable Crossover',        muscleGroup: 'chest',          equipment: 'cable' },
  { name: 'Push-Up',                muscleGroup: 'chest',          equipment: 'bodyweight' },
  { name: 'Chest Dip',              muscleGroup: 'chest',          equipment: 'bodyweight' },
  // Triceps
  { name: 'Tricep Dip',             muscleGroup: 'triceps',        equipment: 'bodyweight' },
  { name: 'Skull Crusher',          muscleGroup: 'triceps',        equipment: 'barbell' },
  { name: 'Tricep Pushdown',        muscleGroup: 'triceps',        equipment: 'cable' },
  { name: 'Overhead Tricep Ext.',   muscleGroup: 'triceps',        equipment: 'dumbbell' },
  { name: 'Close-Grip Bench Press', muscleGroup: 'triceps',        equipment: 'barbell' },
  { name: 'Diamond Push-Up',        muscleGroup: 'triceps',        equipment: 'bodyweight' },
  // Biceps
  { name: 'Barbell Curl',           muscleGroup: 'biceps',         equipment: 'barbell' },
  { name: 'Dumbbell Curl',          muscleGroup: 'biceps',         equipment: 'dumbbell' },
  { name: 'Hammer Curl',            muscleGroup: 'biceps',         equipment: 'dumbbell' },
  { name: 'Preacher Curl',          muscleGroup: 'biceps',         equipment: 'barbell' },
  { name: 'Cable Curl',             muscleGroup: 'biceps',         equipment: 'cable' },
  { name: 'Concentration Curl',     muscleGroup: 'biceps',         equipment: 'dumbbell' },
  // Front deltoids / Shoulders
  { name: 'Overhead Press',         muscleGroup: 'front-deltoids', equipment: 'barbell' },
  { name: 'Dumbbell Shoulder Press',muscleGroup: 'front-deltoids', equipment: 'dumbbell' },
  { name: 'Arnold Press',           muscleGroup: 'front-deltoids', equipment: 'dumbbell' },
  { name: 'Front Raise',            muscleGroup: 'front-deltoids', equipment: 'dumbbell' },
  { name: 'Lateral Raise',          muscleGroup: 'front-deltoids', equipment: 'dumbbell' },
  { name: 'Face Pull',              muscleGroup: 'back-deltoids',  equipment: 'cable' },
  { name: 'Reverse Flye',           muscleGroup: 'back-deltoids',  equipment: 'dumbbell' },
  // Upper back
  { name: 'Pull-Up',                muscleGroup: 'upper-back',     equipment: 'bodyweight' },
  { name: 'Chin-Up',                muscleGroup: 'upper-back',     equipment: 'bodyweight' },
  { name: 'Barbell Row',            muscleGroup: 'upper-back',     equipment: 'barbell' },
  { name: 'Dumbbell Row',           muscleGroup: 'upper-back',     equipment: 'dumbbell' },
  { name: 'Cable Row',              muscleGroup: 'upper-back',     equipment: 'cable' },
  { name: 'Lat Pulldown',           muscleGroup: 'upper-back',     equipment: 'cable' },
  { name: 'T-Bar Row',              muscleGroup: 'upper-back',     equipment: 'barbell' },
  { name: 'Chest-Supported Row',    muscleGroup: 'upper-back',     equipment: 'machine' },
  // Trapezius
  { name: 'Barbell Shrug',          muscleGroup: 'trapezius',      equipment: 'barbell' },
  { name: 'Dumbbell Shrug',         muscleGroup: 'trapezius',      equipment: 'dumbbell' },
  { name: 'Cable Shrug',            muscleGroup: 'trapezius',      equipment: 'cable' },
  // Lower back
  { name: 'Deadlift',               muscleGroup: 'lower-back',     equipment: 'barbell' },
  { name: 'Romanian Deadlift',      muscleGroup: 'lower-back',     equipment: 'barbell' },
  { name: 'Back Extension',         muscleGroup: 'lower-back',     equipment: 'bodyweight' },
  { name: 'Good Morning',           muscleGroup: 'lower-back',     equipment: 'barbell' },
  // Abs
  { name: 'Crunch',                 muscleGroup: 'abs',            equipment: 'bodyweight' },
  { name: 'Plank',                  muscleGroup: 'abs',            equipment: 'bodyweight' },
  { name: 'Hanging Leg Raise',      muscleGroup: 'abs',            equipment: 'bodyweight' },
  { name: 'Cable Crunch',           muscleGroup: 'abs',            equipment: 'cable' },
  { name: 'Ab Wheel Rollout',       muscleGroup: 'abs',            equipment: 'bodyweight' },
  { name: 'Sit-Up',                 muscleGroup: 'abs',            equipment: 'bodyweight' },
  // Obliques
  { name: 'Russian Twist',          muscleGroup: 'obliques',       equipment: 'bodyweight' },
  { name: 'Side Plank',             muscleGroup: 'obliques',       equipment: 'bodyweight' },
  { name: 'Oblique Crunch',         muscleGroup: 'obliques',       equipment: 'bodyweight' },
  { name: 'Cable Woodchop',         muscleGroup: 'obliques',       equipment: 'cable' },
  // Quadriceps
  { name: 'Back Squat',             muscleGroup: 'quadriceps',     equipment: 'barbell' },
  { name: 'Front Squat',            muscleGroup: 'quadriceps',     equipment: 'barbell' },
  { name: 'Leg Press',              muscleGroup: 'quadriceps',     equipment: 'machine' },
  { name: 'Hack Squat',             muscleGroup: 'quadriceps',     equipment: 'machine' },
  { name: 'Leg Extension',          muscleGroup: 'quadriceps',     equipment: 'machine' },
  { name: 'Bulgarian Split Squat',  muscleGroup: 'quadriceps',     equipment: 'dumbbell' },
  { name: 'Lunges',                 muscleGroup: 'quadriceps',     equipment: 'bodyweight' },
  // Hamstrings
  { name: 'Lying Leg Curl',         muscleGroup: 'hamstring',      equipment: 'machine' },
  { name: 'Seated Leg Curl',        muscleGroup: 'hamstring',      equipment: 'machine' },
  { name: 'Nordic Curl',            muscleGroup: 'hamstring',      equipment: 'bodyweight' },
  { name: 'Stiff-Leg Deadlift',     muscleGroup: 'hamstring',      equipment: 'barbell' },
  // Glutes
  { name: 'Hip Thrust',             muscleGroup: 'gluteal',        equipment: 'barbell' },
  { name: 'Glute Bridge',           muscleGroup: 'gluteal',        equipment: 'bodyweight' },
  { name: 'Cable Kickback',         muscleGroup: 'gluteal',        equipment: 'cable' },
  { name: 'Sumo Deadlift',          muscleGroup: 'gluteal',        equipment: 'barbell' },
  // Calves
  { name: 'Standing Calf Raise',    muscleGroup: 'calves',         equipment: 'machine' },
  { name: 'Seated Calf Raise',      muscleGroup: 'calves',         equipment: 'machine' },
  { name: 'Donkey Calf Raise',      muscleGroup: 'calves',         equipment: 'bodyweight' },
  // Forearms
  { name: 'Wrist Curl',             muscleGroup: 'forearm',        equipment: 'barbell' },
  { name: 'Reverse Wrist Curl',     muscleGroup: 'forearm',        equipment: 'barbell' },
  { name: "Farmer's Walk",          muscleGroup: 'forearm',        equipment: 'dumbbell' },
];

export default seed.map((e, i) => ({
  ...e,
  id: i + 1,
  secondaryMuscles: [],
  description: '',
  isCustom: false,
  wgerId: null,
}));
