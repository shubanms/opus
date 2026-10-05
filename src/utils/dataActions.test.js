// Backup → wipe → restore, against an in-memory database that follows the
// IndexedDB key-generator rules (see fakeDb.test-helper). The first scenario
// is the one that emptied a real user's exercise catalogue.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { holder, resetDb, installLocalStorage } from './fakeDb.test-helper.js';

vi.mock('../db/db.js', async () => {
  const m = await import('./fakeDb.test-helper.js');
  return { db: m.holder.db };
});

const storage = installLocalStorage();
const { buildBackup, importData, inspectBackup, wipeAllData } = await import('./dataActions.js');
const { healCatalogue } = await import('./wger.js');
const { backupSignature } = await import('./backup.js');
const { CARDIO_EXERCISES, STOCK_MAX_ID } = await import('./catalogue.js');
const { default: useSettingsStore } = await import('../store/settingsStore.js');

const db = holder.db;
const DEFAULTS = { ...useSettingsStore.getState() };

beforeEach(() => {
  resetDb();
  storage.clear();
  useSettingsStore.setState(DEFAULTS);
});

/** A device that installed after cardio shipped: stock 1–74, cardio 75–82. */
async function device({ customFirst = 0 } = {}) {
  // Early installers made custom lifts before the cardio rows existed.
  await healCatalogueStockOnly();
  const early = [];
  for (let i = 0; i < customFirst; i++) {
    early.push(await db.exercises.add({ name: `Early ${i + 1}`, muscleGroup: 'chest', equipment: 'cable', isCustom: true }));
  }
  await healCatalogue();
  const custom = await db.exercises.add({ name: 'Landmine Press', muscleGroup: 'front-deltoids', equipment: 'barbell', isCustom: true });
  const cardio = Object.fromEntries((await db.exercises.toArray()).filter((e) => e.cardioMode).map((e) => [e.name, e.id]));
  await db.exercises.update(3, { favorite: true }); // a starred stock lift
  await db.workouts.add({ id: 1, date: '2026-09-01', status: 'completed', xpEarned: 100, totalVolume: 900, totalSets: 4, createdAt: 1 });
  await db.sets.bulkAdd([
    { workoutId: 1, exerciseId: 3, setNumber: 1, weight: 60, reps: 10 },
    { workoutId: 1, exerciseId: custom, setNumber: 1, weight: 30, reps: 10 },
    { workoutId: 1, exerciseId: cardio.Running, setNumber: 1, weight: 0, reps: 0, isCardio: true, speedKmh: 10, incline: 1, durationSec: 600, calories: 120 },
    { workoutId: 1, exerciseId: cardio['Rowing Machine'], setNumber: 1, weight: 0, reps: 0, isCardio: true, speedKmh: null, incline: null, durationSec: 600, calories: 90 },
  ]);
  await db.exerciseNotes.add({ exerciseId: cardio.Running, text: 'Easy pace', updatedAt: 1 });
  return { custom, cardio, early };
}

// The stock rows only, the way a pre-cardio install had them.
async function healCatalogueStockOnly() {
  const { ensureStockCatalogue } = await import('./wger.js');
  await ensureStockCatalogue();
}

/** Names behind every set, and any id with no row. */
async function integrity() {
  const ids = new Set((await db.exercises.toArray()).map((e) => e.id));
  const sets = await db.sets.toArray();
  const names = {};
  for (const s of sets) names[s.exerciseId] = (await db.exercises.get(s.exerciseId))?.name;
  const referenced = [
    ...sets, ...(await db.exerciseNotes.toArray()), ...(await db.templateExercises.toArray()), ...(await db.prs.toArray()),
  ].map((r) => r.exerciseId);
  const cardioNames = (await db.exercises.toArray()).filter((e) => e.cardioMode).map((e) => e.name);
  return {
    orphans: [...new Set(referenced.filter((id) => !ids.has(id)))],
    names,
    duplicateCardio: cardioNames.length !== new Set(cardioNames).size,
    rows: ids.size,
  };
}

/** A brand-new browser: the app boots (and seeds) before you restore. */
async function freshDevice() {
  resetDb();
  await healCatalogue();
}

