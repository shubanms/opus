import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db.js';
import { weeklyQuests, weekKeyOf, weekStartMs, computeQuestStats } from '../utils/quests.js';

// This week's quests with live progress + claimed state, derived from existing
// workout/set/PR data. No new tracking — quests just read what's already logged.
export function useQuests() {
  return useLiveQuery(async () => {
    const now = new Date();
    const weekKey = weekKeyOf(now);
    const startMs = weekStartMs(now);

    const workouts = (await db.workouts.toArray())
      .filter((w) => w.status === 'completed' && new Date(w.date).getTime() >= startMs);
    const wIds = new Set(workouts.map((w) => w.id));
    const sets = (await db.sets.toArray()).filter((s) => wIds.has(s.workoutId) && !s.isWarmup);
    const prs = (await db.prs.toArray()).filter((p) => (p.achievedAt ?? 0) >= startMs);
    const exercises = await db.exercises.toArray();
    const exMuscle = Object.fromEntries(exercises.map((e) => [e.id, e.muscleGroup]));

    const stats = computeQuestStats({ workouts, sets, prs, exMuscle });

    const claimedIds = new Set(
      (await db.questClaims.where('weekKey').equals(weekKey).toArray()).map((c) => c.questId)
    );

    const quests = weeklyQuests(now).map((d) => {
      const current = stats[d.metric] ?? 0;
      return {
        ...d,
        current,
        done: current >= d.target,
        claimed: claimedIds.has(d.id),
        pct: Math.min(current / d.target, 1),
      };
    });

    return { weekKey, quests };
  }, []) ?? { weekKey: '', quests: [] };
}
