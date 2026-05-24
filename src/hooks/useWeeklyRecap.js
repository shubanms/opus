import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db.js';
import { weekKeyOf, weekStartMs } from '../utils/quests.js';

// This week's training summary (Monday-aligned) for the recap card: sessions,
// volume, working sets, PRs, XP earned, and the highest-volume lift.
export function useWeeklyRecap() {
  return useLiveQuery(async () => {
    const now = new Date();
    const startMs = weekStartMs(now);
    const weekKey = weekKeyOf(now);

    const workouts = (await db.workouts.toArray())
      .filter((w) => w.status === 'completed' && new Date(w.date).getTime() >= startMs);
    const wIds = new Set(workouts.map((w) => w.id));
    const sets = (await db.sets.toArray()).filter((s) => wIds.has(s.workoutId) && !s.isWarmup);
    const prs = (await db.prs.toArray()).filter((p) => (p.achievedAt ?? 0) >= startMs);

    const volByEx = {};
    for (const s of sets) {
      volByEx[s.exerciseId] = (volByEx[s.exerciseId] ?? 0) + (s.weight || 0) * (s.reps || 0);
    }
    let topExId = null;
    let topVol = 0;
    for (const [id, v] of Object.entries(volByEx)) {
      if (v > topVol) { topVol = v; topExId = Number(id); }
    }
    const topLift = topExId != null ? (await db.exercises.get(topExId))?.name ?? null : null;

    return {
      weekKey,
      sessions: workouts.length,
      volumeKg: workouts.reduce((a, w) => a + (w.totalVolume || 0), 0),
      sets: sets.length,
      prCount: prs.length,
      xp: workouts.reduce((a, w) => a + (w.xpEarned || 0), 0),
      topLift,
      hasData: workouts.length > 0,
    };
  }, []) ?? { weekKey: '', sessions: 0, volumeKg: 0, sets: 0, prCount: 0, xp: 0, topLift: null, hasData: false };
}
