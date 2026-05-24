import { db } from '../db/db.js';
import useUserStore from '../store/userStore.js';

// Claims a completed quest once per week: records it (so the XP is permanent
// and survives recomputeProfile) and awards the bounty. Returns false if the
// quest was already claimed this week.
export async function claimQuest({ weekKey, questId, xp }) {
  const existing = await db.questClaims.where('weekKey').equals(weekKey).toArray();
  if (existing.some((c) => c.questId === questId)) return false;
  await db.questClaims.add({ weekKey, questId, xp, claimedAt: Date.now() });
  await useUserStore.getState().addXP(xp);
  return true;
}
