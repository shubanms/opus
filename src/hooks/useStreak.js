import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db.js';
import useUserStore from '../store/userStore.js';
import { streakState } from '../utils/streak.js';
import { planDays, scheduleStreak } from '../utils/scheduleStreak.js';
import { useTodayKey } from './useTodayKey.js';

// The one place that decides which streak you are on.
//
// With a weekly plan the streak counts scheduled sessions hit; without one
// there is nothing to be schedule-aware about and it falls back to consecutive
// days. Both return the same shape, so no display has to know which it got.
//
// This exists because the alternative was threading a plan and a list of dates
// through six call sites, which is how a feature ends up half-applied — the
// Home hero saying one thing and the Profile tile another.

/** Just the plan, for anything that needs to know whether one exists. */
export function usePlanDays() {
  return useLiveQuery(async () => planDays(await db.templates.toArray()), []) ?? null;
}

export function useStreak() {
  // Straight from the store, not via useRPG: that hook also *initialises* the
  // profile, and this one is called from AuroraBackdrop, which avoids it for
  // exactly that reason — two initialisers in the same tick once raced into
  // creating two profile rows. AppLayout owns initialisation.
  const profile = useUserStore((s) => s.profile);
  // A dependency, not just a value: a phone left open overnight has to see
  // yesterday's "at risk" become today's "broken" without a reload.
  const today = useTodayKey();
  const plan = usePlanDays();
  // Only the dates matter, and only while there is a plan to measure them
  // against — no point reading every workout for the fallback path.
  const dates = useLiveQuery(
    async () => (plan?.size ? [...new Set((await db.workouts.toArray()).map((w) => w.date))] : []),
    [plan]
  );

  // `ready` says the answer below is the final one. Anything that *acts* on
  // the streak — a rescue offer, a reminder — must wait for it: for a
  // Mon/Wed/Fri lifter the fallback day-streak reads "broken" every Wednesday.
  const ready = !!profile && plan !== null && (!plan.size || dates !== undefined);

  // While either query is in flight, the day-streak is the honest answer to
  // *display*: it needs nothing but the profile, and a flash of "no streak"
  // would be a lie.
  if (plan?.size && dates) {
    // Days bought back with rest tokens count as trained. Unlike the day
    // streak's grace this is permanent: training again must not revoke a
    // session you paid for.
    const credited = profile?.creditedDays ?? [];
    const s = scheduleStreak({ plan, dates: credited.length ? [...dates, ...credited] : dates, today });
    if (s) return { ...s, scheduled: true, ready };
  }
  return { ...streakState(profile, today), nextDue: null, scheduled: false, ready };
}
