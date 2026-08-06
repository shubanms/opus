import { useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import useUserStore from '../store/userStore.js';
import { db } from '../db/db.js';
import { currentStreak } from '../utils/streak.js';
import { planDays, scheduleStreak } from '../utils/scheduleStreak.js';
import { getCharacterStats } from '../utils/rpg.js';

// Initialises and returns the user profile.
export function useRPG() {
  const { profile, loaded, init } = useUserStore();
  useEffect(() => { init(); }, [init]);
  return { profile, loaded };
}

// Five-axis radar stats computed live from training history.
export function useCharacterStats() {
  return useLiveQuery(async () => {
    const workouts = await db.workouts.toArray();
    const sets = await db.sets.toArray();
    const weightPRs = await db.prs.where('type').equals('weight').toArray();

    const working = sets.filter((s) => !s.isWarmup);
    const workoutCount = workouts.length || 1;
    const maxWeight = weightPRs.length ? Math.max(...weightPRs.map((p) => p.value)) : 0;
    const totalVolume = working.reduce((a, s) => a + s.weight * s.reps, 0);
    const avgVolume = totalVolume / workoutCount;
    const avgSets = working.length / workoutCount;

    const dates = [...new Set(workouts.map((w) => w.date))].sort();
    let workoutsPerWeek = 0;
    if (dates.length > 1) {
      const spanDays = (new Date(dates[dates.length - 1]) - new Date(dates[0])) / 86400000 + 1;
      workoutsPerWeek = dates.length / (spanDays / 7);
    } else if (dates.length === 1) {
      workoutsPerWeek = 1;
    }

    const exIds = [...new Set(working.map((s) => s.exerciseId))];
    const muscles = new Set();
    for (const id of exIds) {
      const ex = await db.exercises.get(id);
      if (ex?.muscleGroup) muscles.add(ex.muscleGroup);
    }

    const profile = await db.userProfile.get(1);
    // Consistency has to mean the same thing here as it does on Home, or the
    // radar quietly contradicts the number next to it.
    const plan = planDays(await db.templates.toArray());
    const credited = profile?.creditedDays ?? [];
    const scheduled = plan.size ? scheduleStreak({ plan, dates: [...dates, ...credited] }) : null;

    return getCharacterStats({
      maxWeight,
      avgVolume,
      avgSets,
      streak: scheduled ? scheduled.count : currentStreak(profile),
      workoutsPerWeek,
      muscleVariety: muscles.size,
    });
  }, []) ?? [];
}
