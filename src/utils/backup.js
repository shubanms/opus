// When to back up, what to call it, and whether anything actually changed.
//
// Written after a user lost a month of training to Chrome's "Delete browsing
// data". Everything OPUS knows lives in IndexedDB, which the browser files
// under "cookies, cache and other site data" — one tap, no confirmation, no
// undo. Nothing *inside* the browser survives that: not IndexedDB, not
// localStorage, not OPFS, not the cache. The only thing that does is an
// ordinary file in the Downloads folder.
//
// So the backup is not a power-user convenience. It is the only copy of the
// data that can survive the most ordinary thing a phone owner does, and the app
// has to take responsibility for making it happen rather than leaving a "keep a
// recent backup" note in Settings for someone to find too late.
//
// Pure + unit-tested.

import { friendlyDate, todayKey } from './dateKey.js';
import { isPristineStock } from './catalogue.js';

/** How often a backup is written when the data has changed. */
export const BACKUP_INTERVAL_DAYS = 7;
/** When the reminder stops being a note and starts being a warning. */
export const STALE_DAYS = 21;

export const BACKUP = {
  /** No backup has ever been taken — including "the one we had was wiped too". */
  NEVER: 'never',
  FRESH: 'fresh',
  DUE: 'due',
  STALE: 'stale',
};

const DAY = 86400000;

/**
 * How the backup is doing, right now.
 *
 * A clock that has gone backwards reads as fresh rather than as a negative age:
 * travelling across a date line should not trigger a warning.
 */
export function backupStatus(lastAt, now = Date.now(), intervalDays = BACKUP_INTERVAL_DAYS) {
  if (!Number.isFinite(lastAt) || lastAt <= 0) return { state: BACKUP.NEVER, days: null };
  const days = Math.max(0, Math.floor((now - lastAt) / DAY));
  if (days >= STALE_DAYS) return { state: BACKUP.STALE, days };
  if (days >= intervalDays) return { state: BACKUP.DUE, days };
  return { state: BACKUP.FRESH, days };
}

/** One phrase per state, so Home and Settings cannot word it differently. */
export function backupLabel(status) {
  const s = status ?? {};
  // Anything we cannot read is "never", not "undefined days ago". This label is
  // the only thing telling someone whether a copy of their history exists, so
  // it errs towards the answer that makes them go and check.
  if (s.state === BACKUP.NEVER || !Number.isFinite(s.days)) return 'Never backed up';
  if (s.days === 0) return 'Backed up today';
  if (s.days === 1) return 'Backed up yesterday';
  return `Backed up ${s.days} days ago`;
}

/**
 * Sortable and dated, so a year of them bulk-deletes in one gesture.
 *
 * `ext` is 'txt' for the copy handed to the share sheet: Chromium's Web Share
 * only accepts an allowlist of file types and JSON is not on it, so a `.json`
 * share was refused outright and quietly became a download. The content is the
 * same JSON either way, and the importer reads both. (An options object, not a
 * second argument, so `dates.map(backupFilename)` keeps working.)
 */
export function backupFilename(date = new Date(), { ext = 'json' } = {}) {
  return `opus-backup-${todayKey(date)}.${ext}`;
}

/**
 * A cheap, exact fingerprint of a backup payload.
 *
 * Row counts alone would miss an edit — renaming a routine or correcting a set
 * changes nothing countable — so this hashes the serialised payload itself.
 * FNV-1a rather than `crypto.subtle` because this has to be callable
 * synchronously from a place that is already deciding whether to do any work.
 */
export function fingerprint(text) {
  let h = 2166136261 >>> 0;
  const s = String(text ?? '');
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(36);
}

/**
 * The fingerprint of a backup's *contents*.
 *
 * Deliberately hashes `payload.data` and not the payload: the envelope carries
 * `exportedAt`, which changes on every build, so hashing the whole thing makes
 * every backup look different from the last one and the "only write when
 * something changed" rule silently never fires. Caught by an end-to-end test
 * that expected no second file and got one.
 */
export function backupSignature(payload) {
  if (!payload?.data) return null;
  return fingerprint(JSON.stringify(payload.data));
}

/**
 * The exercise rows worth carrying in a backup: everything except a pristine
 * stock row, which the app can put back at the same id on its own.
 *
 * This used to keep `isCustom` rows only, which is how a restore lost the
 * whole catalogue: the 8 cardio machines are not custom but have no fixed ids,
 * and a stock favourite or colour is user state that was silently dropped. See
 * `catalogue.isPristineStock` for the exact rule.
 */
export function slimExercises(exercises = []) {
  return (exercises ?? []).filter((e) => e && !isPristineStock(e));
}

/**
 * Should a backup be written now?
 *
 * Two gates, and the second is the one that keeps the Downloads folder sane: a
 * week where nothing was logged produces no file at all, because there is
 * nothing in it that the last one does not already have.
 */
