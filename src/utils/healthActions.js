import { db } from '../db/db.js';

// Upsert a body-stat entry by date.
export async function logBodyStat(entry) {
  const existing = await db.bodyStats.where('date').equals(entry.date).first();
  if (existing) await db.bodyStats.update(existing.id, entry);
  else await db.bodyStats.add(entry);
}

// Upsert a sleep entry by date.
export async function logSleep({ date, hours, quality }) {
  const existing = await db.sleepLogs.where('date').equals(date).first();
  if (existing) await db.sleepLogs.update(existing.id, { date, hours, quality });
  else await db.sleepLogs.add({ date, hours, quality });
}
