import { db } from '../db/db.js';

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
export async function exportData() {
  const data = {};
  for (const t of db.tables) data[t.name] = await t.toArray();
  const payload = { app: 'OPUS', version: 1, exportedAt: new Date().toISOString(), data };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `opus-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

// Replaces all data from a backup. Caller should reload afterwards.
export async function importData(jsonText) {
  const parsed = typeof jsonText === 'string' ? JSON.parse(jsonText) : jsonText;
  const data = parsed?.data ?? parsed;
  if (!data || typeof data !== 'object') throw new Error('Invalid backup file');
  await Promise.all(db.tables.map((t) => t.clear()));
  for (const t of db.tables) {
    if (Array.isArray(data[t.name]) && data[t.name].length) {
      await t.bulkAdd(data[t.name]);
    }
  }
}
