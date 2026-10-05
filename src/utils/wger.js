import { db } from '../db/db.js';
import {
  CARDIO_EXERCISES,
  STOCK_EXERCISES,
  cardioRow,
  isRowId,
  orphanEvidence,
  planOrphanRepair,
} from './catalogue.js';

// Re-exported with a local binding (not `export … from`), so the name exists
// in this module too — see the MUSCLE_LABEL crash in docs/STATE.md.
export { CARDIO_EXERCISES };

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

// Not called anywhere, and must not be wired up as it stands: it clears the
// exercise table (custom lifts included) and refills it at fresh ids, which
// would orphan every logged set — the same failure `healCatalogue` repairs.
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

// ---------------------------------------------------------------------------
// Keeping the catalogue whole
//
// Every set, routine link, record and note points at an exercise by id. When
// the row behind an id goes missing the lift reads "Exercise" everywhere, and
// a restore from a slim backup used to do exactly that to a real user's whole
// catalogue (see catalogue.js). These run on every app open and at the end of
// every import, so a device that already restored a broken backup heals the
// next time it starts.
// ---------------------------------------------------------------------------

const isDuplicateKey = (err) => err?.name === 'BulkError' || err?.name === 'ConstraintError';

/**
 * Put back any stock exercise whose id is missing — however many other rows
 * the table has. The old seed only ran into an empty table, so a table holding
 * one restored custom lift never got its 74 stock rows back.
 */
export async function ensureStockCatalogue() {
  const have = new Set(await db.exercises.toCollection().primaryKeys());
  const missing = STOCK_EXERCISES.filter((e) => !have.has(e.id));
  if (!missing.length) return 0;
  try {
    await db.exercises.bulkAdd(missing);
  } catch (err) {
    // Another seeder got there first; the rows are the same either way.
    if (!isDuplicateKey(err)) throw err;
  }
  return missing.length;
}

/** Ids referenced anywhere in the data with no exercise row behind them. */
async function orphanedExerciseIds() {
  const have = new Set(await db.exercises.toCollection().primaryKeys());
  const referenced = new Set();
  // All four tables index exerciseId, so this reads keys, never rows.
  for (const table of [db.sets, db.templateExercises, db.prs, db.exerciseNotes]) {
    for (const id of await table.orderBy('exerciseId').uniqueKeys()) referenced.add(id);
  }
  return [...referenced].filter((id) => isRowId(id) && !have.has(id));
}

/** Point everything that referenced `from` at the existing row `to`. */
async function moveReferences(from, to) {
  await db.sets.where('exerciseId').equals(from).modify({ exerciseId: to });
  await db.templateExercises.where('exerciseId').equals(from).modify({ exerciseId: to });
  // References only ever move onto a cardio machine, and a cardio bout can
  // never hold a record — so any record row here is stale: drop, don't merge.
  await db.prs.where('exerciseId').equals(from).delete();
  const notes = await db.exerciseNotes.where('exerciseId').equals(from).toArray();
  if (!notes.length) return;
  const target = await db.exerciseNotes.where('exerciseId').equals(to).first();
  if (!target) {
    await db.exerciseNotes.where('exerciseId').equals(from).modify({ exerciseId: to });
    return;
  }
  // One note per exercise: keep both texts rather than lose either.
  const text = [target.text, ...notes.map((n) => n.text)].filter(Boolean).join('\n');
  await db.exerciseNotes.update(target.id, { text });
  await db.exerciseNotes.bulkDelete(notes.map((n) => n.id));
}

/**
 * Give every orphaned exercise id a row again: the cardio machines rebuilt at
 * the ids their bouts point to, or moved onto the same machine where it was
 * re-created under a new id; anything unidentifiable gets a "Restored
 * exercise" placeholder so its history stays readable and editable. Returns
 * the plan, or null when nothing was orphaned (the usual case, and cheap).
 */
export async function repairOrphans() {
  const orphanIds = await orphanedExerciseIds();
  if (!orphanIds.length) return null;
  const evidence = orphanEvidence(await db.sets.where('exerciseId').anyOf(orphanIds).toArray());
  const existing = await db.exercises.toArray();
  const plan = planOrphanRepair({ orphanIds, evidence, existing });
  if (plan.create.length) await db.exercises.bulkAdd(plan.create);
  for (const { from, to } of plan.remap) await moveReferences(from, to);
  return plan;
}

/**
 * Add any cardio machine the library is missing, by name — so it can never
 * add a second "Treadmill", whatever ids the existing ones have. Must run
 * AFTER `repairOrphans`, which rebuilds the old machines at their old ids;
 * the other way round, fresh rows would take the names first and the old ids
 * would stay orphaned.
 */
export async function ensureCardioExercises() {
  return db.transaction('rw', db.exercises, async () => {
    const have = new Set((await db.exercises.toArray()).map((e) => e.name));
    const missing = CARDIO_EXERCISES.filter((c) => !have.has(c.name)).map((c) => cardioRow(c));
    if (missing.length) await db.exercises.bulkAdd(missing);
    return missing.length;
  });
}

/**
 * The whole repair, in the only order that works: stock rows back at their
 * fixed ids, orphans resolved, then any cardio still missing. One transaction,
 * so nothing else can read the catalogue half-mended — and an import calls it
 * inside its own transaction, which this joins.
 */
export async function healCatalogue() {
  return db.transaction(
    'rw',
    [db.exercises, db.sets, db.templateExercises, db.prs, db.exerciseNotes],
    async () => {
      const stock = await ensureStockCatalogue();
      const plan = await repairOrphans();
      const cardio = await ensureCardioExercises();
      return { stock, plan, cardio };
    }
  );
}

// Seeding is requested by every screen that lists exercises, often several at
// once. Concurrent callers share one in-flight run, and once a run has
// succeeded the rest of this page load skips it: nothing in a session can
// orphan an id (an import or a reset reloads the page), so once is enough.
let seedInFlight = null;
let healed = false;

/**
 * Seed and heal the exercise catalogue. Safe to call from anywhere, any
 * number of times; `force` re-runs it within the same page load. Never
 * rejects — screens fire it without waiting — and a failed run is retried by
 * the next caller.
 */
export async function seedDatabase({ force = false } = {}) {
  if (healed && !force) return null;
  if (seedInFlight) return seedInFlight;
  seedInFlight = (async () => {
    try {
      const result = await healCatalogue();
      healed = true;
      return result;
    } catch (err) {
      console.error('Exercise catalogue repair failed:', err);
      return null;
    }
  })();
  try {
    return await seedInFlight;
  } finally {
    seedInFlight = null;
  }
}