describe('restoring a backup keeps the exercise catalogue whole', () => {
  it('fresh device: every lift keeps its name, cardio and favourites included', async () => {
    const { custom, cardio } = await device();
    const before = await integrity();
    const text = JSON.stringify(await buildBackup());
    await freshDevice();
    await importData(text);
    const after = await integrity();
    expect(after.orphans).toEqual([]);
    expect(after.names).toEqual(before.names);
    expect(after.names[cardio.Running]).toBe('Running');
    expect(after.names[custom]).toBe('Landmine Press');
    expect((await db.exercises.get(3)).favorite).toBe(true);
    expect(after.duplicateCardio).toBe(false);
    expect(after.rows).toBe(before.rows);
  });

  it('same device: importing over itself changes nothing', async () => {
    await device();
    const before = await db.exercises.toArray();
    await importData(JSON.stringify(await buildBackup()));
    expect(await db.exercises.toArray()).toEqual(before);
  });

  it('carries every non-pristine exercise row and drops only untouched stock', async () => {
    const { custom, cardio } = await device();
    const ids = (await buildBackup()).data.exercises.map((e) => e.id).sort((a, b) => a - b);
    expect(ids).toEqual([3, ...Object.values(cardio).sort((a, b) => a - b), custom]);
  });

  it('an OLD slim backup (custom rows only) gets its cardio rebuilt at the original ids', async () => {
    const { cardio } = await device();
    const before = await integrity();
    const old = await buildBackup();
    old.data.exercises = old.data.exercises.filter((e) => e.isCustom);
    await freshDevice();
    await importData(JSON.stringify(old));
    const after = await integrity();
    expect(after.orphans).toEqual([]);
    expect(after.names[cardio.Running]).toBe('Running');
    expect(after.names[cardio['Rowing Machine']]).toBe('Rowing Machine');
    expect(after.names).toEqual(before.names);
    expect(after.duplicateCardio).toBe(false);
    // Every machine exists exactly once afterwards.
    const names = (await db.exercises.toArray()).filter((e) => e.cardioMode).map((e) => e.name).sort();
    expect(names).toEqual(CARDIO_EXERCISES.map((c) => c.name).sort());
  });

  it('…including for an early installer whose cardio came after their custom lifts', async () => {
    const { cardio, early } = await device({ customFirst: 2 });
    expect(early).toEqual([STOCK_MAX_ID + 1, STOCK_MAX_ID + 2]);
    expect(cardio.Treadmill).toBe(STOCK_MAX_ID + 3);
    const before = await integrity();
    const old = await buildBackup();
    old.data.exercises = old.data.exercises.filter((e) => e.isCustom);
    await freshDevice();
    await importData(JSON.stringify(old));
    const after = await integrity();
    expect(after.orphans).toEqual([]);
    expect(after.names).toEqual(before.names);
  });

  it('heals a device that already restored a broken backup and kept training', async () => {
    // What the real user's phone holds today: the restore left one custom row;
    // the next boot re-created cardio at fresh ids (the generator never
    // rewinds) and they logged a new run on the new "Running".
    const { cardio, custom } = await device();
    const old = await buildBackup();
    old.data.exercises = old.data.exercises.filter((e) => e.isCustom);
    resetDb();
    for (const t of db.tables) {
      const rows = old.data[t.name];
      if (rows?.length) await t.bulkAdd(rows);
    }
    db.exercises.seq = Math.max(db.exercises.seq, custom); // the old device's generator
    const fresh = [];
    for (const c of CARDIO_EXERCISES) fresh.push(await db.exercises.add({ name: c.name, equipment: 'cardio', muscleGroup: 'cardio', cardioMode: c.cardioMode, met: c.met, isCustom: false }));
    const newRunning = fresh[2];
    await db.sets.add({ workoutId: 1, exerciseId: newRunning, setNumber: 2, isCardio: true, speedKmh: 9, incline: 0, durationSec: 300 });
    expect((await integrity()).orphans.length).toBeGreaterThan(0);

    const result = await healCatalogue();
    expect(result.stock).toBe(STOCK_MAX_ID);
    const after = await integrity();
    expect(after.orphans).toEqual([]);
    expect(after.duplicateCardio).toBe(false);
    // The old run now points at the one "Running" there is.
    const runs = (await db.sets.toArray()).filter((s) => s.speedKmh);
    expect(runs.every((s) => s.exerciseId === newRunning)).toBe(true);
    expect(await db.exercises.get(cardio.Running)).toBeUndefined();
    expect((await db.exerciseNotes.toArray()).map((n) => n.exerciseId)).toEqual([newRunning]);
  });
});

