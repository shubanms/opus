import { db } from '../db/db.js';
import useUserStore from '../store/userStore.js';
import { QUEST_BY_ID, recordEvents, weekQuestStats } from './quests.js';

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

/**
 * Remove claimed quests whose conditions no longer hold (e.g. after a workout
 * delete), so their XP reverts cleanly via recomputeProfile. Mirrors how
 * achievements are reconciled. Profile XP is recomputed by the caller.
 *
 * `scope` says which weeks a change could have touched — `{ weeks: [key…] }`
 * or `{ since: key }` (that week and every later one). Without it every
 * claimed week is checked. Checking weeks a change cannot affect is not just
 * wasted work: before records were derived from set history it revoked
 * fairly-won quests (delete any session, lose a "New Heights" claim from a
 * month ago whose record had since been beaten).
 *
 * Each week is judged by the same rule the quest board uses (`weekQuestStats`
 * over the whole history), so a claim the board allowed survives the check
 * unless the data really changed.
 */
export async function reconcileQuests(scope = {}) {
  let claims = await db.questClaims.toArray();
  if (Array.isArray(scope?.weeks)) {
    const weeks = new Set(scope.weeks);
    claims = claims.filter((c) => weeks.has(c.weekKey));
  }
  if (scope?.since) claims = claims.filter((c) => c.weekKey >= scope.since);
  if (!claims.length) return;

  const workouts = (await db.workouts.toArray()).filter((w) => w.status === 'completed');
  const sets = await db.sets.toArray();
  const exercises = await db.exercises.toArray();
  const exMuscle = Object.fromEntries(exercises.map((e) => [e.id, e.muscleGroup]));
  const events = recordEvents({ workouts, sets });

  const cache = new Map();
  for (const claim of claims) {
    const def = QUEST_BY_ID[claim.questId];
    if (!def) continue; // unknown quest id — leave the claim untouched
    if (!cache.has(claim.weekKey)) {
      cache.set(claim.weekKey, weekQuestStats({ weekKey: claim.weekKey, workouts, sets, exMuscle, events }));
    }
    if ((cache.get(claim.weekKey)[def.metric] ?? 0) < def.target) {
      await db.questClaims.delete(claim.id);
    }
  }
}
