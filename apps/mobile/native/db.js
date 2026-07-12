// OPUS native data layer — persistent SQLite via expo-sqlite (sync API).
// Mirrors the essentials of the web schema (exercises · workouts · sets) so the
// native app actually keeps your training history across restarts. All derived
// numbers (XP, PRs, streak, volume) are computed from these rows using the
// shared @opus/core logic, so web and native agree on the math.
import * as SQLite from 'expo-sqlite';
import { rpg, oneRepMax, dateKey, seedExercises } from '@opus/core';

let db = null;

// Open once, lazily. openDatabaseSync is safe to call repeatedly but we cache.
function conn() {
  if (!db) db = SQLite.openDatabaseSync('opus.db');
  return db;
}

// Create tables + seed the exercise catalog on first run. Idempotent.
export function initDb() {
  const d = conn();
  d.execSync(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS exercises (
      name TEXT PRIMARY KEY,
      muscleGroup TEXT,
      equipment TEXT,
      difficulty TEXT
    );
    CREATE TABLE IF NOT EXISTS workouts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      dateKey TEXT NOT NULL,
      startedAt INTEGER NOT NULL,
      finishedAt INTEGER,
      name TEXT
    );
    CREATE TABLE IF NOT EXISTS sets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      workoutId INTEGER NOT NULL,
      exerciseName TEXT,
      weight REAL NOT NULL DEFAULT 0,
      reps INTEGER NOT NULL DEFAULT 0,
      createdAt INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_sets_workout ON sets(workoutId);
    CREATE INDEX IF NOT EXISTS idx_workouts_date ON workouts(dateKey);
  `);

  const row = d.getFirstSync('SELECT COUNT(*) AS n FROM exercises');
  if (!row || row.n === 0) {
    const list = Array.isArray(seedExercises) ? seedExercises : [];
    d.withTransactionSync(() => {
      for (const e of list) {
        if (!e || !e.name) continue;
        d.runSync(
          'INSERT OR IGNORE INTO exercises (name, muscleGroup, equipment, difficulty) VALUES (?, ?, ?, ?)',
          e.name,
          e.muscleGroup ?? null,
          e.equipment ?? null,
          e.difficulty ?? null
        );
      }
    });
  }
}

// ── Exercises ──────────────────────────────────────────────────────────────
export function getExercises(query = '') {
  const d = conn();
  const t = String(query || '').trim().toLowerCase();
  if (t) {
    return d.getAllSync(
      'SELECT * FROM exercises WHERE LOWER(name) LIKE ? ORDER BY name',
      `%${t}%`
    );
  }
  return d.getAllSync('SELECT * FROM exercises ORDER BY name');
}

// ── Active workout ───────────────────────────────────────────────────────────
// The in-progress workout is simply the newest row with finishedAt IS NULL.
export function getActiveWorkout() {
  const d = conn();
  return (
    d.getFirstSync(
      'SELECT * FROM workouts WHERE finishedAt IS NULL ORDER BY startedAt DESC LIMIT 1'
    ) || null
  );
}

export function getOrCreateActiveWorkout(name = 'Workout') {
  const existing = getActiveWorkout();
  if (existing) return existing;
  const d = conn();
  const now = Date.now();
  const res = d.runSync(
    'INSERT INTO workouts (dateKey, startedAt, name) VALUES (?, ?, ?)',
    dateKey.todayKey(),
    now,
    name
  );
  return { id: res.lastInsertRowId, dateKey: dateKey.todayKey(), startedAt: now, finishedAt: null, name };
}

export function addSet(workoutId, { exerciseName = '', weight = 0, reps = 0 }) {
  const d = conn();
  const res = d.runSync(
    'INSERT INTO sets (workoutId, exerciseName, weight, reps, createdAt) VALUES (?, ?, ?, ?, ?)',
    workoutId,
    exerciseName || null,
    Number(weight) || 0,
    Number(reps) || 0,
    Date.now()
  );
  return res.lastInsertRowId;
}

export function deleteSet(id) {
  conn().runSync('DELETE FROM sets WHERE id = ?', id);
}

export function getSets(workoutId) {
  return conn().getAllSync('SELECT * FROM sets WHERE workoutId = ? ORDER BY createdAt', workoutId);
}

// Finish a workout — or discard it entirely if it holds no sets (so an
// abandoned "Start workout" tap never litters history). Deletable per the
// data-integrity rule: derived stats recompute from rows, nothing is cached.
export function finishWorkout(workoutId) {
  const d = conn();
  const cnt = d.getFirstSync('SELECT COUNT(*) AS n FROM sets WHERE workoutId = ?', workoutId);
  if (!cnt || cnt.n === 0) {
    d.runSync('DELETE FROM workouts WHERE id = ?', workoutId);
    return false;
  }
  d.runSync('UPDATE workouts SET finishedAt = ? WHERE id = ?', Date.now(), workoutId);
  return true;
}

export function discardWorkout(workoutId) {
  const d = conn();
  d.withTransactionSync(() => {
    d.runSync('DELETE FROM sets WHERE workoutId = ?', workoutId);
    d.runSync('DELETE FROM workouts WHERE id = ?', workoutId);
  });
}

// ── Derived stats (all from rows, via @opus/core) ────────────────────────────
export function getRecentWorkouts(limit = 20) {
  const d = conn();
  const rows = d.getAllSync(
    `SELECT w.*,
            COUNT(s.id) AS setCount,
            COALESCE(SUM(s.weight * s.reps), 0) AS volume
       FROM workouts w
       LEFT JOIN sets s ON s.workoutId = w.id
      WHERE w.finishedAt IS NOT NULL
      GROUP BY w.id
      ORDER BY w.finishedAt DESC
      LIMIT ?`,
    limit
  );
  return rows;
}

// Consecutive-day streak of finished workouts, ending today or yesterday.
export function getStreak() {
  const d = conn();
  const rows = d.getAllSync(
    'SELECT DISTINCT dateKey FROM workouts WHERE finishedAt IS NOT NULL ORDER BY dateKey DESC'
  );
  const days = rows.map((r) => r.dateKey);
  if (days.length === 0) return 0;
  const today = dateKey.todayKey();
  const gapToNewest = dateKey.daysBetween(days[0], today);
  if (gapToNewest == null || gapToNewest > 1) return 0; // streak already broken
  let streak = 1;
  for (let i = 1; i < days.length; i++) {
    if (dateKey.daysBetween(days[i], days[i - 1]) === 1) streak++;
    else break;
  }
  return streak;
}

export function getTotals() {
  const d = conn();
  // XP earned only from finished workouts (matches the web award timing).
  const setRows = d.getAllSync(
    `SELECT s.weight AS weight, s.reps AS reps
       FROM sets s JOIN workouts w ON w.id = s.workoutId
      WHERE w.finishedAt IS NOT NULL`
  );
  const wCount =
    d.getFirstSync('SELECT COUNT(*) AS n FROM workouts WHERE finishedAt IS NOT NULL')?.n || 0;

  let totalVolume = 0;
  let setXP = 0;
  for (const s of setRows) {
    totalVolume += (s.weight || 0) * (s.reps || 0);
    setXP += rpg.calcSetXP(s.weight || 0, s.reps || 0);
  }
  const totalXP = setXP + wCount * rpg.COMPLETE_BONUS;

  return {
    workouts: wCount,
    sets: setRows.length,
    totalVolume: Math.round(totalVolume),
    totalXP,
    streak: getStreak(),
  };
}

// Best estimated 1RM per exercise (top movers first).
export function getBestByExercise(limit = 8) {
  const d = conn();
  const rows = d.getAllSync(
    `SELECT s.exerciseName AS name, s.weight AS weight, s.reps AS reps
       FROM sets s JOIN workouts w ON w.id = s.workoutId
      WHERE w.finishedAt IS NOT NULL AND s.exerciseName IS NOT NULL AND s.weight > 0`
  );
  const best = new Map();
  for (const s of rows) {
    const e1rm = oneRepMax.epley1RM(s.weight, s.reps);
    const prev = best.get(s.name);
    if (!prev || e1rm > prev.e1rm) best.set(s.name, { name: s.name, e1rm, weight: s.weight, reps: s.reps });
  }
  return [...best.values()].sort((a, b) => b.e1rm - a.e1rm).slice(0, limit);
}
