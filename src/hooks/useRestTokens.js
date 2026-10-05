import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db.js';
import useSettingsStore from '../store/settingsStore.js';
import { tokenBalance, tokensEarned } from '../utils/streakShield.js';

// Spendable rest tokens.
//
// The balance is *derived* from history (finished workouts + claimed quests)
// plus anything bought with Iron, minus what has been spent — so it needs no
// backfill for existing users and deleting workouts re-derives it for free.
//
// This was assembled inline on Home, which is why nothing else could offer a
// token: the arithmetic lived in a page rather than anywhere reusable.

/** `{ tokens, ready }` — `ready` is false until the history has been counted. */
export function useRestTokenBalance() {
  const counts = useLiveQuery(
    async () => ({ workouts: await db.workouts.count(), questClaims: await db.questClaims.count() }),
    []
  );
  const spent = useSettingsStore((s) => s.tokensSpent);
  const purchased = useSettingsStore((s) => s.tokensPurchased);
  const tokens = tokenBalance(tokensEarned(counts ?? {}) + (purchased || 0), spent);
  return { tokens, ready: counts !== undefined };
}

/** The balance on its own. Reads 0 for the moment before history is counted. */
export function useRestTokens() {
  return useRestTokenBalance().tokens;
}
