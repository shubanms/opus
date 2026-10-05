import { db } from '../db/db.js';
import { todayKey } from './dateKey.js';
import { fmtVolume } from './units.js';
import { bestDayRun, graceDays, streakState } from './streak.js';
import { bestScheduleRun, planDays, scheduleStreak } from './scheduleStreak.js';

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
//
// Titles must not reuse a rank, quest or boss name: "Forged" was a level-5
// badge *and* the level 26–30 rank, so "you unlocked Forged" at level 5 read as
// a promotion you had not earned. Keys never change — unlocked rows reference
// them — only the words people see.
//
// Streak copy says "a streak of N", not "an N-day streak": with a weekly plan
// the streak counts sessions hit, and a Mon/Wed/Fri lifter never has seven
// consecutive days to show for seven perfect sessions.
const at = (metric, target) => ({
  metric,
  target,
  test: (s) => (s?.[metric] ?? 0) >= target,
});

export const ACHIEVEMENTS = [
  { key: 'first',      title: 'Day One',         desc: 'Complete your first workout',     xp: 50,   ...at('workouts', 1) },
  { key: 'w10',        title: 'Getting Serious', desc: 'Complete 10 workouts',            xp: 100,  ...at('workouts', 10) },
  { key: 'w50',        title: 'Devoted',         desc: 'Complete 50 workouts',            xp: 250,  ...at('workouts', 50) },
  { key: 'w100',       title: 'Centurion',       desc: 'Complete 100 workouts',           xp: 500,  ...at('workouts', 100) },
  { key: 'streak7',    title: 'Week Warrior',    desc: 'Keep a streak of 7',              xp: 100,  ...at('bestStreak', 7) },
  { key: 'streak30',   title: 'Unbreakable',     desc: 'Keep a streak of 30',             xp: 400,  ...at('bestStreak', 30) },
  { key: 'vol10k',     title: 'Ten Tonne',       desc: 'Lift 10,000 kg in total',         xp: 100,  ...at('totalVolume', 10000) },
  { key: 'vol100k',    title: 'Heavy Hitter',    desc: 'Lift 100,000 kg in total',        xp: 300,  ...at('totalVolume', 100000) },
  { key: 'vol1m',      title: 'Million Club',    desc: 'Lift 1,000,000 kg in total',      xp: 1000, ...at('totalVolume', 1000000), hidden: true },
  { key: 'sets100',    title: 'Set Machine',     desc: 'Log 100 working sets',            xp: 100,  ...at('totalSets', 100) },
  { key: 'sets1000',   title: 'Workhorse',       desc: 'Log 1,000 working sets',          xp: 400,  ...at('totalSets', 1000) },
  { key: 'allMuscles', title: 'Head to Toe',     desc: 'Train all 15 muscle groups',      xp: 200,  ...at('muscleVariety', 15) },
  { key: 'pr10',       title: 'Record Breaker',  desc: 'Set 10 personal records',         xp: 150,  ...at('prCount', 10) },
  { key: 'pr50',       title: 'Peak Performer',  desc: 'Set 50 personal records',         xp: 400,  ...at('prCount', 50) },
  { key: 'level5',     title: 'Climber',         desc: 'Reach level 5',                   xp: 0,    ...at('level', 5) },
  { key: 'level10',    title: 'Double Digits',   desc: 'Reach level 10',                  xp: 0,    ...at('level', 10) },
  { key: 'earlyBird',  title: 'Early Bird',      desc: 'Finish a workout before 7am',     xp: 75,   test: (s) => Boolean(s?.earlyBird), hidden: true },
  { key: 'nightOwl',   title: 'Night Owl',       desc: 'Finish a workout after 9pm',      xp: 75,   test: (s) => Boolean(s?.nightOwl), hidden: true },
  { key: 'architect',  title: 'Architect',       desc: 'Create a custom exercise',        xp: 50,   ...at('customExercises', 1), hidden: true },
];

/**
 * An achievement's description in the lifter's unit. Volume targets are
 * declared (and tested) in kg; a lbs user should read them in lbs.
 */
export function achievementDesc(def, unit = 'kg') {
  if (!def) return '';
  if (def.metric === 'totalVolume') return `Lift ${fmtVolume(def.target, unit)} in total`;
  return def.desc;
}

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

/**
 * The best streak ever held — the one number every "best streak" reads.
 *
 * The live streak is schedule-aware (sessions hit on a weekly plan) while the
 * best used to count consecutive calendar days, so the two disagreed for
 * everyone who rests on purpose: a Mon/Wed/Fri lifter could show a live streak
 * of 7 beside a best of 1, never unlock Week Warrior, and stay sealed at level
 * 20 behind a streak gate their own plan made impossible.
 *
 * So the best is the larger of the two definitions, and never below the live
 * count — a best smaller than the streak you are standing on is a contradiction
 * on the same screen. Days bought back with rest tokens count, the same way
 * they count for the live streak.
 *
 * Pure: `computeStats` gathers the inputs.
 */
export function bestStreakOf({ dates = [], plan = null, profile = null, today = todayKey() } = {}) {
  const credited = profile?.creditedDays ?? [];
  // Bridges: sessions credited on a plan, plus the gaps day-streak rescues
  // paid for — kept on the profile (`bridgedDays`) because the grace itself is
  // forgotten at the next workout, and read from the grace too for rescues
  // made before that field existed.
  const bridged = [...credited, ...(profile?.bridgedDays ?? []), ...graceDays(profile)];
  const dayBest = bestDayRun(dates, bridged);

  const days = plan instanceof Set ? plan : new Set(plan ?? []);
  if (!days.size) {
    return Math.max(dayBest, streakState(profile, today).count);
  }
  const withCredit = credited.length ? [...(dates ?? []), ...credited] : dates;
  const scheduleBest = bestScheduleRun({ plan: days, dates: withCredit, today });
  const live = scheduleStreak({ plan: days, dates: withCredit, today })?.count ?? 0;
  return Math.max(dayBest, scheduleBest, live);
}

// Lifetime aggregates used by achievement predicates (and boss gates).
export async function computeStats() {
  const workouts = await db.workouts.toArray();
  const sets = (await db.sets.toArray()).filter((s) => !s.isWarmup);
  const prs = await db.prs.toArray();
  const exercises = await db.exercises.toArray();
  const profile = await db.userProfile.get(1);
  // Read here, not passed in, so every live query built on this re-runs when a
  // routine is given (or loses) a weekday — the plan decides what a streak is.
  const plan = planDays(await db.templates.toArray());

  const totalVolume = workouts.reduce((a, w) => a + (w.totalVolume || 0), 0);
  const totalSets = workouts.reduce((a, w) => a + (w.totalSets || 0), 0);

  const bestStreak = bestStreakOf({ dates: workouts.map((w) => w.date), plan, profile, today: todayKey() });

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
