// OPUS native data layer — persistent SQLite via expo-sqlite (sync API).
// Mirrors the essentials of the web schema (exercises · workouts · sets) so the
// native app actually keeps your training history across restarts. All derived
// numbers (XP, PRs, streak, volume) are computed from these rows using the
// shared @opus/core logic, so web and native agree on the math.
import * as SQLite from 'expo-sqlite';
import { rpg, oneRepMax, dateKey, seedExercises, achievements, quests } from '@opus/core';

let db = null;

// Open once, lazily. openDatabaseSync is safe to call repeatedly but we cache.
function conn() {
  if (!db) db = SQLite.openDatabaseSync('opus.db');
  return db;
}

// ── Reactive layer ───────────────────────────────────────────────────────────
// The web app gets live UI via Dexie's useLiveQuery; expo-sqlite is synchronous
// with no observers, so we emulate it with a version counter. Every mutation
// calls touch(); the useDbQuery hook (native/useDbQuery.js) re-runs its query on
// each bump. Coarse-grained (any write refreshes every subscriber) but the data
// set is tiny, so it's cheap and keeps every screen consistent.
let _version = 0;
const _listeners = new Set();

export function dbVersion() {
  return _version;
}

export function subscribeDb(fn) {
  _listeners.add(fn);
  return () => _listeners.delete(fn);
}

// Bump the version and notify subscribers. Called after every write.
function touch() {
  _version += 1;
  for (const fn of _listeners) {
    try { fn(_version); } catch {}
  }
}

// Add a column to a table only if it's missing (SQLite has no ADD COLUMN IF NOT
// EXISTS). Lets us widen shipped tables toward the web v8 schema without a
// destructive migration — existing rows keep working, new columns are nullable.
function ensureColumn(d, table, column, decl) {
  const cols = d.getAllSync(`PRAGMA table_info(${table})`);
  if (!cols.some((c) => c.name === column)) {
    d.execSync(`ALTER TABLE ${table} ADD COLUMN ${column} ${decl}`);
  }
}

