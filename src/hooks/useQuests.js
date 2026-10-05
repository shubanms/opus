import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db.js';
import { parseKey } from '../utils/dateKey.js';
import { useTodayKey } from './useTodayKey.js';
import { weeklyQuests, weekKeyOf, recordEvents, weekQuestStats } from '../utils/quests.js';

// This week's quests with live progress + claimed state, derived from existing
// workout/set data. No new tracking — quests just read what's already logged.
//
// Progress is computed by exactly the rule the claim reconcile uses
// (`weekQuestStats`): sessions belong to a week by their LOCAL date, and a
// record is a set that beat everything before it. The board reading one thing
// and the reconcile another is how a claim the board offered could be taken
// back by an unrelated delete.
export function useQuests() {
  // Re-runs at midnight / on resume, so Monday's board is the new week's.
  const today = useTodayKey();
  return useLiveQuery(async () => {
    const now = parseKey(today) ?? new Date();
    const weekKey = weekKeyOf(now);

    const workouts = (await db.workouts.toArray()).filter((w) => w.status === 'completed');
    const sets = await db.sets.toArray();
    const exercises = await db.exercises.toArray();
    const exMuscle = Object.fromEntries(exercises.map((e) => [e.id, e.muscleGroup]));

    const stats = weekQuestStats({ weekKey, workouts, sets, exMuscle, events: recordEvents({ workouts, sets }) });

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
  }, [today]) ?? { weekKey: '', quests: [] };
}
