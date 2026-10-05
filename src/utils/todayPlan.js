// What Home suggests for today: the routine planned for this weekday, a rest
// day, or a fresh start. Pure + unit-tested (useToday in hooks/useTemplates
// feeds it the data).
//
// It used to count consecutive training days starting AT today, keyed in UTC.
// Both were wrong. Counting from today put "Rest day" on screen the moment the
// third session in a row was saved — when you were already done — and took it
// away again the next morning, the day it was meant for. And a UTC key is a
// different calendar day for most of the world for part of every day (before
// 05:30 in India, after 20:00 in New York), so the run was measured from the
// wrong day too. The run now ends yesterday, in local days, and a rest day is
// only suggested on a day you haven't trained yet.

import { parseKey, shiftKey } from './dateKey.js';
import { routineForDay } from './routineDays.js';

/** Train this many days in a row and the next day is a suggested rest day. */
export const REST_AFTER_DAYS = 3;

/** Consecutive training days ending the day before `today` (local date keys). */
export function runBefore(dates, today) {
  const trained = dates instanceof Set ? dates : new Set(dates ?? []);
  let run = 0;
  let cursor = shiftKey(today, -1);
  while (cursor && trained.has(cursor)) {
    run += 1;
    cursor = shiftKey(cursor, -1);
  }
  return run;
}

/**
 * Today's suggestion.
 *  - `dates`: every workout's date key (duplicates fine).
 *  - `today`: today's LOCAL key (`todayKey()`).
 *  - `templates`: routines with `dayOfWeek`; the one owning today's weekday is
 *    suggested (newest wins on a shared day, as everywhere — routineDays).
 * Returns { type: 'rest'|'template'|'fresh', reason, template?, run }.
 */
export function todayPlan({ dates = [], today, templates = [] }) {
  const trained = new Set(dates);
  const run = runBefore(trained, today);
  if (!trained.has(today) && run >= REST_AFTER_DAYS) {
    return { type: 'rest', reason: `${run} days trained in a row — let your body recover.`, run };
  }

  const dow = parseKey(today)?.getDay();
  const template = dow == null ? null : routineForDay(templates, dow);
  if (template) return { type: 'template', template, reason: 'On your plan for today', run };

  return { type: 'fresh', reason: 'No plan today — start fresh.', run };
}
