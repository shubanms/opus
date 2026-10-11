// Dev-only: writes the demo seed (utils/demoSeed.js) into IndexedDB through the
// app's own helpers, so profile, records and badges are derived, not faked.
// Only ever reached through a dynamic import behind `import.meta.env.DEV`.

import { db } from '../db/db.js';
import useSettingsStore from '../store/settingsStore.js';
import useUserStore from '../store/userStore.js';
import useUIStore from '../store/uiStore.js';
import { seedDatabase } from '../utils/wger.js';
import { recomputePRs, settleDerived } from '../utils/workoutActions.js';
import { checkAchievements } from '../utils/achievements.js';
import { todaysDungeon, dungeonReward } from '../utils/dungeon.js';
import { todayKey, shiftKey } from '../utils/dateKey.js';
import { DEMO_PREFIX, buildDemoWorkouts, dungeonSessionDate } from '../utils/demoSeed.js';

const COACH_ROUTES = ['/home', '/progress', '/workout', '/exercises', '/profile'];

async function demoPresent() {
  return (await db.workouts.filter((w) => String(w.sessionId ?? '').startsWith(DEMO_PREFIX)).count()) > 0;
}

function markSetupDone() {
  useSettingsStore.setState({
    onboarded: true,
    tourSeen: true,
    coachMarksSeen: Object.fromEntries(COACH_ROUTES.map((r) => [r, true])),
  });
  useSettingsStore.getState().persist();
}

async function clearHistory() {
  await db.transaction(
    'rw',
    [db.workouts, db.sets, db.prs, db.achievements, db.questClaims, db.energyLogs],
    async () => {
      await Promise.all([db.workouts.clear(), db.sets.clear(), db.prs.clear(), db.achievements.clear(), db.questClaims.clear(), db.energyLogs.clear()]);
    }
  );
}

/**
 * Seed the demo history. Asks first (uiStore confirm) if real workouts exist.
 * Returns 'seeded', 'skipped' (already demo data) or 'cancelled'.
 */
export async function loadDemo() {
  await seedDatabase();
  const existing = await db.workouts.count();
  if (existing > 0) {
    if (await demoPresent()) {
      markSetupDone();
      return 'skipped';
    }
    const ok = await useUIStore.getState().confirm({
      title: 'Replace your data with demo data?',
      message: `This device has ${existing} saved workout${existing === 1 ? '' : 's'}. Loading the demo erases workouts, sets, records and badges first.`,
      confirmLabel: 'Replace',
      cancelLabel: 'Keep mine',
      danger: true,
    });
    if (!ok) return 'cancelled';
    await clearHistory();
  }

  const today = todayKey();
  const exercises = await db.exercises.toArray();
  const idOf = new Map(exercises.map((e) => [e.name, e.id]));
  const workouts = buildDemoWorkouts(today);
  const dungeonDate = dungeonSessionDate(workouts);
  const touched = new Set();

  await useUserStore.getState().init();
  for (const w of workouts) {
    const isDungeon = w.date === dungeonDate;
    const dungeon = isDungeon ? todaysDungeon(w.date) : null;
    const workoutId = await db.workouts.add({
      date: w.date,
      startedAt: w.startedAt,
      sessionId: w.sessionId,
      templateId: null,
      name: w.name,
      status: 'completed',
      duration: w.duration,
      notes: '',
      xpEarned: w.xpEarned,
      totalVolume: w.totalVolume,
      totalCalories: w.totalCalories,
      totalSets: w.totalSets,
      bodyweightKg: 78,
      createdAt: w.createdAt,
      ironEarned: 0,
      dungeonIron: dungeon ? dungeonReward(dungeon) : 0,
      dungeonDate: dungeon ? w.date : null,
    });
    const rows = w.sets
      .filter((s) => idOf.has(s.exercise))
      .map((s) => ({
        workoutId,
        exerciseId: idOf.get(s.exercise),
        setNumber: s.setNumber,
        reps: s.reps,
        weight: s.weight,
        rpe: s.rpe,
        isWarmup: false,
        note: null,
        completedAt: s.completedAt,
        crit: false,
        bonusXp: 0,
        isCardio: false,
        calories: 0,
      }));
    for (const r of rows) touched.add(r.exerciseId);
    await db.sets.bulkAdd(rows);
  }
  for (const id of touched) await recomputePRs(id);

  if (dungeonDate) useSettingsStore.setState({ lastDungeonClaim: dungeonDate });
  markSetupDone();

  // Profile first (so level-gated badges see it), then badges, then settle.
  await settleDerived();
  await checkAchievements();
  await settleDerived();
  await useUserStore.getState().updateProfile({ name: 'Demo Lifter', joinDate: shiftKey(today, -30) });
  useSettingsStore.getState().noteData(workouts.length);
  return 'seeded';
}

/**
 * `?demo=1` hook, run before first render: seed once, then the app carries on
 * to the requested page. Real workouts need a confirm dialog, which cannot show
 * before the app mounts, so that case is returned as a `run` for the caller to
 * invoke after render.
 */
export async function bootDemoFromUrl() {
  if (new URLSearchParams(window.location.search).get('demo') !== '1') return null;
  const guarded = async () => {
    try {
      return await loadDemo();
    } catch (err) {
      console.error('Demo seed failed:', err);
      return null;
    }
  };
  const real = (await db.workouts.count()) > 0 && !(await demoPresent());
  if (real) return guarded;
  await guarded();
  return null;
}
