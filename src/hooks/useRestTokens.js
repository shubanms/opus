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
export function useRestTokens() {
  const workouts = useLiveQuery(() => db.workouts.count(), []) ?? 0;
  const questClaims = useLiveQuery(() => db.questClaims.count(), []) ?? 0;
  const spent = useSettingsStore((s) => s.tokensSpent);
  const purchased = useSettingsStore((s) => s.tokensPurchased);
  return tokenBalance(tokensEarned({ workouts, questClaims }) + (purchased || 0), spent);
}
