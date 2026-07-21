import { db } from '../db/db.js';
import seed from './seedExercises.js';

const BASE = 'https://wger.de/api/v2';
const CACHE_KEY = 'wger_synced_at';
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 1 week

// Maps Wger primary-muscle IDs to react-body-highlighter keys
const MUSCLE_MAP = {
  1: 'biceps', 2: 'front-deltoids', 3: 'chest', 4: 'triceps',
  5: 'abs', 6: 'quadriceps', 7: 'trapezius', 8: 'upper-back',
  9: 'hamstring', 10: 'gluteal', 11: 'calves', 12: 'forearm',
  13: 'obliques', 14: 'back-deltoids', 15: 'lower-back',
};

const EQUIP_MAP = {
  1: 'barbell', 2: 'machine', 3: 'dumbbell', 4: 'barbell', // 4 = ez-bar
  6: 'dumbbell', 7: 'machine', 8: 'cable', 9: 'bodyweight', 10: 'cable',
};

async function fetchPage(url) {
  const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
  if (!res.ok) throw new Error(`Wger ${res.status}`);
  return res.json();
}

function mapExercise(item) {
  const translation = item.translations?.find(t => t.language === 2);
  const name = translation?.name?.trim();
  if (!name) return null;

  const muscleId = item.muscles?.[0]?.id;
  const muscleGroup = MUSCLE_MAP[muscleId] ?? 'upper-back';
  const secondaryMuscles = (item.muscles_secondary ?? [])
    .map(m => MUSCLE_MAP[m.id]).filter(Boolean);
  const equipId = item.equipment?.[0]?.id;
  const equipment = EQUIP_MAP[equipId] ?? 'bodyweight';

  return {
    name,
    muscleGroup,
    secondaryMuscles,
    equipment,
    description: translation?.description ?? '',
    isCustom: false,
    wgerId: item.id ?? null,
  };
}

async function fetchAllExercises() {
  const exercises = [];
  let url = `${BASE}/exerciseinfo/?format=json&language=2&limit=100`;
  while (url) {
    const page = await fetchPage(url);
    for (const item of page.results ?? []) {
      const ex = mapExercise(item);
      if (ex) exercises.push(ex);
    }
    url = page.next ?? null;
    // Safety cap: stop after 10 pages (1000 exercises)
    if (exercises.length >= 1000) break;
  }
  return exercises;
}

export async function syncExercises() {
  // Skip if recently synced
  const lastSync = localStorage.getItem(CACHE_KEY);
  if (lastSync && Date.now() - Number(lastSync) < CACHE_TTL_MS) return;

  const count = await db.exercises.count();
  try {
    const exercises = await fetchAllExercises();
    if (exercises.length > 0) {
      await db.exercises.clear();
      await db.exercises.bulkAdd(exercises);
      localStorage.setItem(CACHE_KEY, String(Date.now()));
    }
  } catch {
    // Network unavailable — seed if DB is empty
    if (count === 0) await seedDatabase();
  }
}

// Cardio machines/modalities. `cardioMode` drives the logger: 'treadmill' logs
// speed + incline (ACSM calories); 'met' logs time at a base MET. Added via an
// idempotent ensure so existing users get them without a fresh seed.
export const CARDIO_EXERCISES = [
  { name: 'Treadmill', cardioMode: 'treadmill', met: null },
  { name: 'Walking', cardioMode: 'treadmill', met: null },
  { name: 'Running', cardioMode: 'treadmill', met: null },
  { name: 'Cycling', cardioMode: 'met', met: 7 },
  { name: 'Rowing Machine', cardioMode: 'met', met: 7 },
  { name: 'Elliptical', cardioMode: 'met', met: 5 },
  { name: 'Stair Climber', cardioMode: 'met', met: 8 },
  { name: 'Jump Rope', cardioMode: 'met', met: 11 },
];

// Add any cardio exercises the library is missing (by name). Idempotent, so it
// runs safely on every seed for both fresh and existing databases.
export async function ensureCardioExercises() {
  const have = new Set((await db.exercises.toArray()).map((e) => e.name));
  const missing = CARDIO_EXERCISES.filter((c) => !have.has(c.name)).map((c) => ({
    name: c.name,
    muscleGroup: 'cardio',
    equipment: 'cardio',
    difficulty: 'beginner',
    cardioMode: c.cardioMode,
    met: c.met,
    secondaryMuscles: [],
    description: '',
    isCustom: false,
    wgerId: null,
  }));
  if (missing.length) {
    try { await db.exercises.bulkAdd(missing); }
    catch (err) { if (err?.name !== 'BulkError' && err?.name !== 'ConstraintError') throw err; }
  }
}

// Seeding can be triggered from several mounts at once (multiple useExercises
// consumers). Two callers both seeing count===0 would each bulkAdd the same
// rows, and the second collides on the explicit ids → BulkError. Share a single
// in-flight seed across concurrent callers, and treat an already-populated table
// (or a duplicate-key race) as success rather than a thrown error.
let seedInFlight = null;

export async function seedDatabase() {
  if (seedInFlight) return seedInFlight;
  seedInFlight = (async () => {
    const count = await db.exercises.count();
    if (count === 0) {
      try {
        await db.exercises.bulkAdd(seed);
      } catch (err) {
        // A concurrent seeder already inserted these rows → duplicate-key
        // BulkError. The end state is the same seed set, so treat it as success.
        if (err?.name !== 'BulkError' && err?.name !== 'ConstraintError') throw err;
      }
    }
    // Additive for both fresh and existing databases.
    await ensureCardioExercises();
  })();
  try {
    return await seedInFlight;
  } finally {
    seedInFlight = null;
  }
}
