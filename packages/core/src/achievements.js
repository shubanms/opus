// Data-driven achievements — framework-agnostic. `test(stats)` decides unlock;
// `xp` is the reward; `hidden` keeps title/desc secret until earned.
// The web util (src/utils/achievements.js) wraps these with Dexie reads/writes;
// here `computeStats` takes already-loaded rows so web + native share the math.

export const ACHIEVEMENTS = [
  { key: 'first',      title: 'First Rep',       desc: 'Complete your first workout',     xp: 50,   test: (s) => s.workouts >= 1 },
  { key: 'w10',        title: 'Getting Serious', desc: 'Complete 10 workouts',            xp: 100,  test: (s) => s.workouts >= 10 },
  { key: 'w50',        title: 'Devoted',         desc: 'Complete 50 workouts',            xp: 250,  test: (s) => s.workouts >= 50 },
  { key: 'w100',       title: 'Centurion',       desc: 'Complete 100 workouts',           xp: 500,  test: (s) => s.workouts >= 100 },
  { key: 'streak7',    title: 'Week Warrior',    desc: 'Reach a 7-day training streak',   xp: 100,  test: (s) => s.bestStreak >= 7 },
  { key: 'streak30',   title: 'Unbreakable',     desc: 'Reach a 30-day training streak',  xp: 400,  test: (s) => s.bestStreak >= 30 },
  { key: 'vol10k',     title: 'Ten Tonne',       desc: 'Lift 10,000 kg in total',         xp: 100,  test: (s) => s.totalVolume >= 10000 },
  { key: 'vol100k',    title: 'Heavy Hitter',    desc: 'Lift 100,000 kg in total',        xp: 300,  test: (s) => s.totalVolume >= 100000 },
  { key: 'vol1m',      title: 'Million Club',    desc: 'Lift 1,000,000 kg in total',      xp: 1000, test: (s) => s.totalVolume >= 1000000, hidden: true },
  { key: 'sets100',    title: 'Set Machine',     desc: 'Log 100 working sets',            xp: 100,  test: (s) => s.totalSets >= 100 },
  { key: 'sets1000',   title: 'Relentless',      desc: 'Log 1,000 working sets',          xp: 400,  test: (s) => s.totalSets >= 1000 },
  { key: 'allMuscles', title: 'Well Rounded',    desc: 'Train all 15 muscle groups',      xp: 200,  test: (s) => s.muscleVariety >= 15 },
  { key: 'pr10',       title: 'Record Breaker',  desc: 'Set 10 personal records',         xp: 150,  test: (s) => s.prCount >= 10 },
  { key: 'pr50',       title: 'Peak Performer',  desc: 'Set 50 personal records',         xp: 400,  test: (s) => s.prCount >= 50 },
  { key: 'level5',     title: 'Forged',          desc: 'Reach level 5',                   xp: 0,    test: (s) => s.level >= 5 },
  { key: 'level10',    title: 'Magnum Opus',     desc: 'Reach level 10',                  xp: 0,    test: (s) => s.level >= 10 },
  { key: 'earlyBird',  title: 'Early Bird',      desc: 'Finish a workout before 7am',     xp: 75,   test: (s) => s.earlyBird, hidden: true },
  { key: 'nightOwl',   title: 'Night Owl',       desc: 'Finish a workout after 9pm',      xp: 75,   test: (s) => s.nightOwl, hidden: true },
  { key: 'architect',  title: 'Architect',       desc: 'Create a custom exercise',        xp: 50,   test: (s) => s.customExercises >= 1, hidden: true },
];

export const ACHIEVEMENT_BY_KEY = Object.fromEntries(ACHIEVEMENTS.map((a) => [a.key, a]));

// Lifetime aggregates used by achievement predicates. Inputs are plain rows:
//   workouts:  [{ date, totalVolume, totalSets, createdAt }]
//   sets:      [{ exerciseId, isWarmup }]   (warmups are filtered out here)
//   prs:       [ ... ]                       (length = PR count)
//   exercises: [{ id, muscleGroup, isCustom }]
//   level:     number (defaults 1)
export function computeStats({ workouts = [], sets = [], prs = [], exercises = [], level = 1 } = {}) {
  const working = sets.filter((s) => !s.isWarmup);
  const totalVolume = workouts.reduce((a, w) => a + (w.totalVolume || 0), 0);
  const totalSets = workouts.reduce((a, w) => a + (w.totalSets || 0), 0);

  const dates = [...new Set(workouts.map((w) => w.date))].sort();
  let bestStreak = 0, run = 0, prev = null;
  for (const d of dates) {
    run = prev && Math.round((new Date(d) - new Date(prev)) / 86400000) === 1 ? run + 1 : 1;
    bestStreak = Math.max(bestStreak, run);
    prev = d;
  }

  const exMuscle = Object.fromEntries(exercises.map((e) => [e.id, e.muscleGroup]));
  const muscles = new Set(working.map((s) => exMuscle[s.exerciseId]).filter(Boolean));
  const hours = workouts.map((w) => new Date(w.createdAt ?? 0).getHours());

  return {
    workouts: workouts.length,
    totalVolume,
    totalSets,
    bestStreak,
    muscleVariety: muscles.size,
    prCount: prs.length,
    level: level ?? 1,
    earlyBird: workouts.some((w, i) => w.createdAt != null && hours[i] < 7),
    nightOwl: workouts.some((w, i) => w.createdAt != null && hours[i] >= 21),
    customExercises: exercises.filter((e) => e.isCustom).length,
  };
}

// Achievement defs whose condition currently holds.
export function earned(stats) {
  return ACHIEVEMENTS.filter((a) => a.test(stats));
}

// Newly-earned defs: those that pass now and aren't already unlocked.
export function newlyUnlocked(stats, unlockedKeys = []) {
  const have = unlockedKeys instanceof Set ? unlockedKeys : new Set(unlockedKeys);
  return ACHIEVEMENTS.filter((a) => !have.has(a.key) && a.test(stats));
}

// Unlocked keys whose condition no longer holds (re-lock these on delete so XP
// reverts). Unknown keys (removed defs) are also returned for cleanup.
export function staleKeys(stats, unlockedKeys = []) {
  const keys = unlockedKeys instanceof Set ? [...unlockedKeys] : unlockedKeys;
  return keys.filter((k) => {
    const def = ACHIEVEMENT_BY_KEY[k];
    return !def || !def.test(stats);
  });
}

// Sum of XP for a list of achievement defs.
export function xpFor(defs) {
  return (defs || []).reduce((sum, a) => sum + (a.xp || 0), 0);
}
