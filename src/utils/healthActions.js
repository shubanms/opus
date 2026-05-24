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

export async function deleteBodyStat(id) {
  await db.bodyStats.delete(id);
}

export async function deleteSleep(id) {
  await db.sleepLogs.delete(id);
}

const todayStr = () => new Date().toISOString().slice(0, 10);

// Upsert today's step count.
export async function setSteps(steps) {
  const date = todayStr();
  const e = await db.dailyLogs.where('date').equals(date).first();
  if (e) await db.dailyLogs.update(e.id, { steps });
  else await db.dailyLogs.add({ date, steps, water: 0 });
}

// Add (or remove) glasses of water for today.
export async function addWater(delta) {
  const date = todayStr();
  const e = await db.dailyLogs.where('date').equals(date).first();
  if (e) await db.dailyLogs.update(e.id, { water: Math.max(0, (e.water || 0) + delta) });
  else if (delta > 0) await db.dailyLogs.add({ date, steps: 0, water: delta });
}

// Upsert a full day's activity (steps + water) for any date — used by the log.
export async function logActivity({ date, steps, water }) {
  const e = await db.dailyLogs.where('date').equals(date).first();
  const patch = {};
  if (steps != null) patch.steps = Math.max(0, steps);
  if (water != null) patch.water = Math.max(0, water);
  if (e) await db.dailyLogs.update(e.id, patch);
  else await db.dailyLogs.add({ date, steps: patch.steps ?? 0, water: patch.water ?? 0 });
}

export async function deleteActivity(id) {
  await db.dailyLogs.delete(id);
}

// Most recent logged bodyweight (kg), or null.
export async function getCurrentBodyweight() {
  const latest = await db.bodyStats.orderBy('date').reverse().filter((s) => s.weight != null).first();
  return latest?.weight ?? null;
}
