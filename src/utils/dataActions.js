import { db } from '../db/db.js';
import { setsToCsv } from './csv.js';
import { toDisplay, unitLabel } from './units.js';
import { buildIcs } from './ics.js';

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

// Wipes every local table and cached state. Caller should reload afterwards.
export async function wipeAllData() {
  await Promise.all(db.tables.map((t) => t.clear()));
  try {
    localStorage.clear();
  } catch {
    /* ignore */
  }
}

// Downloads a JSON backup of every table.
// Progress photos are large local-only blobs — never part of the portable backup.
const EXPORT_SKIP = new Set(['photos']);

export async function exportData() {
  const data = {};
  for (const t of db.tables) {
    if (EXPORT_SKIP.has(t.name)) continue;
    data[t.name] = await t.toArray();
  }
  const payload = { app: 'OPUS', version: 1, exportedAt: new Date().toISOString(), data };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `opus-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
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

// Downloads a CSV of every logged set (joined with workout + exercise names).
export async function exportSetsCsv(unit = 'kg') {
  const [sets, workouts, exercises] = await Promise.all([
    db.sets.toArray(), db.workouts.toArray(), db.exercises.toArray(),
  ]);
  const wById = Object.fromEntries(workouts.map((w) => [w.id, w]));
  const exById = Object.fromEntries(exercises.map((e) => [e.id, e.name]));
  const rows = sets
    .map((s) => {
      const w = wById[s.workoutId] ?? {};
      return {
        date: w.date ?? '', workout: w.name ?? '', exercise: exById[s.exerciseId] ?? '',
        setNumber: s.setNumber, weightKg: s.weight, reps: s.reps, rpe: s.rpe ?? '',
        isWarmup: s.isWarmup, note: s.note ?? '',
      };
    })
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : (a.setNumber ?? 0) - (b.setNumber ?? 0)));
  download(setsToCsv(rows, unit), `opus-sets-${new Date().toISOString().slice(0, 10)}.csv`, 'text/csv;charset=utf-8');
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

// Replaces all data from a backup. Caller should reload afterwards.
export async function importData(jsonText) {
  const parsed = typeof jsonText === 'string' ? JSON.parse(jsonText) : jsonText;
  const data = parsed?.data ?? parsed;
  if (!data || typeof data !== 'object') throw new Error('Invalid backup file');
  // Keep local-only photos across an import (they're never in the backup).
  await Promise.all(db.tables.filter((t) => !EXPORT_SKIP.has(t.name)).map((t) => t.clear()));
  for (const t of db.tables) {
    if (EXPORT_SKIP.has(t.name)) continue;
    if (Array.isArray(data[t.name]) && data[t.name].length) {
      await t.bulkAdd(data[t.name]);
    }
  }
}
