import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db.js';
import { availablePeriods, rangeOf, buildWrapped } from '../utils/wrapped.js';
import { monthKeyOf } from '../utils/snapshots.js';

// Live Wrapped data for a selected period (defaults to the current month) plus
// the list of selectable periods. Aggregation math lives in utils/wrapped.js.
export function useWrapped(period) {
  return useLiveQuery(async () => {
    const now = new Date();
    const workouts = await db.workouts.toArray();
    const periods = availablePeriods(workouts, now);
    // Default to the current month as `availablePeriods` describes it, rather
    // than a hand-built stand-in — that one carried `label: ''`, and the page's
    // `??` fallback does not fire on an empty string, so the period picker
    // rendered blank until an arrow was pressed. With one month of history both
    // arrows are disabled, so it never recovered.
    const sel = period ?? periods.months[0] ?? { kind: 'month', key: monthKeyOf(now), current: true };
    const sets = await db.sets.toArray();
    const prs = await db.prs.toArray();
    const exercises = await db.exercises.toArray();
    const exName = Object.fromEntries(exercises.map((e) => [e.id, e.name]));
    const data = buildWrapped(workouts, sets, prs, rangeOf(sel), exName);
    return { periods, data, period: sel };
  }, [period?.kind, period?.key]) ?? { periods: { months: [], years: [] }, data: null, period: null };
}
