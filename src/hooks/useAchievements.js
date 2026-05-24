import { useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db.js';
import { ACHIEVEMENTS, checkAchievements } from '../utils/achievements.js';

// Achievement list with unlock state. Also catches up any newly-earned ones
// (e.g. level/custom-exercise milestones) on mount.
export function useAchievements() {
  useEffect(() => { checkAchievements(); }, []);

  const unlocked = useLiveQuery(async () => {
    const rows = await db.achievements.toArray();
    return Object.fromEntries(rows.map((r) => [r.key, r.unlockedAt]));
  }, []) ?? {};

  const items = ACHIEVEMENTS.map((a) => ({
    ...a,
    unlocked: !!unlocked[a.key],
    unlockedAt: unlocked[a.key] ?? null,
  }));
  return { items, count: items.filter((i) => i.unlocked).length, total: ACHIEVEMENTS.length };
}