describe('importData refuses what it cannot restore — before touching anything', () => {
  it('another app\'s JSON leaves every table as it was', async () => {
    await device();
    const before = await db.workouts.count();
    await expect(importData(JSON.stringify({ name: 'some-other-app', version: '1.0.0', settings: { a: 1 } })))
      .rejects.toThrow(/isn't an OPUS backup/);
    expect(await db.workouts.count()).toBe(before);
  });

  it('text that is not JSON at all', async () => {
    await device();
    await expect(importData('hello')).rejects.toThrow(/can't be read/);
    expect(await db.workouts.count()).toBe(1);
  });

  it('a damaged backup rolls back completely (one transaction)', async () => {
    await device();
    const backup = await buildBackup();
    backup.data.sets.push({ ...backup.data.sets[0] }); // duplicate key
    const before = await db.sets.toArray();
    await expect(importData(JSON.stringify(backup))).rejects.toThrow();
    expect(await db.sets.toArray()).toEqual(before);
    expect(await db.workouts.count()).toBe(1);
  });
});

describe('settings travel with the backup', () => {
  it('carries the allowlisted prefs and snapshots outside `data`', async () => {
    await device();
    useSettingsStore.setState({ unit: 'lbs', ownedCosmetics: ['flair-iron'], dungeonIron: 40, tokensSpent: 2, lastBackupAt: 123, hadData: true });
    storage.setItem('opus_snapshots', JSON.stringify({ '2026-09': { strength: 10 } }));
    const backup = await buildBackup();
    expect(backup.prefs).toMatchObject({ unit: 'lbs', ownedCosmetics: ['flair-iron'], dungeonIron: 40, tokensSpent: 2 });
    expect(backup.prefs.snapshots).toEqual({ '2026-09': { strength: 10 } });
    expect(backup.prefs).not.toHaveProperty('lastBackupAt');
    expect(backup.prefs).not.toHaveProperty('hadData');
    expect(backup.data).not.toHaveProperty('prefs');
    // A theme or unit change is not "new training": the signature ignores it.
    const sig = backupSignature(backup);
    useSettingsStore.setState({ unit: 'kg', theme: 'light' });
    expect(backupSignature(await buildBackup())).toBe(sig);
  });

  it('restores them into the store (so a late persist cannot undo it), keeping this device\'s backup clock', async () => {
    await device();
    useSettingsStore.setState({ unit: 'lbs', ownedCosmetics: ['flair-iron'], dungeonIron: 40 });
    storage.setItem('opus_snapshots', JSON.stringify({ '2026-09': { strength: 10 } }));
    const text = JSON.stringify(await buildBackup());
    await freshDevice();
    storage.clear();
    useSettingsStore.setState({ ...DEFAULTS, onboarded: true, lastBackupAt: 999, lastBackupSig: 'here' });
    await importData(text);
    const s = useSettingsStore.getState();
    expect(s).toMatchObject({ unit: 'lbs', ownedCosmetics: ['flair-iron'], dungeonIron: 40, onboarded: true, tourSeen: true, hadData: true, lastBackupAt: 999, lastBackupSig: 'here' });
    expect(JSON.parse(storage.getItem('opus_prefs'))).toMatchObject({ unit: 'lbs', dungeonIron: 40 });
    expect(JSON.parse(storage.getItem('opus_snapshots'))).toEqual({ '2026-09': { strength: 10 } });
  });

  it('an older backup with no prefs still imports', async () => {
    await device();
    const { prefs, ...backup } = await buildBackup();
    expect(prefs).toBeTruthy();
    await freshDevice();
    await importData(JSON.stringify(backup));
    expect(await db.workouts.count()).toBe(1);
    expect(useSettingsStore.getState().unit).toBe('kg');
  });

  it('skips the notification mirror both ways (the service worker writes into it)', async () => {
    await device();
    await db.notifications.add({ type: 'config', lastNudge: 5 });
    await db.photos.add({ date: '2026-09-01', category: 'front' });
    const backup = await buildBackup();
    expect(backup.data).not.toHaveProperty('notifications');
    expect(backup.data).not.toHaveProperty('photos');
    backup.data.notifications = [{ id: 77, type: 'stale' }];
    await importData(JSON.stringify(backup));
    expect((await db.notifications.toArray()).map((n) => n.lastNudge)).toEqual([5]);
    expect(await db.photos.count()).toBe(1);
  });
});

describe('inspectBackup', () => {
  it('previews a backup without touching the database', async () => {
    await device();
    const text = JSON.stringify(await buildBackup());
    resetDb();
    const info = inspectBackup(text);
    expect(info).toMatchObject({ ok: true, counts: { workouts: 1, sets: 4, customExercises: 1, routines: 0 } });
    expect(typeof info.exportedAt).toBe('string');
    expect(await db.workouts.count()).toBe(0);
  });

  it('explains what is wrong with a file it will not restore', () => {
    expect(inspectBackup('{"theme":"dark"}')).toMatchObject({ ok: false, counts: null });
    expect(inspectBackup('{"theme":"dark"}').error).toMatch(/isn't an OPUS backup/);
  });
});

describe('wipeAllData', () => {
  it('puts the store back to first-run values before clearing, so a late persist cannot resurrect them', async () => {
    await device();
    useSettingsStore.setState({ onboarded: true, tourSeen: true, hadData: true, lastKnownWorkouts: 9, ironSpent: 50 });
    useSettingsStore.getState().persist();
    await wipeAllData();
    expect(storage.length).toBe(0);
    expect(await db.workouts.count()).toBe(0);
    // The wipe detector's noteData(0) firing after the clear. It has nothing
    // new to record, so it may write nothing at all (settingsStore skips an
    // unchanged persist) — the invariant is that the old prefs never come back.
    useSettingsStore.getState().noteData(0);
    const firstRun = { onboarded: false, tourSeen: false, hadData: false, ironSpent: 0 };
    expect(useSettingsStore.getState()).toMatchObject(firstRun);
    const written = JSON.parse(storage.getItem('opus_prefs') ?? 'null');
    if (written) expect(written).toMatchObject(firstRun);
  });
});
