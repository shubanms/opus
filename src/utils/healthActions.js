import { db } from '../db/db.js';
import { todayKey } from './dateKey.js';
import { ACTIVITY_FIELDS, BODY_FIELDS, LIMITS, SLEEP_FIELDS, isEmptyEntry } from './health.js';

// Body stats, sleep and daily activity: one row per local calendar day.
//
// Every write is a *patch*: a field that is `undefined` is left alone, `null`
// clears it. The old writers replaced whole rows, so saving the sleep form to
// add a star rating wiped the hours, and "Log a day" with the water field blank
// turned six glasses into none. Validation lives in health.js and runs in the
// forms, where it can say what is wrong; these only refuse what the forms
// would have refused (cleanPatch).

const TABLES = {
  body: { table: () => db.bodyStats, fields: BODY_FIELDS },
  sleep: { table: () => db.sleepLogs, fields: SLEEP_FIELDS },
  activity: { table: () => db.dailyLogs, fields: ACTIVITY_FIELDS },
};

// The forms validate and explain; this is the backstop for callers that don't
// (Settings and onboarding write a bodyweight straight in). An impossible value
// is dropped rather than stored — a "-80" saved here once became the
// bodyweight every bodyweight set was multiplied by.
function cleanPatch(fields, patch) {
  const out = {};
  for (const f of fields) {
    const v = patch?.[f];
    if (v === undefined) continue;
    if (v === null || v === '') {
      out[f] = null;
      continue;
    }
    const n = Number(v);
    if (!Number.isFinite(n)) continue;
    if (f === 'quality') {
      out[f] = n >= 1 && n <= 5 ? Math.round(n) : null;
      continue;
    }
    const lim = LIMITS[f];
    if (lim && (n < lim.min || n > lim.max)) continue;
    out[f] = n;
  }
  return out;
}

/** The stored row for a local date key, or null. */
export async function getEntry(kind, date) {
  if (!date || !TABLES[kind]) return null;
  return (await TABLES[kind].table().where('date').equals(date).first()) ?? null;
}

/**
 * Apply a patch to the row for `date`, creating it if needed. A row left with
 * nothing in it is deleted rather than kept as an empty line in the log.
 * Returns the row id, or null when the day ended up empty.
 */
async function patchDay(kind, date, patch) {
  const { table, fields } = TABLES[kind];
  const t = table();
  const clean = cleanPatch(fields, patch);
  const existing = await t.where('date').equals(date).first();
  const next = { ...(existing ?? { date }), ...clean };
  if (isEmptyEntry(next, fields)) {
    if (existing) await t.delete(existing.id);
    return null;
  }
  if (existing) {
    if (Object.keys(clean).length) await t.update(existing.id, clean);
    return existing.id;
  }
  return t.add(next);
}

/** Upsert a body-stat entry: weight (kg), bodyFat (%), chest/waist/hips/arms/thighs (cm). */
export function logBodyStat({ date = todayKey(), ...patch } = {}) {
  return patchDay('body', date, patch);
}

/** Upsert a sleep entry: hours, quality (1–5). */
export function logSleep({ date = todayKey(), ...patch } = {}) {
  return patchDay('sleep', date, patch);
}

/** Upsert a day's activity: steps, water (glasses). Any date — used by the log. */
export function logActivity({ date = todayKey(), ...patch } = {}) {
  return patchDay('activity', date, patch);
}

/** Set a day's step total (today unless told otherwise). */
export function setSteps(steps, date = todayKey()) {
  return logActivity({ date, steps });
}

/** Add (or remove) glasses of water for a day (today unless told otherwise). */
export async function addWater(delta, date = todayKey()) {
  const e = await getEntry('activity', date);
  const water = Math.max(0, (e?.water || 0) + delta);
  if (!e && water === 0) return null;
  return logActivity({ date, water });
}

/**
 * Delete a row; returns the snapshot `deleteWithUndo` hands back to
 * `restoreEntry`. It also notes which other rows that day already had, so a
 * restore can tell "logged again since" from "was always there".
 */
async function deleteRow(kind, id) {
  const t = TABLES[kind].table();
  const row = await t.get(id);
  if (!row) return null;
  await t.delete(id);
  const siblings = row.date ? await t.where('date').equals(row.date).primaryKeys() : [];
  return { kind, row, siblings };
}

export const deleteBodyStat = (id) => deleteRow('body', id);
export const deleteSleep = (id) => deleteRow('sleep', id);
export const deleteActivity = (id) => deleteRow('activity', id);

/**
 * Put a deleted entry back, exactly as it was.
 *
 * The one exception: if the same day was logged again *after* the delete
 * (open the form, save, then hit Undo), putting the old row back would leave
 * two entries for one day. Then the newer entry wins and the deleted one only
 * fills in what it is missing.
 */
export async function restoreEntry(snapshot) {
  const { kind, row, siblings = [] } = snapshot ?? {};
  if (!row || !TABLES[kind]) return;
  const { table, fields } = TABLES[kind];
  const t = table();
  const before = new Set(siblings);
  const since = (await t.where('date').equals(row.date).toArray()).filter((r) => !before.has(r.id));
  if (!since.length) {
    await t.put(row);
    return;
  }
  const now = since[since.length - 1];
  const fill = {};
  for (const f of fields) if (now[f] == null && row[f] != null) fill[f] = row[f];
  if (Object.keys(fill).length) await t.update(now.id, fill);
}

// Most recent logged bodyweight (kg), or null. `> 0` rather than `!= null`: a
// "-80" saved before entries were validated would otherwise still be the
// bodyweight every bodyweight set is multiplied by.
export async function getCurrentBodyweight() {
  const latest = await db.bodyStats.orderBy('date').reverse().filter((s) => s.weight > 0).first();
  return latest?.weight ?? null;
}
