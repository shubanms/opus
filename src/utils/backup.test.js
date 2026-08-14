import { describe, it, expect } from 'vitest';
import {
  BACKUP,
  BACKUP_INTERVAL_DAYS,
  STALE_DAYS,
  backupFilename,
  backupLabel,
  backupStatus,
  fingerprint,
  backupSignature,
  looksWiped,
  shouldBackup,
  slimExercises,
} from './backup.js';

const NOW = new Date(2026, 7, 14, 12, 0, 0).getTime();
const daysAgo = (n) => NOW - n * 86400000;

describe('backupStatus', () => {
  it('treats a never-backed-up account as its own state', () => {
    // Not "0 days ago". Never is the state that needs the loudest prompt, and
    // it is also what a wipe leaves behind, since the record went with it.
    expect(backupStatus(null, NOW).state).toBe(BACKUP.NEVER);
    expect(backupStatus(0, NOW).state).toBe(BACKUP.NEVER);
    expect(backupStatus(undefined, NOW).days).toBe(null);
  });

  it('is fresh inside the interval and due at it', () => {
    expect(backupStatus(daysAgo(0), NOW).state).toBe(BACKUP.FRESH);
    expect(backupStatus(daysAgo(6), NOW).state).toBe(BACKUP.FRESH);
    expect(backupStatus(daysAgo(BACKUP_INTERVAL_DAYS), NOW).state).toBe(BACKUP.DUE);
  });

  it('turns stale when a reminder should become a warning', () => {
    expect(backupStatus(daysAgo(STALE_DAYS - 1), NOW).state).toBe(BACKUP.DUE);
    expect(backupStatus(daysAgo(STALE_DAYS), NOW).state).toBe(BACKUP.STALE);
    expect(backupStatus(daysAgo(90), NOW).days).toBe(90);
  });

  it('does not panic about a clock that went backwards', () => {
    // Crossing a date line should not read as a negative age or a warning.
    const future = NOW + 3 * 86400000;
    expect(backupStatus(future, NOW).state).toBe(BACKUP.FRESH);
    expect(backupStatus(future, NOW).days).toBe(0);
  });

  it('honours a custom interval', () => {
    expect(backupStatus(daysAgo(3), NOW, 2).state).toBe(BACKUP.DUE);
    expect(backupStatus(daysAgo(3), NOW, 30).state).toBe(BACKUP.FRESH);
  });
});

describe('backupLabel', () => {
  it('words each state once, for every screen', () => {
    expect(backupLabel(backupStatus(null, NOW))).toBe('Never backed up');
    expect(backupLabel(backupStatus(daysAgo(0), NOW))).toBe('Backed up today');
    expect(backupLabel(backupStatus(daysAgo(1), NOW))).toBe('Backed up yesterday');
    expect(backupLabel(backupStatus(daysAgo(9), NOW))).toBe('Backed up 9 days ago');
  });

  it('survives junk', () => {
    expect(backupLabel(undefined)).toBe('Never backed up');
    expect(backupLabel({})).toBe('Never backed up');
  });
});

describe('backupFilename', () => {
  it('is dated and sorts chronologically', () => {
    // A year of these has to bulk-delete in one gesture, which means the name
    // has to sort the same way the dates do.
    expect(backupFilename(new Date(2026, 7, 14))).toBe('opus-backup-2026-08-14.json');
    const names = [new Date(2026, 0, 5), new Date(2026, 10, 2), new Date(2026, 7, 14)]
      .map(backupFilename);
    expect([...names].sort()).toEqual([
      'opus-backup-2026-01-05.json',
      'opus-backup-2026-08-14.json',
      'opus-backup-2026-11-02.json',
    ]);
  });
});

