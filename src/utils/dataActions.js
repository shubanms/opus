import { db } from '../db/db.js';
import useSettingsStore from '../store/settingsStore.js';
import { CSV_BOM, buildSetRows, setsToCsv } from './csv.js';
import { toDisplay, unitLabel } from './units.js';
import { buildIcs } from './ics.js';
import { todayKey } from './dateKey.js';
import { healCatalogue } from './wger.js';
import {
  backupFilename,
  inspectBackupText,
  parseBackupText,
  pickBackupPrefs,
  prefsFromBackup,
  rawDumpToBackup,
  slimExercises,
  snapshotsFromBackup,
  validateBackup,
} from './backup.js';

function download(content, filename, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

const SNAPSHOTS_KEY = 'opus_snapshots';

/**
 * What a fresh install looks like to the settings store. Everything that marks
 * "this device has been used" or holds spendable state goes back to zero;
 * display preferences are left alone, since they are about to be cleared from
 * storage anyway and only matter if something writes them back.
 */
const FIRST_RUN = {
  onboarded: false,
  tourSeen: false,
  hadData: false,
  lastKnownWorkouts: 0,
  lastBackupAt: 0,
  lastBackupSig: '',
  coachMarksSeen: {},
  recapDismissedWeek: '',
  rescueDeclinedFor: null,
  tokensSpent: 0,
  tokensPurchased: 0,
  shieldedLapseDate: null,
  ironSpent: 0,
  ownedCosmetics: [],
  equipped: { titleFlair: null, cardTheme: null, logoSkin: null },
  dungeonIron: 0,
  lastDungeonClaim: '',
};

/**
 * Wipes every local table and cached state. Caller should reload afterwards.
 *
 * The in-memory stores are put back to first-run values FIRST. Clearing the
 * tables wakes every live query; the wipe detector, seeing zero workouts,
 * calls `noteData`, which persists the store — and a store still holding
 * `onboarded: true, hadData: true` wrote them straight back over the cleared
 * storage. The "reset" device then came back onboarded, with the "your history
 * is missing" alarm.
 */
export async function wipeAllData() {
  useSettingsStore.setState(FIRST_RUN);
  try {
    const { default: useWorkoutStore } = await import('../store/workoutStore.js');
    // A session in progress would otherwise be written back by its own
    // persistence the next time anything touched it.
    useWorkoutStore.getState().discardWorkout();
  } catch {
    /* no live session store to clear */
  }
  await Promise.all(db.tables.map((t) => t.clear()));
  try {
    localStorage.clear();
  } catch {
    /* ignore */
  }
}

// Tables that never travel in a backup. Progress photos are large local-only
// blobs. `notifications` is this device's mirror of its notification settings
// for the service worker, which also stamps `lastNudge` into it — so carrying
// it changed the "has anything changed?" signature without any training, and
// wrote a new weekly file for nothing.
const EXPORT_SKIP = new Set(['photos', 'notifications']);

/**
 * Everything worth keeping, as one object.
 *
 * Split out from the download so the weekly auto-backup can build it, hash it,
 * and decide there is nothing new to write — without that, a week where you
 * did not train still drops a file in Downloads.
 *
 * Pristine stock exercises are dropped (the app puts them back at the same
 * ids); every other exercise row is kept — see `backup.slimExercises`.
 * `prefs` carries the settings and economy that live in localStorage, outside
 * `data`, so it never moves the change signature.
 */
export async function buildBackup() {
  const data = {};
  for (const t of db.tables) {
    if (EXPORT_SKIP.has(t.name)) continue;
    data[t.name] = await t.toArray();
  }
  data.exercises = slimExercises(data.exercises);
  const prefs = pickBackupPrefs(useSettingsStore.getState());
  try {
    const snapshots = JSON.parse(localStorage.getItem(SNAPSHOTS_KEY) || 'null');
    if (snapshots && typeof snapshots === 'object' && !Array.isArray(snapshots)) prefs.snapshots = snapshots;
  } catch {
    /* unreadable or unavailable — the backup is still the backup */
  }
  return { app: 'OPUS', version: 1, exportedAt: new Date().toISOString(), data, prefs };
}

/**
 * Serialise a backup for writing.
 *
 * Not pretty-printed: indentation was 36% of the file, and this is read by a
 * machine far more often than by a person. It is still plain JSON rather than
 * something compressed, because being able to open the file and see your own
 * sets in it is worth more than the last 50 KB — that inspectability is what
 * confirmed a real backup was intact when one was needed.
 */
export function serializeBackup(payload) {
  return JSON.stringify(payload);
}

function saveBackup(text, filename) {
  download(text, filename, 'application/json');
}

export async function exportData() {
  const payload = await buildBackup();
  const text = serializeBackup(payload);
  saveBackup(text, backupFilename());
  return { text, payload };
}

/**
 * Hand the backup to the OS share sheet — Drive, Keep, email, anywhere.
 *
 * Downloads survive "Delete browsing data" but not a lost phone. This is the
 * one path that puts a copy somewhere the device does not own.
 *
 * Shared as `opus-backup-….txt`, `text/plain`: Chromium's Web Share takes an
 * allowlist of file types and JSON is not on it, so the `.json` share was
 * refused on every Android phone and silently became a download. Same JSON
 * inside, and the importer reads both.
 *
 * Returns `{ outcome, payload }`: 'shared', 'cancelled' (the sheet was
 * dismissed — do nothing), 'unsupported' (no Web Share here) or 'failed'.
 */
export async function shareBackup() {
  const payload = await buildBackup();
  const file = new File([serializeBackup(payload)], backupFilename(new Date(), { ext: 'txt' }), { type: 'text/plain' });
  if (!navigator.canShare?.({ files: [file] })) return { outcome: 'unsupported', payload };
  try {
    await navigator.share({ files: [file], title: 'OPUS backup' });
    return { outcome: 'shared', payload };
  } catch (err) {
    // Dismissing the sheet is a choice, not an error to fall back from.
    return { outcome: err?.name === 'AbortError' ? 'cancelled' : 'failed', payload };
  }
}

/**
 * Downloads the weekly plan as a calendar file.
 *
 * Returns false when nothing is scheduled, so the caller can say why rather
 * than handing over an empty file. See `utils/ics.js` for why a calendar is the
 * reminder path and a notification is not.
 */
export async function exportPlanIcs(hour = 18) {
  const templates = await db.templates.toArray();
  const ics = buildIcs({ templates, hour });
  if (!ics) return false;
  download(ics, 'opus-training-plan.ics', 'text/calendar;charset=utf-8');
  return true;
}

/**
 * Downloads a CSV of every logged set, in the order it happened (see
 * `csv.buildSetRows`), with cardio duration/distance/calories, and a BOM so
 * Excel reads it as UTF-8.
 */
export async function exportSetsCsv(unit = 'kg') {
  const [sets, workouts, exercises] = await Promise.all([
    db.sets.toArray(), db.workouts.toArray(), db.exercises.toArray(),
  ]);
  const csv = setsToCsv(buildSetRows({ sets, workouts, exercises }), unit);
  download(CSV_BOM + csv, `opus-sets-${todayKey()}.csv`, 'text/csv;charset=utf-8');
}

// Opens a clean, printable training report in a new window (Save as PDF from
// the browser print dialog). No dependency — pure print CSS.
export async function exportPdf(unit = 'kg') {
  const workouts = (await db.workouts.toArray()).sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
  const totalVolume = workouts.reduce((a, w) => a + (w.totalVolume || 0), 0);
  const totalSets = workouts.reduce((a, w) => a + (w.totalSets || 0), 0);
  const hours = Math.round(workouts.reduce((a, w) => a + (w.duration || 0), 0) / 3600);
  const u = unitLabel(unit);
  const fmt = (kg) => Math.round(toDisplay(kg || 0, unit)).toLocaleString();

  const rowsHtml = workouts.slice(0, 80).map((w) =>
    `<tr><td>${w.date ?? ''}</td><td>${escapeHtml(w.name ?? 'Workout')}</td><td class="n">${fmt(w.totalVolume)}</td><td class="n">${w.totalSets ?? 0}</td></tr>`
  ).join('');

  const html = `<!doctype html><html><head><meta charset="utf-8"><title>OPUS — Training Report</title>
<style>
  body{font-family:-apple-system,Segoe UI,Roboto,sans-serif;color:#141A2E;margin:40px;}
  h1{font-size:28px;margin:0;}
  .sub{color:#7B83A6;margin:4px 0 24px;font-size:13px;}
  .stats{display:flex;gap:32px;margin-bottom:28px;}
  .stat .v{font-size:26px;font-weight:600;} .stat .l{color:#7B83A6;font-size:12px;}
  table{width:100%;border-collapse:collapse;font-size:13px;}
  th,td{text-align:left;padding:8px 10px;border-bottom:1px solid #eee;}
  th{color:#7B83A6;text-transform:uppercase;font-size:11px;letter-spacing:1px;}
  td.n,th.n{text-align:right;}
  @media print{body{margin:0;}}
</style></head><body>
  <h1>OPUS — Training Report</h1>
  <div class="sub">Generated ${new Date().toLocaleDateString()}</div>
  <div class="stats">
    <div class="stat"><div class="v">${workouts.length}</div><div class="l">Workouts</div></div>
    <div class="stat"><div class="v">${fmt(totalVolume)} ${u}</div><div class="l">Volume</div></div>
    <div class="stat"><div class="v">${totalSets}</div><div class="l">Sets</div></div>
    <div class="stat"><div class="v">${hours}h</div><div class="l">Trained</div></div>
  </div>
  <table><thead><tr><th>Date</th><th>Workout</th><th class="n">Volume (${u})</th><th class="n">Sets</th></tr></thead>
  <tbody>${rowsHtml || '<tr><td colspan="4">No workouts logged yet.</td></tr>'}</tbody></table>
</body></html>`;

  const win = window.open('', '_blank');
  if (!win) return;
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 350);
}

