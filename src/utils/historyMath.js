// The arithmetic behind editing history after the fact.
//
// A saved workout carries numbers derived from its sets — total volume, the
// working-set count, the XP it earned, the calories it burned — and the record
// rows point back at the sets that set them. Editing a set, adding a forgotten
// one, deleting one or moving the session to another day all have to move
// those numbers with it, or History, Profile and the records quietly disagree.
//
// Pure + unit-tested; the DB side is in `workoutActions.js`.

import { calcSetXP } from './rpg.js';
import { setLoad } from './volume.js';
import { isRecordSet, recordValue } from './records.js';
import { parseKey } from './dateKey.js';

// ---------------------------------------------------------------------------
// Totals + XP
// ---------------------------------------------------------------------------

/**
 * A workout's stored totals, from its sets — the same arithmetic the session
 * used when it was saved: volume over working sets with bodyweight added for
 * bodyweight lifts (at the bodyweight stored on the row), and every non-warm-up
 * set counted, cardio included.
 */
export function workoutTotals(sets, { bodyweightKg = null, bodyweightIds = new Set() } = {}) {
  const working = (sets ?? []).filter((s) => s && !s.isWarmup);
  let volume = 0;
  for (const s of working) {
    volume += setLoad(s.weight, bodyweightIds.has(s.exerciseId), bodyweightKg) * (s.reps || 0);
  }
  return { totalVolume: Math.round(volume), totalSets: working.length };
}

/**
 * What a saved set added to its workout's XP, at base rate: the set's
 * weight × reps XP plus the crit/combo bonus stored on it. Warm-ups earn
 * nothing, as at the end of a session.
 *
 * The end-of-session total also weighted each set by intensity and effort.
 * Those multipliers are NOT re-scored when history is edited — they depended on
 * the records as they stood that day, which an edit cannot reconstruct — so a
 * correction moves XP by the base difference only.
 */
export function setXp(set) {
  if (!set || set.isWarmup) return 0;
  return calcSetXP(Number(set.weight) || 0, Number(set.reps) || 0) + (Number(set.bonusXp) || 0);
}

/** XP change from replacing `before` with `after` (either may be null). */
export function setXpDelta(before, after) {
  return setXp(after) - setXp(before);
}

/**
 * Apply an XP change without letting a workout go below zero. Returns the
 * change actually made, which is what an undo must reverse — reversing the
 * requested change would mint XP whenever the floor was hit.
 */
export function applyXpDelta(current, delta) {
  const base = Number(current) || 0;
  const next = Math.max(0, base + (Number(delta) || 0));
  return { xpEarned: next, applied: next - base };
}

/** Calories a set carries on its own (cardio bouts only — lifting is per session). */
export function setKcal(set) {
  return set?.isCardio ? Number(set.calories) || 0 : 0;
}

// ---------------------------------------------------------------------------
// Record rows
// ---------------------------------------------------------------------------

/**
 * Turn freshly derived records into the smallest set of writes.
 *
 * A record that is still held by the same workout at the same value is left
 * exactly as it is — its row id, and the moment it was stamped when the
 * session was saved. Only records that changed hands (or value) are rewritten,
 * with the date of the set that now holds them. Rebuilding every row from
 * scratch is what used to re-date every surviving record to "now".
 */
export function mergeRecordRows(oldRows = [], freshRows = []) {
  const byType = new Map();
  const del = [];
  for (const row of oldRows) {
    // Two rows for one type is a leftover from a race; keep the first.
    if (byType.has(row.type)) del.push(row.id);
    else byType.set(row.type, row);
  }
  const put = [];
  const add = [];
  for (const fresh of freshRows) {
    const old = byType.get(fresh.type);
    byType.delete(fresh.type);
    if (!old) add.push(fresh);
    else if (old.workoutId == null || old.workoutId !== fresh.workoutId || old.value !== fresh.value) {
      put.push({ ...old, ...fresh, id: old.id });
    }
  }
  for (const stale of byType.values()) del.push(stale.id);
  return { put, add, del };
}

/** Rows present before and gone after, matched by id. */
export function removedRows(before = [], after = []) {
  const kept = new Set(after.map((r) => r.id));
  return before.filter((r) => !kept.has(r.id));
}

// ---------------------------------------------------------------------------
// Display
// ---------------------------------------------------------------------------

const byNumberThenId = (a, b) => (a.setNumber ?? 0) - (b.setNumber ?? 0) || (a.id ?? 0) - (b.id ?? 0);

