import { db } from '../db/db.js';
import useUserStore from '../store/userStore.js';
import { QUEST_BY_ID, computeQuestStats, weekStartMsFromKey } from './quests.js';

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

// Recomputes a single past week's quest stats from current data.
async function statsForWeek(weekKey, exMuscle) {
  const startMs = weekStartMsFromKey(weekKey);
  const endMs = startMs + 7 * 86400000;
  const inWeek = (ms) => ms >= startMs && ms < endMs;
  const workouts = (await db.workouts.toArray())
    .filter((w) => w.status === 'completed' && inWeek(new Date(w.date).getTime()));
  const wIds = new Set(workouts.map((w) => w.id));
  const sets = (await db.sets.toArray()).filter((s) => wIds.has(s.workoutId) && !s.isWarmup);
  const prs = (await db.prs.toArray()).filter((p) => inWeek(p.achievedAt ?? 0));
  return computeQuestStats({ workouts, sets, prs, exMuscle });
}

// Removes claimed quests whose conditions no longer hold (e.g. after a workout
// delete), so their XP reverts cleanly via recomputeProfile. Mirrors how
// achievements are reconciled. Profile XP is recomputed by the caller.
export async function reconcileQuests() {
  const claims = await db.questClaims.toArray();
  if (!claims.length) return;
  const exercises = await db.exercises.toArray();
  const exMuscle = Object.fromEntries(exercises.map((e) => [e.id, e.muscleGroup]));

  const cache = {};
  for (const claim of claims) {
    const def = QUEST_BY_ID[claim.questId];
    if (!def) continue; // unknown quest id — leave the claim untouched
    cache[claim.weekKey] ??= await statsForWeek(claim.weekKey, exMuscle);
    if ((cache[claim.weekKey][def.metric] ?? 0) < def.target) {
      await db.questClaims.delete(claim.id);
    }
  }
}
