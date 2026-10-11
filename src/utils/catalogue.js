// The exercise catalogue's fixed points, and how to put it back together.
//
// Written after a restore emptied a real user's catalogue. Their backup held
// one custom exercise and nothing else, because the "slim" backup dropped every
// non-custom row on the theory that the app re-seeds them. It did not: the seed
// only ran into an EMPTY table, and the restored table held that one custom
// row. 74 stock lifts and 8 cardio machines were gone, every set pointing at
// them read "Exercise", and the weekly backup then saved the broken state.
//
// Three facts the repair stands on:
// - The stock catalogue has explicit ids, a stable 1–74, so any missing stock
//   row can be put back exactly where its sets expect it.
// - The cardio rows do NOT have fixed ids. They were added by name on
//   2026-07-22 as 8 auto-increment rows in `CARDIO_EXERCISES` order, so they sit
//   in one consecutive block somewhere at or after 75 — straight after the
//   stock seed for anyone who installed later, after their custom exercises for
//   anyone who installed earlier. Slim backups never carried them.
// - A cardio set says which half of that block it came from: treadmill-mode
//   machines (the first three) log speed and incline, the rest log time alone.
//
// Pure + unit-tested. The DB side lives in `wger.js`.

import seed from './seedExercises.js';

/** The stock catalogue, ids included. */
export const STOCK_EXERCISES = seed;
export const STOCK_BY_ID = new Map(seed.map((e) => [e.id, e]));
/** The last stock id. Nothing the user or the app added can sit at or below it. */
export const STOCK_MAX_ID = seed.reduce((m, e) => Math.max(m, e.id), 0);

// Cardio machines/modalities. `cardioMode` drives the logger: 'treadmill' logs
// speed + incline (ACSM calories); 'met' logs time at a base MET. The ORDER is
// load-bearing: it is the order the rows were first inserted in, which is the
// only record of which id each one got.
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

/** A cardio row exactly as the app has always written one. */
export function cardioRow(def, id) {
  const row = {
    name: def.name,
    muscleGroup: 'cardio',
    equipment: 'cardio',
    difficulty: 'beginner',
    cardioMode: def.cardioMode,
    met: def.met,
    secondaryMuscles: [],
    description: '',
    isCustom: false,
    wgerId: null,
  };
  return id == null ? row : { id, ...row };
}

/** A real row key: the app only ever writes positive integer ids. */
export function isRowId(id) {
  return Number.isInteger(id) && id > 0;
}

function isEmpty(v) {
  return v == null || v === false || v === '';
}

function sameValue(a, b) {
  if (a === b) return true;
  if (typeof a !== 'object' || typeof b !== 'object' || a == null || b == null) return false;
  return JSON.stringify(a) === JSON.stringify(b);
}

/**
 * Is this row exactly the stock row the seed would put back, with nothing of
 * the user's on it?
 *
 * Only those can be left out of a backup. A favourite, a colour, a renamed or
 * re-categorised row, any id outside the seed — all of it is the user's, and
 * the old rule (keep `isCustom` only) silently dropped stock favourites and
 * colours along with the cardio rows. Any field the seed does not have counts
 * as user state unless it is empty, so a field added later is kept by default
 * rather than lost by default.
 */
export function isPristineStock(row) {
  if (!row || row.isCustom) return false;
  const stock = STOCK_BY_ID.get(row.id);
  if (!stock) return false;
  for (const [key, value] of Object.entries(row)) {
    if (key in stock) {
      if (!sameValue(value, stock[key])) return false;
    } else if (!isEmpty(value)) {
      return false;
    }
  }
  for (const key of Object.keys(stock)) {
    if (!(key in row) && !isEmpty(stock[key])) return false;
  }
  return true;
}

const NO_EVIDENCE = Object.freeze({ cardio: false, treadmill: false, met: false, strength: false, loaded: false });

/**
 * What the sets referencing each missing id say it was.
 *
 * `cardio` sets can only be logged against a cardio row, so they prove the id
 * was one. Of those, treadmill-mode bouts always carry a speed (the logger will
 * not save one without) and MET-mode bouts never do.
 */
export function orphanEvidence(sets) {
  const out = new Map();
  for (const s of sets ?? []) {
    const id = s?.exerciseId;
    if (!isRowId(id)) continue;
    const e = { ...(out.get(id) ?? NO_EVIDENCE) };
    if (s.isCardio) {
      e.cardio = true;
      const hasSpeed = s.speedKmh != null && Number(s.speedKmh) > 0;
      const hasIncline = s.incline != null && Number.isFinite(Number(s.incline));
      if (hasSpeed || hasIncline) e.treadmill = true;
      else e.met = true;
    } else {
      e.strength = true;
      if ((Number(s.weight) || 0) > 0) e.loaded = true;
    }
    out.set(id, e);
  }
  return out;
}

function fitsSlot(e, def) {
  if (e.treadmill && def.cardioMode !== 'treadmill') return false;
  if (e.met && def.cardioMode !== 'met') return false;
  return true;
}

export const PLACEHOLDER_NAME = 'Restored exercise';

