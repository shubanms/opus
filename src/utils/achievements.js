import { db } from '../db/db.js';

// Data-driven achievements. `test(stats)` decides unlock; `xp` is the reward;
// `hidden` keeps the title/desc secret until earned (game-style).
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

// Lifetime aggregates used by achievement predicates.
export async function computeStats() {
  const workouts = await db.workouts.toArray();
  const sets = (await db.sets.toArray()).filter((s) => !s.isWarmup);
  const prs = await db.prs.toArray();
  const exercises = await db.exercises.toArray();
  const profile = await db.userProfile.get(1);

  const totalVolume = workouts.reduce((a, w) => a + (w.totalVolume || 0), 0);
  const totalSets = workouts.reduce((a, w) => a + (w.totalSets || 0), 0);

  const dates = [...new Set(workouts.map((w) => w.date))].sort();
  let bestStreak = 0, run = 0, prev = null;
  for (const d of dates) {
    run = prev && (new Date(d) - new Date(prev)) / 86400000 === 1 ? run + 1 : 1;
    bestStreak = Math.max(bestStreak, run);
    prev = d;
  }

  const exMuscle = Object.fromEntries(exercises.map((e) => [e.id, e.muscleGroup]));
  const muscles = new Set(sets.map((s) => exMuscle[s.exerciseId]).filter(Boolean));
  const hours = workouts.map((w) => new Date(w.createdAt ?? Date.now()).getHours());

  return {
    workouts: workouts.length,
    totalVolume,
    totalSets,
    bestStreak,
    muscleVariety: muscles.size,
    prCount: prs.length,
    level: profile?.level ?? 1,
    earlyBird: hours.some((h) => h < 7),
    nightOwl: hours.some((h) => h >= 21),
    customExercises: exercises.filter((e) => e.isCustom).length,
  };
}

// Unlocks any newly-earned achievements, awards their XP, returns the new ones.
export async function checkAchievements() {
  const stats = await computeStats();
  const unlocked = new Set((await db.achievements.toArray()).map((a) => a.key));
  const newly = [];
  for (const a of ACHIEVEMENTS) {
    if (!unlocked.has(a.key) && a.test(stats)) {
      await db.achievements.add({ key: a.key, unlockedAt: Date.now() });
      newly.push(a);
    }
  }
  const xp = newly.reduce((sum, a) => sum + (a.xp || 0), 0);
  if (xp > 0) {
    const { default: useUserStore } = await import('../store/userStore.js');
    await useUserStore.getState().addXP(xp);
  }
  return newly;
}

// Re-locks achievements whose conditions no longer hold (e.g. after a workout
// is deleted), so XP fully reverts. Profile XP is recomputed by the caller.
export async function reconcileAchievements() {
  const stats = await computeStats();
  const byKey = Object.fromEntries(ACHIEVEMENTS.map((a) => [a.key, a]));
  const rows = await db.achievements.toArray();
  for (const row of rows) {
    const def = byKey[row.key];
    if (!def || !def.test(stats)) await db.achievements.delete(row.id);
  }
}