/**
 * Look inside a backup file without restoring it, for a "restore this?"
 * preview: `{ ok, error?, exportedAt, counts: { workouts, sets,
 * customExercises, routines, … }, firstWorkout, lastWorkout, hasPrefs }`.
 * Never throws, never touches the database.
 */
export function inspectBackup(text) {
  return inspectBackupText(text);
}

/**
 * Put a backup's settings back: into the in-memory store (and from there to
 * localStorage), not straight into localStorage. The store persists itself on
 * every change, so writing storage behind its back lasted only until the next
 * `persist()` — which the wipe detector fires the moment the imported workouts
 * appear. The caller reloads afterwards either way.
 */
function restorePrefs(prefs, { hadData }) {
  try {
    useSettingsStore.setState(prefsFromBackup(prefs, { hadData }));
    useSettingsStore.getState().persist();
    const snapshots = snapshotsFromBackup(prefs);
    if (snapshots) localStorage.setItem(SNAPSHOTS_KEY, JSON.stringify(snapshots));
  } catch (err) {
    // The tables are already restored; settings are the lesser loss.
    console.error('Restoring settings from the backup failed:', err);
  }
}

/**
 * Replaces all data from a backup. Caller should reload afterwards.
 *
 * Throws, before touching anything, when the input is not an OPUS backup — it
 * used to accept any JSON, and importing another app's file cleared every
 * table and restored nothing. The replace itself is one transaction: if any of
 * it fails, none of it happened.
 *
 * Ends by healing the exercise catalogue (stock rows back at their fixed ids,
 * cardio machines rebuilt at the ids old slim backups' bouts point to), since
 * a backup only carries the rows that are the user's.
 */