describe('fingerprint', () => {
  it('notices an edit that changes no counts at all', () => {
    // The whole reason this hashes the payload instead of counting rows:
    // correcting a weight or renaming a routine changes nothing countable.
    const a = JSON.stringify({ sets: [{ id: 1, weight: 60 }] });
    const b = JSON.stringify({ sets: [{ id: 1, weight: 62.5 }] });
    expect(fingerprint(a)).not.toBe(fingerprint(b));
  });

  it('is stable for identical input', () => {
    expect(fingerprint('same')).toBe(fingerprint('same'));
  });

  it('survives junk', () => {
    expect(typeof fingerprint(null)).toBe('string');
    expect(fingerprint(undefined)).toBe(fingerprint(''));
  });
});

describe('backupSignature', () => {
  const payload = (data, at) => ({ app: 'OPUS', version: 1, exportedAt: at, data });

  it('ignores the export timestamp', () => {
    // The bug this exists for: hashing the whole payload includes `exportedAt`,
    // so every backup looks new, and "only write when something changed" never
    // fires — a file a week forever, whether or not you trained.
    const data = { workouts: [{ id: 1 }] };
    expect(backupSignature(payload(data, '2026-08-01T00:00:00Z'))).toBe(
      backupSignature(payload(data, '2026-08-14T09:30:00Z'))
    );
  });

  it('still notices the data moving', () => {
    expect(backupSignature(payload({ workouts: [{ id: 1 }] }, 'x'))).not.toBe(
      backupSignature(payload({ workouts: [{ id: 1 }, { id: 2 }] }, 'x'))
    );
  });

  it('refuses to sign something that is not a backup', () => {
    expect(backupSignature(null)).toBe(null);
    expect(backupSignature({})).toBe(null);
  });
});

describe('slimExercises', () => {
  it('keeps only the exercises the user made', () => {
    // The stock 82 are re-seeded on first boot; carrying them is 16 KB of the
    // same rows every single week.
    const rows = [{ name: 'Bench Press', isCustom: false }, { name: 'Pec fly', isCustom: true }];
    expect(slimExercises(rows)).toEqual([{ name: 'Pec fly', isCustom: true }]);
  });

  it('survives junk', () => {
    expect(slimExercises()).toEqual([]);
    expect(slimExercises(null)).toEqual([]);
    expect(slimExercises([null, undefined])).toEqual([]);
  });
});

describe('shouldBackup', () => {
  const due = backupStatus(daysAgo(8), NOW);
  const fresh = backupStatus(daysAgo(1), NOW);

  it('waits until one is due', () => {
    expect(shouldBackup({ status: fresh, signature: 'a', lastSignature: 'b' })).toBe(false);
  });

  it('writes nothing when a week produced nothing', () => {
    // This is what keeps the Downloads folder sane: no training, no file.
    expect(shouldBackup({ status: due, signature: 'a', lastSignature: 'a' })).toBe(false);
  });

  it('writes when due and the data has moved', () => {
    expect(shouldBackup({ status: due, signature: 'b', lastSignature: 'a' })).toBe(true);
  });

  it('writes for an account that has never backed up', () => {
    const never = backupStatus(null, NOW);
    expect(shouldBackup({ status: never, signature: 'a', lastSignature: null })).toBe(true);
  });

  it('refuses to write a backup it could not fingerprint', () => {
    expect(shouldBackup({ status: due, signature: null, lastSignature: 'a' })).toBe(false);
    expect(shouldBackup({})).toBe(false);
  });
});

describe('looksWiped', () => {
  it('spots onboarded-with-a-history-that-is-gone', () => {
    expect(looksWiped({ onboarded: true, hadData: true, workouts: 0 })).toBe(true);
  });

  it('does not accuse a genuinely new account', () => {
    // Onboarded this morning and not trained yet is empty on purpose.
    expect(looksWiped({ onboarded: true, hadData: false, workouts: 0 })).toBe(false);
  });

  it('says nothing while the data is there', () => {
    expect(looksWiped({ onboarded: true, hadData: true, workouts: 17 })).toBe(false);
  });

  it('says nothing before onboarding, where empty is the normal state', () => {
    expect(looksWiped({ onboarded: false, hadData: true, workouts: 0 })).toBe(false);
    expect(looksWiped({})).toBe(false);
  });
});
