// Monday-aligned training weeks, on the local calendar. Pure + unit-tested.
//
// Every "this week" and "per week" number used to bucket a stored `YYYY-MM-DD`
// key by parsing it with `new Date(key)` — which is UTC midnight, i.e. the
// previous evening anywhere west of Greenwich. In Los Angeles a Monday session
// was counted in the week before it, so "This week" read 0 on Mondays and the
// weekly volume chart drew Monday's work in the previous bar. Keys stay keys
// here: they are compared as strings (lexical order is calendar order) and only
// ever turned into dates through dateKey's local-midnight parser.

import { parseKey, shiftKey, shortDate, todayKey } from './dateKey.js';

/** The Monday, as a date key, of the week `key` falls in. Null for a bad key. */
export function mondayKey(key) {
  const d = parseKey(key);
  if (!d) return null;
  return shiftKey(key, -((d.getDay() + 6) % 7));
}

/** The last `count` Monday keys, ending with the current week's, oldest first. */
export function lastWeeks(today, count) {
  const thisMonday = mondayKey(today);
  if (!thisMonday || !(count >= 1)) return [];
  return Array.from({ length: count }, (_, i) => shiftKey(thisMonday, -7 * (count - 1 - i)));
}

/** Whether `key` is in the same Monday-aligned week as `today`, up to and including today. */
export function inWeekOf(key, today) {
  const monday = mondayKey(today);
  return Boolean(monday && key && key >= monday && key <= today);
}

/**
 * Sum `getValue(row)` into Monday-aligned buckets for the last `weeks` weeks.
 *
 * Returns `[{ week, label, value }]`, oldest first, with an entry for every
 * week whether or not anything happened in it — a chart that silently drops
 * empty weeks draws a missed week as if it never existed. Rows outside the
 * window (or with no usable date) are ignored.
 */
export function weeklyTotals(
  rows,
  { today = todayKey(), weeks = 8, getValue = (r) => r.totalVolume ?? 0, getKey = (r) => r.date } = {}
) {
  const keys = lastWeeks(today, weeks);
  const byWeek = new Map(keys.map((k) => [k, 0]));
  for (const row of rows ?? []) {
    const week = mondayKey(getKey(row));
    if (week && byWeek.has(week)) byWeek.set(week, byWeek.get(week) + (Number(getValue(row)) || 0));
  }
  return keys.map((week) => ({ week, label: shortDate(week), value: byWeek.get(week) }));
}

/**
 * This week so far against last week *up to the same moment*.
 *
 * The volume card compared this partial week with the whole of last week, so
 * it said "−100% vs last week" every Monday morning, and kept reading as a
 * decline until about Sunday. A fair comparison stops last week at the same
 * weekday and, on that day, at the same time of day — a session you finished
 * at 6 pm last Monday had not happened yet at 8 am.
 *
 * `timeOf` gives a row's completion time (ms); rows without one are counted by
 * day alone. Returns null when last week had nothing by this point: a change
 * from zero is not a percentage, and inventing one ("+∞%") says nothing.
 */
export function weekToDate(
  rows,
  {
    now = new Date(),
    getValue = (r) => r.totalVolume ?? 0,
    getKey = (r) => r.date,
    timeOf = (r) => r.createdAt,
  } = {}
) {
  const today = todayKey(now);
  const thisMonday = mondayKey(today);
  const lastMonday = shiftKey(thisMonday, -7);
  // The same wall-clock moment a week ago. setDate rather than subtracting
  // 7×24h, so a clock change in between doesn't shift the cut-off by an hour.
  const then = new Date(now);
  then.setDate(then.getDate() - 7);
  const thenKey = todayKey(then);

  let current = 0;
  let previous = 0;
  for (const row of rows ?? []) {
    const key = getKey(row);
    if (!key) continue;
    const value = Number(getValue(row)) || 0;
    if (key >= thisMonday && key <= today) {
      current += value;
    } else if (key >= lastMonday && key <= thenKey) {
      const t = Number(timeOf(row));
      if (key === thenKey && Number.isFinite(t) && t > then.getTime()) continue;
      previous += value;
    }
  }
  if (!(previous > 0)) return null;
  return { current, previous, pct: Math.round(((current - previous) / previous) * 100) };
}
