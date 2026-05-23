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
