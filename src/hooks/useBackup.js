import { useCallback, useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db.js';
import useSettingsStore from '../store/settingsStore.js';
import useUIStore from '../store/uiStore.js';
import { buildBackup, exportData, shareBackup } from '../utils/dataActions.js';
import { BACKUP, backupSignature, backupStatus, looksWiped, shouldBackup } from '../utils/backup.js';
import { seedDatabase } from '../utils/wger.js';
import { healRecords } from '../utils/workoutActions.js';

/**
 * Mend the data before anything reads it for a backup: put back missing stock
 * exercises, give orphaned ids their rows (see utils/catalogue.js), and re-date
 * records an older build stamped "now". Once per app open; cheap when there is
 * nothing to do, which is almost always.
 *
 * This is what heals a device that already restored a broken backup — and it
 * runs before the weekly backup is built, because the last time a catalogue
 * broke, the very next automatic backup saved the broken state over the good
 * one.
 */
let healing = null;
function healOnce() {
  healing ??= (async () => {
    try {
      await seedDatabase();
      await healRecords();
    } catch (e) {
      // Never let a repair stop the app (or the backup) it is protecting.
      console.error('Startup repair failed:', e);
      healing = null;
    }
  })();
  return healing;
}

// The weekly backup, and the alarm for when it was needed and wasn't there.
//
// One honest limitation, stated here because it shapes everything below: a
// browser can refuse a download that no tap asked for. There is no way to detect
// that it did. So this never quietly congratulates itself — the age of the last
// backup stays visible on Home, and a wipe is announced rather than absorbed.

/** Live status of the last backup, for anything that wants to display it. */
export function useBackupStatus() {
  const lastBackupAt = useSettingsStore((s) => s.lastBackupAt);
  // Re-evaluated on mount rather than on a timer: nothing here changes fast
  // enough that a day boundary needs to be caught mid-session.
  const [now] = useState(() => Date.now());
  return backupStatus(lastBackupAt, now);
}

/**
 * Is the app looking at the aftermath of a wipe?
 *
 * Onboarded, with a history that used to exist and now doesn't. A brand-new
 * account is empty too, which is why `hadData` is remembered separately — in
 * localStorage, so it survives the IndexedDB-only wipe it exists to detect.
 */
export function useWipeCheck() {
  const workouts = useLiveQuery(() => db.workouts.count(), []);
  const onboarded = useSettingsStore((s) => s.onboarded);
  const hadData = useSettingsStore((s) => s.hadData);
  const lastKnownWorkouts = useSettingsStore((s) => s.lastKnownWorkouts);
  const noteData = useSettingsStore((s) => s.noteData);

  useEffect(() => {
    if (workouts !== undefined) noteData(workouts);
  }, [workouts, noteData]);

  // `undefined` means the query has not resolved; treating that as zero would
  // accuse the app of losing everything on every cold boot.
  if (workouts === undefined) return null;
  if (!looksWiped({ onboarded, hadData, workouts })) return null;
  return { lost: lastKnownWorkouts };
}

/** Run a backup now, on purpose. Returns the fingerprint that was written. */
export function useRunBackup() {
  const recordBackup = useSettingsStore((s) => s.recordBackup);
  return useCallback(async () => {
    const { payload } = await exportData();
    const sig = backupSignature(payload);
    recordBackup(Date.now(), sig);
    return sig;
  }, [recordBackup]);
}

/**
 * Push a copy off the device entirely. Resolves 'shared', 'cancelled' (the
 * sheet was dismissed — nothing happened, say nothing) or 'downloaded' (no
 * Web Share here, or it failed, so the copy went to Downloads instead).
 *
 * Dismissing the sheet used to download anyway, which is not what "close"
 * means; and the signature recorded is of the payload actually shared, not a
 * second one built afterwards.
 */
export function useShareBackup() {
  const runBackup = useRunBackup();
  const recordBackup = useSettingsStore((s) => s.recordBackup);
  return useCallback(async () => {
    const { outcome, payload } = await shareBackup();
    if (outcome === 'shared') {
      recordBackup(Date.now(), backupSignature(payload));
      return 'shared';
    }
    if (outcome === 'cancelled') return 'cancelled';
    await runBackup();
    return 'downloaded';
  }, [runBackup, recordBackup]);
}

/**
 * The weekly write itself.
 *
 * Deliberately cheap when there is nothing to do: the payload is only built
 * once a backup is actually due, so the common case is a single date
 * comparison. When it is due, the payload is hashed against the last one — a
 * week with no new training writes no file, which is the whole answer to "don't
 * fill my Downloads folder".
 */
export function useAutoBackup() {
  const enabled = useSettingsStore((s) => s.autoBackup);
  const onboarded = useSettingsStore((s) => s.onboarded);
  const lastBackupAt = useSettingsStore((s) => s.lastBackupAt);
  const lastBackupSig = useSettingsStore((s) => s.lastBackupSig);
  const recordBackup = useSettingsStore((s) => s.recordBackup);

  // Mounted once in AppLayout, so this is the one place every app open passes
  // through — whichever screen it opens on.
  useEffect(() => {
    healOnce();
  }, []);

  // biome-ignore lint/correctness/useExhaustiveDependencies: runs once per app open. lastBackupAt/lastBackupSig/recordBackup are read at run time; tracking them would fire a second backup the instant the first records itself.
  useEffect(() => {
    if (!enabled || !onboarded) return;
    let cancelled = false;

    (async () => {
      try {
        await healOnce();
        const status = backupStatus(lastBackupAt);
        if (status.state === BACKUP.FRESH) return;

        // There is no point backing up an account with nothing in it — and
        // doing so right after a wipe would overwrite nothing but would look
        // like reassurance.
        if ((await db.workouts.count()) === 0) return;

        const sig = backupSignature(await buildBackup());
        if (cancelled) return;
        if (!shouldBackup({ status, signature: sig, lastSignature: lastBackupSig })) {
          // Nothing new. Stamp the check so tomorrow's open does not rebuild
          // the whole payload again, but keep the old fingerprint.
          recordBackup(Date.now(), lastBackupSig);
          return;
        }

        await exportData();
        recordBackup(Date.now(), sig);
        useUIStore.getState().showToast('Weekly backup saved to Downloads', { type: 'success' });
      } catch (e) {
        // A failed backup must never break the app it is protecting.
        console.error('Auto-backup failed:', e);
      }
    })();

    return () => { cancelled = true; };
  }, [enabled, onboarded]);
}
