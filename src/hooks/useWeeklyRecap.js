import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db.js';
import { weekStartMsFromKey } from '../utils/quests.js';
import { inWeekOf, mondayKey } from '../utils/weeks.js';
import { useTodayKey } from './useTodayKey.js';

// This week's training summary (Monday-aligned) for the recap card and Home's
// tiles: sessions, volume, working sets, PRs, XP earned, the top lift.
//
// Workouts are matched on their date key — `new Date(w.date)` is UTC
// midnight, which west of Greenwich is Sunday evening, so a Monday session
// used to be left out of its own week. `today` is a dependency so the card
// rolls into the new week on Monday morning rather than at the next workout.
export function useWeeklyRecap() {
  const today = useTodayKey();
  return useLiveQuery(async () => {
    const weekKey = mondayKey(today);
    const startMs = weekStartMsFromKey(weekKey);

    const workouts = (await db.workouts.toArray())
      .filter((w) => w.status === 'completed' && inWeekOf(w.date, today));
    const wIds = new Set(workouts.map((w) => w.id));
    const sets = (await db.sets.toArray()).filter((s) => wIds.has(s.workoutId) && !s.isWarmup);
    // Records carry a timestamp, so local Monday midnight in ms is the right cut.
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
  }, [today]) ?? { weekKey: '', sessions: 0, volumeKg: 0, sets: 0, prCount: 0, xp: 0, topLift: null, hasData: false };
}