/**
 * A workout's sets grouped by exercise, in the order the exercises were done.
 *
 * Sets are written exercise by exercise in session order, so the first id an
 * exercise owns is its place in the session. Grouping into a plain object
 * instead sorted exercises by catalogue id — Bench Press (3) always above
 * Squat (60), whatever you actually did first.
 */
export function groupSetsInOrder(sets) {
  const groups = new Map();
  for (const s of [...(sets ?? [])].sort((a, b) => (a.id ?? 0) - (b.id ?? 0))) {
    if (!groups.has(s.exerciseId)) groups.set(s.exerciseId, []);
    groups.get(s.exerciseId).push(s);
  }
  return [...groups].map(([exerciseId, list]) => ({ exerciseId, sets: list.sort(byNumberThenId) }));
}

/**
 * The sets in this workout that hold a record today: for each record row
 * pointing at the workout, the first set (in the order logged) that reached
 * its value. One trophy per set, however many record types it holds.
 */
export function recordSetIds(sets, prRows, workoutId) {
  const ids = new Set();
  for (const p of prRows ?? []) {
    if (p?.workoutId == null || p.workoutId !== workoutId) continue;
    const holder = (sets ?? [])
      .filter((s) => s.exerciseId === p.exerciseId && isRecordSet(s) && recordValue(s, p.type) >= p.value - 1e-9)
      .sort((a, b) => (a.completedAt ?? 0) - (b.completedAt ?? 0) || byNumberThenId(a, b))[0];
    if (holder) ids.add(holder.id);
  }
  return ids;
}

/**
 * Would deleting this set leave its session with no working set? A session
 * like that is one the app never saves (finishing with nothing logged discards
 * it), yet it would still count as a day trained, with its XP — so the delete
 * takes the session with it.
 */
export function leavesSessionEmpty(set, sessionSets) {
  const others = (sessionSets ?? []).filter((s) => s.id !== set?.id);
  return others.length === 0 || (!set?.isWarmup && !others.some((s) => !s.isWarmup));
}

/** The next set number for an exercise within a workout's sets. */
export function nextSetNumber(sets, exerciseId) {
  return (sets ?? []).filter((s) => s.exerciseId === exerciseId).reduce((m, s) => Math.max(m, s.setNumber ?? 0), 0) + 1;
}

// ---------------------------------------------------------------------------
// Moving a session to another day
// ---------------------------------------------------------------------------

/** Signed whole local days from one date key to another (null if either is bad). */
export function dayDelta(fromKey, toKey) {
  const a = parseKey(fromKey);
  const b = parseKey(toKey);
  if (!a || !b) return null;
  return Math.round((b - a) / 86400000);
}

/** The same local clock time, `days` calendar days later (DST-safe). */
export function shiftTimestamp(ms, days) {
  if (!Number.isFinite(ms) || !days) return ms;
  const d = new Date(ms);
  d.setDate(d.getDate() + days);
  return d.getTime();
}

/**
 * Everything that has to move when a session is re-dated.
 *
 * The session keeps its clock time on the new day, so it still sorts sensibly
 * against other sessions that day; its sets and the records it holds move by
 * the same offset, so a record keeps pointing at the day it was really set.
 * Moving a session onto today never puts it in the future: the whole session
 * slides back to end now instead.
 *
 * @returns null when the move is not allowed (bad date, future date, no-op),
 *          else `{ offset, workout: patch, sets: [{id, completedAt}],
 *          records: [{id, achievedAt}] }`.
 */
export function planDateMove({ workout, sets = [], records = [], toKey, todayKey: today, now = Date.now() }) {
  if (!workout || !parseKey(toKey)) return null;
  if (today && toKey > today) return null;
  const days = dayDelta(workout.date, toKey);
  if (days == null || days === 0) return null;

  const anchor = Number.isFinite(workout.createdAt) ? workout.createdAt : parseKey(workout.date).getTime();
  let offset = shiftTimestamp(anchor, days) - anchor;
  // Only reachable when moving onto today before that clock time comes round.
  if (anchor + offset > now) offset = now - anchor;
  const move = (ms) => (Number.isFinite(ms) && ms > 0 ? ms + offset : ms);

  const patch = { date: toKey };
  if (Number.isFinite(workout.createdAt)) patch.createdAt = move(workout.createdAt);
  if (Number.isFinite(workout.startedAt)) patch.startedAt = move(workout.startedAt);
  return {
    offset,
    workout: patch,
    sets: sets.filter((s) => Number.isFinite(s.completedAt)).map((s) => ({ id: s.id, completedAt: move(s.completedAt) })),
    records: records
      .filter((r) => r.workoutId === workout.id && Number.isFinite(r.achievedAt))
      .map((r) => ({ id: r.id, achievedAt: move(r.achievedAt) })),
  };
}
