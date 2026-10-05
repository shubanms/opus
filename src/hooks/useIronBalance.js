import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db.js';
import useSettingsStore from '../store/settingsStore.js';
import { earnedIronFrom, hasOwnIron, ironBalance } from '../utils/economy.js';

// Spendable Iron — one answer for the Vault, the Profile and anything else.
//
// The Vault and the Profile each assembled this inline from lifetime *counts*,
// which is how the two copies ended up paying record rows instead of records
// (see utils/economy.js). Derived from the rows, so a delete reverts it.
//
// `loaded` is false until the history has been read: a Vault that briefly
// shows a balance of 0 also briefly disables every purchase.
export function useIronBalance() {
  const spent = useSettingsStore((s) => s.ironSpent);
  // Dungeon Iron banked before workout rows carried their own. Frozen.
  const legacyDungeon = useSettingsStore((s) => s.dungeonIron);

  const earned = useLiveQuery(async () => {
    const workouts = await db.workouts.toArray();
    const legacyIds = workouts.filter((w) => !hasOwnIron(w)).map((w) => w.id);
    // Only the legacy workouts' sets matter (they decide which record rows are
    // old), and `workoutId` is indexed — no need to read every set ever logged.
    const sets = legacyIds.length ? await db.sets.where('workoutId').anyOf(legacyIds).toArray() : [];
    const prs = legacyIds.length ? await db.prs.toArray() : [];
    const questClaims = await db.questClaims.count();
    return earnedIronFrom({ workouts, prs, sets, questClaims });
  }, []);

  return {
    balance: ironBalance((earned ?? 0) + (legacyDungeon || 0), spent),
    loaded: earned !== undefined,
  };
}
