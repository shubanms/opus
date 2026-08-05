import { useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db.js';
import {
  ACHIEVEMENTS,
  achievementProgress,
  checkAchievements,
  computeStats,
} from '../utils/achievements.js';

// Achievement list with unlock state and, for the locked ones, how close they
// are. Also catches up any newly-earned ones (e.g. level/custom-exercise
// milestones) on mount.
//
// The stats read is the same aggregate `checkAchievements` already runs, so
// showing progress costs one extra pass over rows that are in memory anyway —
// and it turns a static list into something you can watch yourself approach.
export function useAchievements() {
  useEffect(() => {
    checkAchievements();
  }, []);

  const state = useLiveQuery(async () => {
    const rows = await db.achievements.toArray();
    return {
      unlocked: Object.fromEntries(rows.map((r) => [r.key, r.unlockedAt])),
      stats: await computeStats(),
    };
  }, []);

  const unlocked = state?.unlocked ?? {};
  const stats = state?.stats ?? null;

  const items = ACHIEVEMENTS.map((a) => ({
    ...a,
    unlocked: !!unlocked[a.key],
    unlockedAt: unlocked[a.key] ?? null,
    progress: unlocked[a.key] ? null : achievementProgress(a, stats),
  }));

  return { items, count: items.filter((i) => i.unlocked).length, total: ACHIEVEMENTS.length };
}
