// Streaks that count sessions hit, not days survived.
//
// A consecutive-day streak punishes rest, which is the one thing every training
// programme in the app prescribes. Follow a Mon/Wed/Fri plan perfectly and the
// day-streak reads 1 forever; the number that is supposed to reward consistency
// instead rewards overtraining, and the only way to keep it is to do something
// the app itself tells you not to do.
//
// When someone has a weekly plan, the streak counts *scheduled sessions hit*.
// Tuesday is not a lapse if you were never meant to train on Tuesday. Without a
// plan there is nothing to be schedule-aware about, so this returns null and
// the caller falls back to the day-streak (`utils/streak.js`).
//
// Pure + unit-tested.

import { parseKey, shiftKey, todayKey } from './dateKey.js';
import { STREAK } from './streak.js';

/** How far back a run is chased before we call it long enough. */
const LOOKBACK_SLOTS = 200;

/** The weekdays a plan actually trains on, from the user's routines. */
export function planDays(templates = []) {
  const days = new Set();
  for (const t of templates ?? []) {
    const d = t?.dayOfWeek;
    if (Number.isInteger(d) && d >= 0 && d <= 6) days.add(d);
  }
  return days;
}

function weekday(key) {
  const d = parseKey(key);
  return d ? d.getDay() : null;
}

/** The nearest scheduled date strictly after `key`. */
function nextScheduled(key, days) {
  for (let i = 1; i <= 7; i += 1) {
    const k = shiftKey(key, i);
    if (k && days.has(weekday(k))) return k;
  }
  return null;
}

/** The nearest scheduled date on or before `key`. */
function scheduledOnOrBefore(key, days) {
  for (let i = 0; i <= 7; i += 1) {
    const k = shiftKey(key, -i);
    if (k && days.has(weekday(k))) return k;
  }
  return null;
}

/**
 * Each scheduled day owns the window running from itself up to (not including)
 * the next scheduled day. Training anywhere in that window counts.
 *
 * Being *late* is the case worth forgiving: missing Monday and lifting on
 * Tuesday is a session done, not a session skipped, and a plan that calls that
 * a failure is a plan people stop following. Being early is not forgiven the
 * same way — a Sunday session belongs to Sunday's window, not to Monday's.
 */
function windowHit(slot, next, trained) {
  for (const date of trained) {
    if (date >= slot && (next === null || date < next)) return true;
  }
  return false;
}

/**
 * Schedule-aware streak state, or null when there is no plan to be aware of.
 *
 * Shape matches `streakState` so the two are interchangeable at every display:
 * `{ count, state, lost, daysSince }` plus `nextDue`, which the day-streak has
 * no concept of.
 */
export function scheduleStreak({ plan, dates, today = todayKey() } = {}) {
  const days = plan instanceof Set ? plan : new Set(plan ?? []);
  if (!days.size) return null;

  const trained = [...new Set(dates ?? [])].filter(Boolean).sort().reverse();

  // Walk the scheduled days backwards from today, newest first. At most one
  // window is still open — the one containing today.
  const slots = [];
  let cursor = scheduledOnOrBefore(today, days);
  for (let i = 0; i < LOOKBACK_SLOTS && cursor; i += 1) {
    const next = nextScheduled(cursor, days);
    slots.push({ slot: cursor, open: next === null || next > today, hit: windowHit(cursor, next, trained) });
    cursor = shiftKey(cursor, -1);
    cursor = cursor ? scheduledOnOrBefore(cursor, days) : null;
  }

  const open = slots[0]?.open ? slots[0] : null;
  const closed = open ? slots.slice(1) : slots;

  let run = 0;
  while (run < closed.length && closed[run].hit) run += 1;

  if (open?.hit) {
    return { count: run + 1, state: STREAK.SAFE, lost: 0, nextDue: nextScheduled(open.slot, days) };
  }
  if (run > 0) {
    // The current window is still open, so nothing is lost yet — but the
    // deadline is real and it is the end of this window. `deadline` is the
    // last day that still counts, so a reminder can tell "your session is
    // due" (the scheduled day) from "last chance" (the day before the next).
    const following = open ? nextScheduled(open.slot, days) : null;
    return {
      count: run,
      state: STREAK.AT_RISK,
      lost: 0,
      nextDue: open?.slot ?? null,
      deadline: following ? shiftKey(following, -1) : null,
    };
  }

  // The most recent closed window was missed. Collect every consecutive missed
  // window — those are the slots a rescue would have to buy — and then count
  // the run that ended before them, which is what was lost.
  const missedSlots = [];
  let i = 0;
  while (i < closed.length && !closed[i].hit) { missedSlots.push(closed[i].slot); i += 1; }
  let lost = 0;
  while (i < closed.length && closed[i].hit) { lost += 1; i += 1; }
  return {
    count: 0,
    state: lost > 0 ? STREAK.BROKEN : STREAK.NONE,
    lost,
    missedSlots,
    nextDue: open?.slot ?? nextScheduled(today, days),
  };
}

/**
 * The longest run of consecutive scheduled windows ever hit — the schedule
 * streak's personal best.
 *
 * Same window rules as `scheduleStreak` (each scheduled day owns the days up to
 * the next one; late counts, early belongs to the earlier window; two sessions
 * in one window are one hit). Days bought back with rest tokens count as
 * trained — pass them in with `dates`, exactly as the live streak does.
 *
 * The window that contains today is still open, so an unfilled one is not a
 * miss: it neither extends nor ends the run before it. That is what keeps the
 * best at or above the live count on every day of the week.
 *
 * Without this, "best streak" counted consecutive calendar days while the live
 * streak counted sessions — so a Mon/Wed/Fri lifter on a seven-session streak
 * had a best of 1, could never earn Week Warrior, and was sealed at level 20 by
 * a boss gate their own plan made impossible to clear.
 *
 * Returns 0 when there is no plan (nothing to be schedule-aware about).
 */
export function bestScheduleRun({ plan, dates, today = todayKey() } = {}) {
  const days = plan instanceof Set ? plan : new Set(plan ?? []);
  if (!days.size) return 0;

  const trained = [...new Set(dates ?? [])].filter((k) => parseKey(k)).sort();
  if (!trained.length) return 0;

  // Walk forward window by window from the one holding the first session, with
  // a single pointer through the (sorted) dates — linear in history, however
  // long it is. Stop after the window holding today, or the last session if the
  // device clock is behind it.
  const end = trained[trained.length - 1] > today ? trained[trained.length - 1] : today;
  let cursor = scheduledOnOrBefore(trained[0], days);
  let i = 0;
  let run = 0;
  let best = 0;
  while (cursor && cursor <= end) {
    const next = nextScheduled(cursor, days);
    while (i < trained.length && trained[i] < cursor) i += 1;
    let hit = false;
    while (i < trained.length && (next === null || trained[i] < next)) {
      hit = true;
      i += 1;
    }
    const open = next === null || next > today;
    if (hit) {
      run += 1;
      if (run > best) best = run;
    } else if (!open) {
      run = 0;
    }
    cursor = next;
  }
  return best;
}