export function shouldBackup({ status, signature, lastSignature } = {}) {
  if (status?.state === BACKUP.FRESH) return false;
  if (!signature) return false;
  return signature !== lastSignature;
}

/**
 * Did the data vanish out from under us?
 *
 * `hadData` is remembered the first time anything is logged. Onboarded, with a
 * history that used to exist and now does not, is not a new account — it is the
 * signature of a wipe, and the app has to say so the moment it sees it rather
 * than showing a cheerful set of zeroes.
 */
export function looksWiped({ onboarded, hadData, workouts } = {}) {
  return Boolean(onboarded) && Boolean(hadData) && (workouts ?? 0) === 0;
}

// ---------------------------------------------------------------------------
// Reading a backup back in
//
// Importing replaces everything, so nothing may be touched until the file has
// been shown to be an OPUS backup. Before this, any JSON was accepted — another
// app's settings export cleared every table and restored nothing. Validation,
// the preview and the import all go through the same functions, so what the
// preview promises is exactly what the import will accept.
// ---------------------------------------------------------------------------

const isPlainObject = (v) => v != null && typeof v === 'object' && !Array.isArray(v);
const NOTHING_CHANGED = 'Nothing was changed.';

/** Text (or an already-parsed object) → `{ ok, value }` or `{ ok: false, error }`. */
export function parseBackupText(input) {
  if (isPlainObject(input)) return { ok: true, value: input };
  if (typeof input !== 'string' || !input.trim()) {
    return { ok: false, error: `That file is empty. ${NOTHING_CHANGED}` };
  }
  try {
    // A byte-order mark is legal in a text file and fatal to JSON.parse.
    return { ok: true, value: JSON.parse(input.charCodeAt(0) === 0xfeff ? input.slice(1) : input) };
  } catch {
    return { ok: false, error: `That file isn't an OPUS backup — it can't be read as one. ${NOTHING_CHANGED}` };
  }
}

/**
 * Is this an OPUS backup we can restore? `{ ok, data, prefs }` or
 * `{ ok: false, error }`, with an error a person can act on.
 */
export function validateBackup(parsed) {
  const fail = (error) => ({ ok: false, error });
  if (!isPlainObject(parsed)) return fail(`That file isn't an OPUS backup. ${NOTHING_CHANGED}`);
  if (parsed.app !== 'OPUS' && !Array.isArray(parsed.data?.workouts)) {
    return fail(`That file isn't an OPUS backup — it looks like it came from another app. ${NOTHING_CHANGED}`);
  }
  const data = parsed.data;
  if (!isPlainObject(data) || !Array.isArray(data.workouts)) {
    return fail(`That backup is damaged — it has no workout list. ${NOTHING_CHANGED}`);
  }
  for (const [name, rows] of Object.entries(data)) {
    if (rows == null) continue;
    if (!Array.isArray(rows) || rows.some((r) => !isPlainObject(r))) {
      return fail(`That backup is damaged (its "${name}" list is unreadable). ${NOTHING_CHANGED}`);
    }
  }
  return { ok: true, data, prefs: isPlainObject(parsed.prefs) ? parsed.prefs : null };
}

/** What a valid backup holds, for a "restore this?" preview. */
export function summarizeBackup(parsed) {
  const data = isPlainObject(parsed?.data) ? parsed.data : {};
  const len = (k) => (Array.isArray(data[k]) ? data[k].length : 0);
  const dates = (Array.isArray(data.workouts) ? data.workouts : [])
    .map((w) => w?.date)
    .filter((d) => typeof d === 'string' && d)
    .sort();
  const exportedAt =
    typeof parsed?.exportedAt === 'string' && !Number.isNaN(Date.parse(parsed.exportedAt)) ? parsed.exportedAt : null;
  return {
    exportedAt,
    counts: {
      workouts: len('workouts'),
      sets: len('sets'),
      customExercises: (Array.isArray(data.exercises) ? data.exercises : []).filter((e) => e?.isCustom).length,
      routines: len('templates'),
      records: len('prs'),
      bodyStats: len('bodyStats'),
      sleepLogs: len('sleepLogs'),
      dailyLogs: len('dailyLogs'),
      achievements: len('achievements'),
      questClaims: len('questClaims'),
      notes: len('exerciseNotes'),
    },
    firstWorkout: dates[0] ?? null,
    lastWorkout: dates.at(-1) ?? null,
    hasPrefs: isPlainObject(parsed?.prefs),
  };
}

/**
 * Look at a backup without restoring it: `{ ok, error?, exportedAt, counts,
 * firstWorkout, lastWorkout, hasPrefs }`. Never throws.
 */
export function inspectBackupText(input) {
  const parsed = parseBackupText(input);
  if (!parsed.ok) return { ok: false, error: parsed.error, exportedAt: null, counts: null };
  const valid = validateBackup(parsed.value);
  if (!valid.ok) return { ok: false, error: valid.error, exportedAt: null, counts: null };
  return { ok: true, ...summarizeBackup(parsed.value) };
}