// Create tables + seed the exercise catalog on first run. Idempotent.
// Schema mirrors the web Dexie DB (v1–v8, src/db/db.js) so web and native model
// the same domain. Native keys exercises by `name` (its PK) rather than a
// numeric id; feature code stores the name in both exerciseName and exerciseId.
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
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );
    CREATE TABLE IF NOT EXISTS health (
      dateKey TEXT PRIMARY KEY,
      steps INTEGER,
      updatedAt INTEGER
    );

    -- ── Parity tables (mirror web Dexie v1–v8) ──────────────────────────────
    CREATE TABLE IF NOT EXISTS prs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      exerciseName TEXT NOT NULL,
      type TEXT NOT NULL,            -- 'weight' | 'reps' | 'volume' | 'e1rm'
      value REAL NOT NULL,
      achievedAt INTEGER NOT NULL,
      workoutId INTEGER
    );
    CREATE INDEX IF NOT EXISTS idx_prs_ex ON prs(exerciseName);

    CREATE TABLE IF NOT EXISTS templates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      dayOfWeek INTEGER,
      color TEXT,
      autoKey TEXT,                 -- muscle signature for auto-routine re-match
      createdAt INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS templateExercises (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      templateId INTEGER NOT NULL,
      exerciseName TEXT NOT NULL,
      orderIndex INTEGER NOT NULL DEFAULT 0,
      targetSets INTEGER,
      targetReps INTEGER,
      targetWeight REAL
    );
    CREATE INDEX IF NOT EXISTS idx_tex_template ON templateExercises(templateId);

    CREATE TABLE IF NOT EXISTS achievements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key TEXT NOT NULL UNIQUE,
      unlockedAt INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS questClaims (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      weekKey TEXT NOT NULL,
      questId TEXT NOT NULL,
      xp REAL NOT NULL DEFAULT 0,
      claimedAt INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_quest_week ON questClaims(weekKey);

    CREATE TABLE IF NOT EXISTS dailyLogs (
      dateKey TEXT PRIMARY KEY,     -- one row per date (steps live in the health table)
      water REAL
    );
    CREATE TABLE IF NOT EXISTS bodyStats (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      weight REAL,
      bodyFat REAL
    );
    CREATE INDEX IF NOT EXISTS idx_body_date ON bodyStats(date);
    CREATE TABLE IF NOT EXISTS sleepLogs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      hours REAL,
      quality INTEGER
    );
    CREATE TABLE IF NOT EXISTS energyLogs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      workoutId INTEGER NOT NULL,
      level INTEGER
    );
    CREATE TABLE IF NOT EXISTS exerciseNotes (
      exerciseName TEXT PRIMARY KEY,
      text TEXT,
      updatedAt INTEGER
    );
    CREATE TABLE IF NOT EXISTS userProfile (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      name TEXT,
      height REAL,
      sex TEXT,
      birthYear INTEGER,
      joinDate INTEGER
    );
  `);

  // Widen the originally-shipped tables toward the web schema (idempotent).
  ensureColumn(d, 'sets', 'exerciseId', 'TEXT');       // mirrors exerciseName
  ensureColumn(d, 'sets', 'setNumber', 'INTEGER');
  ensureColumn(d, 'sets', 'isWarmup', 'INTEGER DEFAULT 0');
  ensureColumn(d, 'sets', 'rpe', 'REAL');
  ensureColumn(d, 'sets', 'note', 'TEXT');
  ensureColumn(d, 'workouts', 'status', "TEXT");        // 'active' | 'completed'
  ensureColumn(d, 'workouts', 'duration', 'INTEGER');
  ensureColumn(d, 'workouts', 'totalVolume', 'REAL');
  ensureColumn(d, 'workouts', 'totalSets', 'INTEGER');
  ensureColumn(d, 'workouts', 'xpEarned', 'REAL');
  ensureColumn(d, 'workouts', 'templateId', 'INTEGER');
  ensureColumn(d, 'workouts', 'energy', 'INTEGER');
  ensureColumn(d, 'workouts', 'notes', 'TEXT');
  ensureColumn(d, 'workouts', 'color', 'TEXT');
  ensureColumn(d, 'workouts', 'bodyweightKg', 'REAL');
  ensureColumn(d, 'workouts', 'createdAt', 'INTEGER');

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

// Wipe all user data (keeps the seeded exercise catalog + settings). Every
// screen re-queries via touch(), so no app reload is needed.
export function wipeAllData() {
  const d = conn();
  d.withTransactionSync(() => {
    for (const t of ['sets', 'workouts', 'prs', 'templates', 'templateExercises', 'achievements', 'questClaims', 'dailyLogs', 'bodyStats', 'sleepLogs', 'energyLogs', 'exerciseNotes', 'health', 'userProfile']) {
      try { d.runSync(`DELETE FROM ${t}`); } catch {}
    }
  });
  touch();
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
    'INSERT INTO workouts (dateKey, startedAt, name, status) VALUES (?, ?, ?, ?)',
    dateKey.todayKey(),
    now,
    name,
    'active'
  );
  touch();
  return { id: res.lastInsertRowId, dateKey: dateKey.todayKey(), startedAt: now, finishedAt: null, name };
}

export function addSet(workoutId, { exerciseName = '', weight = 0, reps = 0, isWarmup = false, rpe = null } = {}) {
  const d = conn();
  const res = d.runSync(
    'INSERT INTO sets (workoutId, exerciseName, exerciseId, weight, reps, isWarmup, rpe, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    workoutId,
    exerciseName || null,
    exerciseName || null, // native keys exercises by name; mirror into exerciseId
    Number(weight) || 0,
    Number(reps) || 0,
    isWarmup ? 1 : 0,
    rpe == null ? null : Number(rpe),
    Date.now()
  );
  touch();
  return res.lastInsertRowId;
}

export function deleteSet(id) {
  conn().runSync('DELETE FROM sets WHERE id = ?', id);
  touch();
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
    touch();
    return false;
  }
  // Snapshot totals + status + earned XP onto the row (mirrors the web schema so
  // Progress / Wrapped / achievements can read them without recomputing).
  const working = d.getAllSync(
    'SELECT weight, reps FROM sets WHERE workoutId = ? AND COALESCE(isWarmup, 0) = 0',
    workoutId
  );
  let volume = 0;
  let setXP = 0;
  for (const st of working) {
    volume += (st.weight || 0) * (st.reps || 0);
    setXP += rpg.calcSetXP(st.weight || 0, st.reps || 0);
  }
  const xpEarned = Math.round(setXP + rpg.COMPLETE_BONUS);
  const now = Date.now();
  const started = d.getFirstSync('SELECT startedAt FROM workouts WHERE id = ?', workoutId)?.startedAt ?? now;
  d.runSync(
    'UPDATE workouts SET finishedAt = ?, status = ?, createdAt = COALESCE(createdAt, ?), duration = ?, totalSets = ?, totalVolume = ?, xpEarned = ? WHERE id = ?',
    now,
    'completed',
    now,
    Math.round((now - started) / 1000),
    working.length,
    Math.round(volume),
    xpEarned,
    workoutId
  );
  touch();
  return true;
}

// Stored per-workout summary (after finishWorkout). Used by the end-of-workout
// modal and history without re-deriving from sets.
export function getWorkoutSummary(workoutId) {
  const r = conn().getFirstSync(
    'SELECT totalSets, totalVolume, xpEarned, duration FROM workouts WHERE id = ?',
    workoutId
  );
  return {
    totalSets: r?.totalSets ?? 0,
    totalVolume: Math.round(r?.totalVolume ?? 0),
    xpEarned: Math.round(r?.xpEarned ?? 0),
    durationSec: r?.duration ?? 0,
  };
}

export function discardWorkout(workoutId) {
  const d = conn();
  d.withTransactionSync(() => {
    d.runSync('DELETE FROM sets WHERE workoutId = ?', workoutId);
    d.runSync('DELETE FROM energyLogs WHERE workoutId = ?', workoutId);
    d.runSync('DELETE FROM prs WHERE workoutId = ?', workoutId);
    d.runSync('DELETE FROM workouts WHERE id = ?', workoutId);
  });
  touch();
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
  // XP = per-set + per-session bonus + achievement rewards + claimed-quest XP
  // (matches the web, where both count toward level/rank).
  const totalXP = setXP + wCount * rpg.COMPLETE_BONUS + achievementXP() + questClaimXP();

  return {
    workouts: wCount,
    sets: setRows.length,
    totalVolume: Math.round(totalVolume),
    totalXP,
    streak: getStreak(),
  };
}

// ── Weekly quests (shared engine: @opus/core/quests) ─────────────────────────
// This week's per-metric progress, computed from completed workouts in the
// Monday-aligned week window.
export function getWeekQuestStats() {
  const d = conn();
  const startMs = quests.weekStartMs();
  const endMs = startMs + 7 * 86400000;
  const workouts = d.getAllSync(
    `SELECT w.id AS id,
            COALESCE(SUM(CASE WHEN COALESCE(s.isWarmup,0)=0 THEN s.weight * s.reps ELSE 0 END), 0) AS totalVolume
       FROM workouts w
       LEFT JOIN sets s ON s.workoutId = w.id
      WHERE w.finishedAt IS NOT NULL AND w.finishedAt >= ? AND w.finishedAt < ?
      GROUP BY w.id`,
    startMs,
    endMs
  );
  const sets = d.getAllSync(
    `SELECT s.workoutId AS workoutId, COALESCE(s.exerciseId, s.exerciseName) AS exerciseId
       FROM sets s JOIN workouts w ON w.id = s.workoutId
      WHERE w.finishedAt IS NOT NULL AND w.finishedAt >= ? AND w.finishedAt < ? AND COALESCE(s.isWarmup,0) = 0`,
    startMs,
    endMs
  );
  const prs = d.getAllSync('SELECT id FROM prs WHERE achievedAt >= ? AND achievedAt < ?', startMs, endMs);
  const exRows = d.getAllSync('SELECT name, muscleGroup FROM exercises');
  const exMuscle = Object.fromEntries(exRows.map((e) => [e.name, e.muscleGroup]));
  return quests.computeQuestStats({ workouts, sets, prs, exMuscle });
}

export function getQuestClaims(weekKey = quests.weekKeyOf()) {
  return conn().getAllSync('SELECT questId FROM questClaims WHERE weekKey = ?', weekKey).map((r) => r.questId);
}

// Claim a quest once per week (idempotent). XP counts toward totalXP.
export function claimQuest(questId, xp) {
  const weekKey = quests.weekKeyOf();
  const d = conn();
  const existing = d.getFirstSync('SELECT id FROM questClaims WHERE weekKey = ? AND questId = ?', weekKey, questId);
  if (existing) return false;
  d.runSync('INSERT INTO questClaims (weekKey, questId, xp, claimedAt) VALUES (?, ?, ?, ?)', weekKey, questId, Number(xp) || 0, Date.now());
  touch();
  return true;
}

export function questClaimXP() {
  let xp = 0;
  for (const r of conn().getAllSync('SELECT xp FROM questClaims')) xp += r.xp || 0;
  return xp;
}

// ── Wrapped inputs (shared engine: @opus/core/wrapped) ───────────────────────
// Shapes finished-workout rows for wrapped.buildWrapped. Native keys exercises
// by name, but buildWrapped resolves the top lift via a numeric id → we remap
// names to synthetic ids and return the matching exName map.
export function getWrappedInputs() {
  const d = conn();
  const workouts = d
    .getAllSync(
      `SELECT id, dateKey AS date, COALESCE(totalVolume,0) AS totalVolume,
              COALESCE(xpEarned,0) AS xpEarned, COALESCE(duration,0) AS duration
         FROM workouts WHERE finishedAt IS NOT NULL`
    )
    .map((w) => ({ ...w, status: 'completed' }));

  const exId = new Map();
  const exName = {};
  const idOf = (name) => {
    if (!name) return 0;
    if (!exId.has(name)) {
      const id = exId.size + 1;
      exId.set(name, id);
      exName[id] = name;
    }
    return exId.get(name);
  };
  const sets = d
    .getAllSync('SELECT workoutId, COALESCE(exerciseId, exerciseName) AS name, weight, reps, isWarmup FROM sets')
    .map((s) => ({ workoutId: s.workoutId, exerciseId: idOf(s.name), weight: s.weight, reps: s.reps, isWarmup: s.isWarmup }));

  const prs = d.getAllSync('SELECT achievedAt FROM prs');
  return { workouts, sets, prs, exName };
}

// ── Achievements (shared engine: @opus/core/achievements) ────────────────────
export function unlockedAchievements() {
  return conn().getAllSync('SELECT key, unlockedAt FROM achievements');
}

export function unlockedAchievementKeys() {
  return unlockedAchievements().map((r) => r.key);
}

// Total XP from unlocked achievements (used inside getTotals).
export function achievementXP() {
  let xp = 0;
  for (const r of unlockedAchievements()) {
    xp += achievements.ACHIEVEMENT_BY_KEY[r.key]?.xp || 0;
  }
  return xp;
}

// Assemble the lifetime aggregates the achievement predicates need, from rows.
export function computeAchievementStats() {
  const d = conn();
  const workouts = d.getAllSync(
    'SELECT dateKey AS date, totalVolume, totalSets, createdAt FROM workouts WHERE finishedAt IS NOT NULL'
  );
  const sets = d.getAllSync(
    'SELECT COALESCE(exerciseId, exerciseName) AS exerciseId, isWarmup FROM sets'
  );
  const prs = d.getAllSync('SELECT id FROM prs');
  const exercises = d.getAllSync('SELECT name AS id, muscleGroup FROM exercises');
  // Level from XP excluding achievement XP, to avoid a self-referential gate.
  const base = d.getFirstSync(
    `SELECT COUNT(*) AS n FROM workouts WHERE finishedAt IS NOT NULL`
  )?.n || 0;
  const setXpRows = d.getAllSync(
    `SELECT s.weight AS weight, s.reps AS reps FROM sets s
       JOIN workouts w ON w.id = s.workoutId WHERE w.finishedAt IS NOT NULL`
  );
  let setXP = 0;
  for (const s of setXpRows) setXP += rpg.calcSetXP(s.weight || 0, s.reps || 0);
  const level = rpg.getLevelFromTotalXP(setXP + base * rpg.COMPLETE_BONUS + achievementXP());
  return achievements.computeStats({ workouts, sets, prs, exercises, level });
}

// Re-lock achievements whose condition no longer holds (e.g. after a workout
// delete) so their XP reverts — the data-integrity rule. Uses core staleKeys.
export function reconcileAchievements() {
  const stats = computeAchievementStats();
  const stale = achievements.staleKeys(stats, unlockedAchievementKeys());
  if (stale.length) {
    const d = conn();
    for (const k of stale) {
      try { d.runSync('DELETE FROM achievements WHERE key = ?', k); } catch {}
    }
    touch();
  }
  return stale;
}

// Delete a workout and everything derived from it (sets, energy logs, and PRs
// scoped to it), then re-lock any achievements that no longer hold. XP/level
// revert automatically because getTotals recomputes from remaining rows.
export function deleteWorkout(workoutId) {
  const d = conn();
  d.withTransactionSync(() => {
    d.runSync('DELETE FROM sets WHERE workoutId = ?', workoutId);
    d.runSync('DELETE FROM energyLogs WHERE workoutId = ?', workoutId);
    d.runSync('DELETE FROM prs WHERE workoutId = ?', workoutId);
    d.runSync('DELETE FROM workouts WHERE id = ?', workoutId);
  });
  reconcileAchievements();
  touch();
}

// Detect + persist newly-earned achievements. Returns the new defs (for a toast).
export function syncAchievements() {
  const stats = computeAchievementStats();
  const newly = achievements.newlyUnlocked(stats, unlockedAchievementKeys());
  if (newly.length) {
    const now = Date.now();
    const d = conn();
    for (const a of newly) {
      try { d.runSync('INSERT OR IGNORE INTO achievements (key, unlockedAt) VALUES (?, ?)', a.key, now); } catch {}
    }
    touch();
  }
  return newly;
}

// Volume per Monday-aligned week (oldest→newest, last `weeks` buckets) computed
// from working sets — robust even for rows saved before totals were stored.
export function getWeeklyVolume(weeks = 8) {
  const d = conn();
  const rows = d.getAllSync(
    `SELECT w.dateKey AS dateKey, COALESCE(SUM(s.weight * s.reps), 0) AS volume
       FROM workouts w
       LEFT JOIN sets s ON s.workoutId = w.id AND COALESCE(s.isWarmup, 0) = 0
      WHERE w.finishedAt IS NOT NULL
      GROUP BY w.id`
  );
  const byWeek = new Map();
  for (const r of rows) {
    if (!r.dateKey) continue;
    const dt = new Date(`${r.dateKey}T00:00:00`);
    dt.setHours(0, 0, 0, 0);
    dt.setDate(dt.getDate() - ((dt.getDay() + 6) % 7)); // back to Monday
    const k = dt.getTime();
    byWeek.set(k, (byWeek.get(k) || 0) + (r.volume || 0));
  }
  const keys = [...byWeek.keys()].sort((a, b) => a - b).slice(-weeks);
  return keys.map((k) => ({ weekStartMs: k, volume: Math.round(byWeek.get(k)) }));
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

// Best estimated 1RM for an exercise across finished workouts EXCLUDING one
// workout — used to detect whether the just-finished session set a new PR.
export function priorBestE1rm(exerciseName, excludeWorkoutId) {
  if (!exerciseName) return 0;
  const d = conn();
  const rows = d.getAllSync(
    `SELECT s.weight AS weight, s.reps AS reps
       FROM sets s JOIN workouts w ON w.id = s.workoutId
      WHERE w.finishedAt IS NOT NULL AND s.exerciseName = ? AND s.workoutId != ? AND s.weight > 0`,
    exerciseName,
    excludeWorkoutId ?? -1
  );
  let best = 0;
  for (const s of rows) best = Math.max(best, oneRepMax.epley1RM(s.weight, s.reps));
  return best;
}

// ── Settings (key/value) ─────────────────────────────────────────────────────
export function getAllSettings() {
  const out = {};
  try {
    for (const r of conn().getAllSync('SELECT key, value FROM settings')) out[r.key] = r.value;
  } catch {}
  return out;
}

export function setSetting(key, value) {
  conn().runSync(
    'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
    key,
    String(value)
  );
  touch();
}

// ── Health (daily steps) ─────────────────────────────────────────────────────
export function setSteps(day, steps) {
  conn().runSync(
    'INSERT INTO health (dateKey, steps, updatedAt) VALUES (?, ?, ?) ON CONFLICT(dateKey) DO UPDATE SET steps = excluded.steps, updatedAt = excluded.updatedAt',
    day,
    Math.round(Number(steps) || 0),
    Date.now()
  );
  touch();
}

export function getSteps(day) {
  const r = conn().getFirstSync('SELECT steps FROM health WHERE dateKey = ?', day);
  return r ? r.steps : null;
}

// ── Water intake (dailyLogs) ─────────────────────────────────────────────────
export function setWater(day, glasses) {
  conn().runSync(
    'INSERT INTO dailyLogs (dateKey, water) VALUES (?, ?) ON CONFLICT(dateKey) DO UPDATE SET water = excluded.water',
    day,
    Number(glasses) || 0
  );
  touch();
}

export function getWater(day) {
  const r = conn().getFirstSync('SELECT water FROM dailyLogs WHERE dateKey = ?', day);
  return r ? r.water : null;
}

// ── Body stats (weight / body fat) ───────────────────────────────────────────
export function logBodyStat({ date, weight, bodyFat = null }) {
  const d = conn();
  const existing = d.getFirstSync('SELECT id FROM bodyStats WHERE date = ?', date);
  if (existing) {
    d.runSync('UPDATE bodyStats SET weight = ?, bodyFat = ? WHERE id = ?', weight ?? null, bodyFat, existing.id);
  } else {
    d.runSync('INSERT INTO bodyStats (date, weight, bodyFat) VALUES (?, ?, ?)', date, weight ?? null, bodyFat);
  }
  touch();
}

export function getBodyStats(limit = 60) {
  return conn().getAllSync('SELECT * FROM bodyStats ORDER BY date DESC LIMIT ?', limit);
}

export function currentBodyweight() {
  const r = conn().getFirstSync('SELECT weight FROM bodyStats WHERE weight IS NOT NULL ORDER BY date DESC LIMIT 1');
  return r ? r.weight : null;
}

// ── PRs (personal records) ───────────────────────────────────────────────────
export function addPR({ exerciseName, type, value, workoutId = null, achievedAt = Date.now() }) {
  conn().runSync(
    'INSERT INTO prs (exerciseName, type, value, achievedAt, workoutId) VALUES (?, ?, ?, ?, ?)',
    exerciseName,
    type,
    Number(value) || 0,
    achievedAt,
    workoutId
  );
  touch();
}

export function getAllPRs(limit = 100) {
  return conn().getAllSync('SELECT * FROM prs ORDER BY achievedAt DESC LIMIT ?', limit);
}