/**
 * A stand-in for a row nothing can identify, so its history stays readable and
 * editable instead of reading "Exercise". Custom, so it can be renamed away or
 * deleted like any other custom lift. A cardio id stays cardio (so its bouts
 * still render as bouts); anything else gets `upper-back`, the same "unknown
 * muscle" default the wger mapping has always used.
 */
export function placeholderRow(id, e = NO_EVIDENCE, n = 0) {
  const treadmill = e.treadmill && !e.met;
  return {
    id,
    name: n > 0 ? `${PLACEHOLDER_NAME} ${n}` : PLACEHOLDER_NAME,
    muscleGroup: e.cardio ? 'cardio' : 'upper-back',
    // Bodyweight only when every logged set was unloaded, so recomputing the
    // session's volume adds back the bodyweight it was first counted with.
    equipment: e.cardio ? 'cardio' : e.strength && !e.loaded ? 'bodyweight' : 'machine',
    ...(e.cardio ? { cardioMode: treadmill ? 'treadmill' : 'met', met: treadmill ? null : 6 } : {}),
    difficulty: 'beginner',
    secondaryMuscles: [],
    description: '',
    isCustom: true,
    wgerId: null,
    restored: true,
  };
}

/**
 * Work out how to give every missing exercise id a row again.
 *
 * @param orphanIds Ids referenced by sets / routine links / records / notes
 *                  with no exercise row (after the stock rows are back).
 * @param evidence  `orphanEvidence(setsOfThoseIds)`.
 * @param existing  The exercise rows that do exist (`id`, `name`, `equipment`,
 *                  `isCustom`).
 * @param cardio    The cardio definitions, in insertion order.
 * @param minStart  The first id the cardio block could have had (75).
 * @returns `{ create, remap, blockStart }`: rows to add at their old ids, ids
 *          whose references should move to an existing row of the same cardio
 *          machine, and where the cardio block was placed (or null).
 *
 * The cardio block is the smallest start that holds every id with cardio
 * evidence, overlaps no row that exists, and puts treadmill bouts on treadmill
 * machines and timed bouts on MET machines. With no cardio evidence at all, the
 * block is only placed if it can hold every orphan — a routine that lists a
 * cardio machine nobody ever logged is the likely case, and anything wider is a
 * guess. Ids with only strength sets are never made cardio.
 *
 * Machines whose name was already taken when the block was created were
 * skipped by the by-name insert, so the layout at a candidate start leaves out
 * names that rows *below* that start already had. And when the same machine
 * exists again elsewhere — re-created at a fresh id after an earlier broken
 * restore — the old references are pointed at it instead of creating a second
 * "Treadmill".
 */
export function planOrphanRepair({
  orphanIds = [],
  evidence = new Map(),
  existing = [],
  cardio = CARDIO_EXERCISES,
  minStart = STOCK_MAX_ID + 1,
} = {}) {
  const orphans = [...new Set(orphanIds)].filter(isRowId).sort((a, b) => a - b);
  const plan = { create: [], remap: [], blockStart: null };
  if (!orphans.length) return plan;

  const ev = (id) => evidence.get(id) ?? NO_EVIDENCE;
  const existingIds = new Set(existing.map((r) => r.id));
  const C = orphans.filter((id) => ev(id).cardio);
  const S = orphans.filter((id) => !ev(id).cardio && ev(id).strength);
  const U = orphans.filter((id) => !ev(id).cardio && !ev(id).strength);

  const layoutAt = (start) => {
    const taken = new Set(existing.filter((r) => r.id < start).map((r) => r.name));
    return cardio.filter((d) => !taken.has(d.name));
  };

  const tryStart = (start) => {
    const layout = layoutAt(start);
    if (!layout.length) return null;
    const end = start + layout.length - 1;
    for (let id = start; id <= end; id += 1) if (existingIds.has(id)) return null;
    const inBlock = (id) => id >= start && id <= end;
    if (C.length ? !C.every(inBlock) : !U.every(inBlock)) return null;
    if (S.some(inBlock)) return null;
    for (const id of C) if (!fitsSlot(ev(id), layout[id - start])) return null;
    return layout;
  };

  const anchor = C.length ? C : U;
  let layout = null;
  if (anchor.length) {
    const lo = Math.max(minStart, anchor[anchor.length - 1] - cardio.length + 1);
    for (let start = lo; start <= anchor[0]; start += 1) {
      layout = tryStart(start);
      if (layout) {
        plan.blockStart = start;
        break;
      }
    }
  }

  // The same machine, alive at another id (cardio rows only — a custom lift a
  // user happened to call "Running" is not the treadmill).
  const machineByName = new Map(
    existing.filter((r) => r.equipment === 'cardio' && !r.isCustom).map((r) => [r.name, r.id])
  );

  const leftover = [];
  for (const id of orphans) {
    const slot = layout ? id - plan.blockStart : -1;
    const def = slot >= 0 && slot < (layout?.length ?? 0) ? layout[slot] : null;
    if (!def) {
      leftover.push(id);
      continue;
    }
    const alive = machineByName.get(def.name);
    if (alive != null) plan.remap.push({ from: id, to: alive });
    else plan.create.push(cardioRow(def, id));
  }

  leftover.forEach((id, i) => {
    plan.create.push(placeholderRow(id, ev(id), leftover.length > 1 ? i + 1 : 0));
  });
  return plan;
}
