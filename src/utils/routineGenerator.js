// Auto-routine generator. Pure (no DB / no Date / no Math.random) so it's fully
// unit-testable: the caller passes the exercise pool and a seeded RNG.

// Deterministic mulberry32 PRNG. makeRng(Date.now()) in prod, makeRng(42) in tests.
export function makeRng(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const LEVEL_DEFAULTS = {
  beginner: { count: 4, sets: 3, reps: 10 },
  intermediate: { count: 6, sets: 4, reps: 8 },
  advanced: { count: 7, sets: 4, reps: 6 },
};

const DIFF_ORDER = ['beginner', 'intermediate', 'advanced'];

function diffDistance(a, b) {
  const ia = DIFF_ORDER.indexOf(a);
  const ib = DIFF_ORDER.indexOf(b);
  return ia < 0 || ib < 0 ? 3 : Math.abs(ia - ib);
}

function shuffle(arr, rng) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Exercises for one group, ordered best-fit first: by difficulty proximity to the
// chosen level (exact → adjacent → far), shuffled within each proximity bucket.
// This is the thin-advanced fallback — a group with only 1 advanced item still fills.
export function pickForGroup(exercises, group, level, rng) {
  const buckets = [[], [], [], []];
  for (const e of exercises) {
    if (e.muscleGroup === group) buckets[diffDistance(e.difficulty, level)].push(e);
  }
  return buckets.flatMap((b) => shuffle(b, rng));
}

// Default exercise count for a level + number of chosen groups (capped at 10).
export function defaultCount(level, groupCount) {
  const base = (LEVEL_DEFAULTS[level] ?? LEVEL_DEFAULTS.beginner).count;
  return Math.min(base + Math.max(0, groupCount - 1), 10);
}

// Returns an ordered list ready for createTemplate:
//   [{ exerciseId, targetSets, targetReps, targetWeight: null }]
// Round-robins across the chosen groups for balance; never duplicates an exercise.
export function generateRoutine({ exercises, groups, level, count, rng }) {
  const lvl = LEVEL_DEFAULTS[level] ?? LEVEL_DEFAULTS.beginner;
  const groupList = (groups ?? []).filter(Boolean);
  if (!groupList.length) return [];
  const target = count ?? defaultCount(level, groupList.length);

  const pools = {};
  const cursor = {};
  for (const g of groupList) {
    pools[g] = pickForGroup(exercises, g, level, rng);
    cursor[g] = 0;
  }

  const chosen = [];
  const used = new Set();
  let progressed = true;
  while (chosen.length < target && progressed) {
    progressed = false;
    for (const g of groupList) {
      if (chosen.length >= target) break;
      const pool = pools[g];
      while (cursor[g] < pool.length && used.has(pool[cursor[g]].id)) cursor[g] += 1;
      if (cursor[g] < pool.length) {
        const ex = pool[cursor[g]];
        cursor[g] += 1;
        used.add(ex.id);
        chosen.push(ex);
        progressed = true;
      }
    }
  }

  return chosen.map((ex) => ({
    exerciseId: ex.id,
    targetSets: lvl.sets,
    targetReps: lvl.reps,
    targetWeight: null,
  }));
}