const plural = (n, one, many = `${one}s`) => `${n.toLocaleString('en')} ${n === 1 ? one : many}`;

/**
 * The preview, in words: "Backup from 30 Sep" / "142 workouts · 2,318 sets ·
 * 1 custom exercise · 3 routines". Pure so the wording is tested once.
 */
export function describeBackup(summary, now = new Date()) {
  const at = summary?.exportedAt ? new Date(summary.exportedAt) : null;
  const title =
    at && !Number.isNaN(at.getTime()) ? `Backup from ${friendlyDate(todayKey(at), now)}` : 'Backup (date unknown)';
  const c = summary?.counts ?? {};
  const parts = [plural(c.workouts ?? 0, 'workout'), plural(c.sets ?? 0, 'set')];
  if (c.customExercises) parts.push(plural(c.customExercises, 'custom exercise'));
  if (c.routines) parts.push(plural(c.routines, 'routine'));
  return { title, detail: parts.join(' · ') };
}

// ---------------------------------------------------------------------------
// Settings that live outside the database
//
// The economy and the preferences are in localStorage, not IndexedDB, so a
// backup of the tables alone restored a phone with no cosmetics, no dungeon
// Iron, no record of rest tokens spent, and weights back in kg. They travel as
// a top-level `prefs` — outside `data`, so they never move the "has anything
// changed?" signature and a theme toggle does not write a new weekly file.
// ---------------------------------------------------------------------------

const isBool = (v) => typeof v === 'boolean';
const isAmount = (v) => typeof v === 'number' && Number.isFinite(v) && v >= 0;
const isPositive = (v) => typeof v === 'number' && Number.isFinite(v) && v > 0;

/**
 * Exactly what a backup carries, and what each value must look like to be
 * restored. Anything that fails its check is skipped rather than trusted — a
 * hand-edited file must not be able to put the store in a state no screen
 * expects. Bookkeeping (`lastBackupAt`, `hadData`, coach marks…) is
 * deliberately absent: it describes this device, not the person.
 */
export const BACKUP_PREFS = {
  unit: (v) => v === 'kg' || v === 'lbs',
  barWeight: isAmount,
  theme: (v) => typeof v === 'string' && v.length > 0,
  effects: isBool,
  sound: isBool,
  themeOnOpen: isBool,
  restDuration: isPositive,
  stepGoal: isPositive,
  waterGoal: isPositive,
  inventory: isPlainObject,
  tokensSpent: isAmount,
  tokensPurchased: isAmount,
  shieldedLapseDate: (v) => v === null || typeof v === 'string',
  ironSpent: isAmount,
  ownedCosmetics: (v) => Array.isArray(v) && v.every((x) => typeof x === 'string'),
  equipped: isPlainObject,
  dungeonIron: isAmount,
  lastDungeonClaim: (v) => typeof v === 'string',
  autoBackup: isBool,
};
export const BACKUP_PREF_KEYS = Object.keys(BACKUP_PREFS);

/** The allowlisted, well-formed subset of a prefs object (either direction). */
export function pickBackupPrefs(prefs) {
  const out = {};
  if (!isPlainObject(prefs)) return out;
  for (const key of BACKUP_PREF_KEYS) {
    if (key in prefs && BACKUP_PREFS[key](prefs[key])) out[key] = prefs[key];
  }
  return out;
}

/**
 * The settings-store patch an import applies. A restored device is an
 * onboarded one — the tour is not replayed over someone's own history — and,
 * when the backup holds sessions, one that has had data, so the wipe alarm is
 * armed from the first open. (Restoring an empty backup must not arm it: zero
 * workouts plus `hadData` is exactly what the alarm fires on.)
 */
export function prefsFromBackup(prefs, { hadData = true } = {}) {
  return { ...pickBackupPrefs(prefs), onboarded: true, tourSeen: true, ...(hadData ? { hadData: true } : {}) };
}

/** Monthly character snapshots ride along with the prefs (`opus_snapshots`). */
export function snapshotsFromBackup(prefs) {
  return isPlainObject(prefs?.snapshots) ? prefs.snapshots : null;
}

/**
 * A raw dump of the database (every object store, read without Dexie) as a
 * restorable backup. Used by the recovery screen before a rebuild — when the
 * database cannot be opened normally this may be the last copy there is, so it
 * is written in the envelope the importer accepts.
 *
 * Progress photos are left out: they are image blobs, which JSON cannot hold.
 */
export function rawDumpToBackup({ version = null, stores = {} } = {}, now = new Date()) {
  const data = {};
  for (const [name, rows] of Object.entries(stores ?? {})) {
    if (name === 'photos') continue;
    data[name] = Array.isArray(rows) ? rows : [];
  }
  if (!Array.isArray(data.workouts)) data.workouts = [];
  return { app: 'OPUS', version: 1, exportedAt: now.toISOString(), source: 'rescue', idbVersion: version, data };
}
