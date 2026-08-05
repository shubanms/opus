import { db } from '../db/db.js';

// Data-driven achievements.
//
// Threshold achievements declare the stat and the number they need; their
// `test` is derived from that pair. Two reasons, both of which bit us: the
// number lived in the description *and* in a hand-written predicate, so they
// could drift apart silently — and with the target locked inside a closure,
// nothing could show how close you were. A list of things you cannot see
// yourself approaching is just a list.
//
// `hidden` keeps the title/desc secret until earned (game-style). Achievements
// with no numeric scale (Early Bird, Night Owl) keep an explicit `test` and
// simply have no progress to show.
const at = (metric, target) => ({
  metric,
  target,
  test: (s) => (s?.[metric] ?? 0) >= target,
});

export const ACHIEVEMENTS = [
  { key: 'first',      title: 'First Rep',       desc: 'Complete your first workout',     xp: 50,   ...at('workouts', 1) },
  { key: 'w10',        title: 'Getting Serious', desc: 'Complete 10 workouts',            xp: 100,  ...at('workouts', 10) },
  { key: 'w50',        title: 'Devoted',         desc: 'Complete 50 workouts',            xp: 250,  ...at('workouts', 50) },
  { key: 'w100',       title: 'Centurion',       desc: 'Complete 100 workouts',           xp: 500,  ...at('workouts', 100) },
  { key: 'streak7',    title: 'Week Warrior',    desc: 'Reach a 7-day training streak',   xp: 100,  ...at('bestStreak', 7) },
  { key: 'streak30',   title: 'Unbreakable',     desc: 'Reach a 30-day training streak',  xp: 400,  ...at('bestStreak', 30) },
  { key: 'vol10k',     title: 'Ten Tonne',       desc: 'Lift 10,000 kg in total',         xp: 100,  ...at('totalVolume', 10000) },
  { key: 'vol100k',    title: 'Heavy Hitter',    desc: 'Lift 100,000 kg in total',        xp: 300,  ...at('totalVolume', 100000) },
  { key: 'vol1m',      title: 'Million Club',    desc: 'Lift 1,000,000 kg in total',      xp: 1000, ...at('totalVolume', 1000000), hidden: true },
  { key: 'sets100',    title: 'Set Machine',     desc: 'Log 100 working sets',            xp: 100,  ...at('totalSets', 100) },
  { key: 'sets1000',   title: 'Relentless',      desc: 'Log 1,000 working sets',          xp: 400,  ...at('totalSets', 1000) },
  { key: 'allMuscles', title: 'Well Rounded',    desc: 'Train all 15 muscle groups',      xp: 200,  ...at('muscleVariety', 15) },
  { key: 'pr10',       title: 'Record Breaker',  desc: 'Set 10 personal records',         xp: 150,  ...at('prCount', 10) },
  { key: 'pr50',       title: 'Peak Performer',  desc: 'Set 50 personal records',         xp: 400,  ...at('prCount', 50) },
  { key: 'level5',     title: 'Forged',          desc: 'Reach level 5',                   xp: 0,    ...at('level', 5) },
  { key: 'level10',    title: 'Magnum Opus',     desc: 'Reach level 10',                  xp: 0,    ...at('level', 10) },
  { key: 'earlyBird',  title: 'Early Bird',      desc: 'Finish a workout before 7am',     xp: 75,   test: (s) => Boolean(s?.earlyBird), hidden: true },
  { key: 'nightOwl',   title: 'Night Owl',       desc: 'Finish a workout after 9pm',      xp: 75,   test: (s) => Boolean(s?.nightOwl), hidden: true },
  { key: 'architect',  title: 'Architect',       desc: 'Create a custom exercise',        xp: 50,   ...at('customExercises', 1), hidden: true },
];

/**
 * How close a locked achievement is, or `null` if it has no numeric scale.
 *
 * `current` is capped at `target` so a finished one never reads "127 / 100",
 * which looks like a bug rather than an overachievement.
 */
export function achievementProgress(def, stats) {
  if (!def?.metric) return null;
  const target = def.target > 0 ? def.target : 1;
  const raw = Number(stats?.[def.metric]);
  const current = Number.isFinite(raw) && raw > 0 ? Math.min(raw, target) : 0;
  return { current, target, ratio: current / target };
}

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