export async function importData(input) {
  const parsed = parseBackupText(input);
  if (!parsed.ok) throw new Error(parsed.error);
  const backup = validateBackup(parsed.value);
  if (!backup.ok) throw new Error(backup.error);
  const { data, prefs } = backup;

  const tables = db.tables.filter((t) => !EXPORT_SKIP.has(t.name));
  await db.transaction('rw', tables, async () => {
    // Local-only tables (photos, this device's notification mirror) are kept.
    for (const t of tables) await t.clear();
    for (const t of tables) {
      const rows = data[t.name];
      if (Array.isArray(rows) && rows.length) await t.bulkAdd(rows);
    }
    await healCatalogue();
  });
  restorePrefs(prefs, { hadData: data.workouts.length > 0 });
}

/**
 * Read the database with the raw IndexedDB API — no Dexie, no version, so no
 * upgrade can be triggered — for the recovery screen to save before it
 * rebuilds. Resolves `{ version, stores: { name: rows[] } }`.
 */
export function readRawDatabase(name = 'OpusDB') {
  return new Promise((resolve, reject) => {
    let req;
    try {
      req = indexedDB.open(name);
    } catch (err) {
      reject(err);
      return;
    }
    // Only fires when the database does not exist (it would be created
    // empty): abort, so a rescue never leaves a blank database behind.
    req.onupgradeneeded = () => {
      req.transaction?.abort();
    };
    req.onerror = () => reject(req.error ?? new Error('Could not open the database'));
    req.onsuccess = () => {
      const idb = req.result;
      const names = [...idb.objectStoreNames];
      if (!names.length) {
        idb.close();
        resolve({ version: idb.version, stores: {} });
        return;
      }
      const stores = {};
      const tx = idb.transaction(names, 'readonly');
      for (const store of names) {
        const all = tx.objectStore(store).getAll();
        all.onsuccess = () => { stores[store] = all.result; };
      }
      tx.oncomplete = () => { idb.close(); resolve({ version: idb.version, stores }); };
      tx.onerror = () => { idb.close(); reject(tx.error); };
      tx.onabort = () => { idb.close(); reject(tx.error ?? new Error('Read aborted')); };
    };
  });
}

/**
 * Save whatever the database holds as a restorable file. The last thing to
 * offer before "Rebuild database" deletes it all.
 */
export async function downloadRawDump() {
  const dump = await readRawDatabase();
  const backup = rawDumpToBackup(dump);
  const rows = Object.values(backup.data).reduce((a, r) => a + r.length, 0);
  download(JSON.stringify(backup), `opus-rescue-${todayKey()}.json`, 'application/json');
  return { rows, workouts: backup.data.workouts.length };
}
