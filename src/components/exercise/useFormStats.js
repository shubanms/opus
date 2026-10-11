import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/db.js';

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/** Sessions trained -> mastery dots (0..3). */
export function masteryOf(sessions) {
  if (!sessions) return 0;
  if (sessions >= 10) return 3;
  if (sessions >= 4) return 2;
  return 1;
}

/**
 * Per-exercise training facts for the Forms list, from real data:
 * sessions (distinct workouts), best set (heaviest weight and the most reps
 * at it), last trained, and whether a record fell in the last 7 days.
 * Also today's routine (the template scheduled for today), if any.
 * `undefined` while loading.
 */
export function useFormStats() {
  return useLiveQuery(async () => {
    const [sets, prs, templates] = await Promise.all([db.sets.toArray(), db.prs.toArray(), db.templates.toArray()]);
    const stats = {};
    const get = (id) => {
      if (!stats[id]) stats[id] = { workouts: new Set(), bestW: 0, bestReps: 0, maxReps: 0, last: 0, recordWeek: false };
      return stats[id];
    };
    for (const s of sets) {
      if (s.isWarmup) continue;
      const st = get(s.exerciseId);
      st.workouts.add(s.workoutId);
      const w = Number(s.weight) || 0;
      const r = Number(s.reps) || 0;
      if (w > st.bestW || (w === st.bestW && r > st.bestReps)) {
        st.bestW = w;
        st.bestReps = r;
      }
      if (r > st.maxReps) st.maxReps = r;
      if ((s.completedAt ?? 0) > st.last) st.last = s.completedAt ?? 0;
    }
    const now = Date.now();
    for (const p of prs) {
      if (p.achievedAt && now - p.achievedAt < WEEK_MS) get(p.exerciseId).recordWeek = true;
    }
    const out = {};
    for (const [id, st] of Object.entries(stats)) {
      out[id] = {
        sessions: st.workouts.size,
        bestW: st.bestW,
        bestReps: st.bestW > 0 ? st.bestReps : st.maxReps,
        last: st.last,
        recordWeek: st.recordWeek,
      };
    }
    const today = templates.find((t) => t.dayOfWeek === new Date().getDay());
    let todayIds = [];
    if (today) {
      const links = await db.templateExercises.where('templateId').equals(today.id).sortBy('orderIndex');
      todayIds = links.map((l) => l.exerciseId);
    }
    return { stats: out, todayName: today?.name ?? null, todayIds };
  }, []);
}
