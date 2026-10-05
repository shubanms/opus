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
  parseBackupText,
  validateBackup,
  summarizeBackup,
  inspectBackupText,
  describeBackup,
  pickBackupPrefs,
  prefsFromBackup,
  snapshotsFromBackup,
  rawDumpToBackup,
  BACKUP_PREF_KEYS,
} from './backup.js';
import { STOCK_BY_ID, CARDIO_EXERCISES, cardioRow } from './catalogue.js';

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
  it('drops untouched stock rows and keeps the ones the user made', () => {
    // The stock 74 come back at the same ids on their own; carrying them is
    // the same rows every single week.
    const rows = [{ ...STOCK_BY_ID.get(3) }, { id: 83, name: 'Pec fly', isCustom: true }];
    expect(slimExercises(rows)).toEqual([{ id: 83, name: 'Pec fly', isCustom: true }]);
  });

  it('keeps the cardio machines — they have no fixed ids to come back to', () => {
    // Dropping these is what orphaned every bout after a restore.
    const cardio = CARDIO_EXERCISES.map((c, i) => cardioRow(c, 75 + i));
    expect(slimExercises(cardio)).toHaveLength(8);
  });

  it('keeps a stock row the user starred, coloured or that is not the seed\'s', () => {
    const starred = { ...STOCK_BY_ID.get(3), favorite: true };
    const coloured = { ...STOCK_BY_ID.get(4), color: '#4FD8C4' };
    const unstarred = { ...STOCK_BY_ID.get(5), favorite: false, color: null };
    const strange = { id: 6, name: 'Something else', isCustom: false };
    expect(slimExercises([starred, coloured, unstarred, strange])).toEqual([starred, coloured, strange]);
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

describe('backupFilename for sharing', () => {
  it('shares as .txt — Chromium refuses to share a .json file', () => {
    expect(backupFilename(new Date(2026, 7, 14), { ext: 'txt' })).toBe('opus-backup-2026-08-14.txt');
  });
});

const goodBackup = () => ({
  app: 'OPUS',
  version: 1,
  exportedAt: '2026-09-30T10:00:00.000Z',
  data: {
    workouts: [{ id: 1, date: '2026-09-01' }, { id: 2, date: '2026-09-28' }],
    sets: [{ id: 1 }, { id: 2 }, { id: 3 }],
    exercises: [{ id: 83, isCustom: true }, { id: 75, isCustom: false }],
    templates: [{ id: 1 }],
  },
  prefs: { unit: 'lbs' },
});

describe('parseBackupText', () => {
  it('parses text, passes an object through, and survives a byte-order mark', () => {
    expect(parseBackupText('{"a":1}')).toEqual({ ok: true, value: { a: 1 } });
    expect(parseBackupText({ a: 1 })).toEqual({ ok: true, value: { a: 1 } });
    expect(parseBackupText(`${String.fromCharCode(0xfeff)}{"a":1}`).ok).toBe(true);
  });

  it('explains empty and unreadable files', () => {
    expect(parseBackupText('').error).toMatch(/empty/);
    expect(parseBackupText('not json').error).toMatch(/can't be read/);
    expect(parseBackupText(null).ok).toBe(false);
  });
});

describe('validateBackup', () => {
  it('accepts an OPUS backup, prefs and all', () => {
    const v = validateBackup(goodBackup());
    expect(v.ok).toBe(true);
    expect(v.prefs).toEqual({ unit: 'lbs' });
  });

  it('accepts an envelope without `app` if it plainly has a workout list', () => {
    expect(validateBackup({ data: { workouts: [] } }).ok).toBe(true);
  });

  it('refuses another app\'s file before anything is touched', () => {
    const v = validateBackup({ name: 'other-app', settings: { theme: 'dark' } });
    expect(v.ok).toBe(false);
    expect(v.error).toMatch(/isn't an OPUS backup/);
    expect(v.error).toMatch(/Nothing was changed/);
    expect(validateBackup([1, 2]).ok).toBe(false);
    expect(validateBackup(null).ok).toBe(false);
  });

  it('refuses a damaged one', () => {
    expect(validateBackup({ app: 'OPUS' }).error).toMatch(/no workout list/);
    expect(validateBackup({ app: 'OPUS', data: { workouts: [], sets: 'x' } }).error).toMatch(/"sets"/);
    expect(validateBackup({ app: 'OPUS', data: { workouts: [null] } }).ok).toBe(false);
  });
});

describe('summarizeBackup / inspectBackupText / describeBackup', () => {
  it('counts what a backup holds', () => {
    const s = summarizeBackup(goodBackup());
    expect(s.counts).toMatchObject({ workouts: 2, sets: 3, customExercises: 1, routines: 1, records: 0 });
    expect(s).toMatchObject({ exportedAt: '2026-09-30T10:00:00.000Z', firstWorkout: '2026-09-01', lastWorkout: '2026-09-28', hasPrefs: true });
  });

  it('inspects text without throwing, either way', () => {
    expect(inspectBackupText(JSON.stringify(goodBackup()))).toMatchObject({ ok: true, counts: { workouts: 2 } });
    expect(inspectBackupText('{"x":1}')).toMatchObject({ ok: false, exportedAt: null, counts: null });
    expect(inspectBackupText('{')).toMatchObject({ ok: false });
  });

  it('says it the way the restore prompt does', () => {
    const now = new Date(2026, 9, 5);
    const d = describeBackup(summarizeBackup(goodBackup()), now);
    expect(d.title).toBe('Backup from 30 Sep');
    expect(d.detail).toBe('2 workouts · 3 sets · 1 custom exercise · 1 routine');
    expect(describeBackup({ counts: { workouts: 1, sets: 1 } }).title).toBe('Backup (date unknown)');
    expect(describeBackup({ counts: { workouts: 1420, sets: 23180 } }).detail).toBe('1,420 workouts · 23,180 sets');
  });
});

describe('backup prefs', () => {
  it('carries only the allowlisted, well-formed settings', () => {
    const state = {
      unit: 'lbs', theme: 'dark', effects: false, ironSpent: 120, ownedCosmetics: ['a'], dungeonIron: 30,
      lastBackupAt: 123, hadData: true, onboarded: true, coachMarksSeen: { home: true }, persist() {},
    };
    expect(pickBackupPrefs(state)).toEqual({ unit: 'lbs', theme: 'dark', effects: false, ironSpent: 120, ownedCosmetics: ['a'], dungeonIron: 30 });
  });

  it('skips values that would put the store in a state no screen expects', () => {
    expect(pickBackupPrefs({ unit: 'stone', ironSpent: -5, restDuration: 0, ownedCosmetics: [1], equipped: [] })).toEqual({});
  });

  it('covers the economy and preferences that live only in localStorage', () => {
    for (const key of ['unit', 'inventory', 'tokensSpent', 'tokensPurchased', 'shieldedLapseDate', 'ironSpent', 'ownedCosmetics', 'equipped', 'dungeonIron', 'lastDungeonClaim', 'autoBackup']) {
      expect(BACKUP_PREF_KEYS).toContain(key);
    }
    expect(BACKUP_PREF_KEYS).not.toContain('lastBackupAt');
    expect(BACKUP_PREF_KEYS).not.toContain('lastBackupSig');
  });

  it('a restored device is onboarded, and armed only if the backup had sessions', () => {
    expect(prefsFromBackup({ unit: 'lbs' })).toEqual({ unit: 'lbs', onboarded: true, tourSeen: true, hadData: true });
    expect(prefsFromBackup(null, { hadData: false })).toEqual({ onboarded: true, tourSeen: true });
  });

  it('snapshots ride along when present', () => {
    expect(snapshotsFromBackup({ snapshots: { '2026-09': {} } })).toEqual({ '2026-09': {} });
    expect(snapshotsFromBackup({})).toBeNull();
    expect(snapshotsFromBackup(null)).toBeNull();
  });
});

describe('rawDumpToBackup', () => {
  it('wraps a raw database read in an envelope the importer accepts, minus photo blobs', () => {
    const now = new Date('2026-10-05T10:00:00Z');
    const out = rawDumpToBackup({ version: 90, stores: { workouts: [{ id: 1 }], photos: [{ id: 1 }], sets: [] } }, now);
    expect(out).toMatchObject({ app: 'OPUS', version: 1, exportedAt: '2026-10-05T10:00:00.000Z', source: 'rescue', idbVersion: 90 });
    expect(out.data).toEqual({ workouts: [{ id: 1 }], sets: [] });
    expect(validateBackup(out).ok).toBe(true);
  });

  it('is still importable when the database was empty', () => {
    expect(validateBackup(rawDumpToBackup({ stores: {} })).ok).toBe(true);
  });
});
