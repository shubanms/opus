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

import { todayKey } from './dateKey.js';

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

/** Sortable and dated, so a year of them bulk-deletes in one gesture. */
export function backupFilename(date = new Date()) {
  return `opus-backup-${todayKey(date)}.json`;
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
 * The stock exercise catalogue is re-seeded on first boot and identical in
 * every backup, so carrying it is 16 KB of the same 82 rows every week. Only
 * the ones the user actually made are theirs to lose.
 */
export function slimExercises(exercises = []) {
  return (exercises ?? []).filter((e) => e?.isCustom);
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
