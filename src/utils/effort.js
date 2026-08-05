// How hard a set felt.
//
// The app has stored `sets.rpe` (6–10) for a long time, but asking for it was
// three taps *before* logging — open the picker, choose a number, then log —
// behind a toggle that reset every time. That is the wrong moment (you rate a
// set after you do it, not before) at the wrong price, so in practice the field
// stayed empty and nothing could be built on it.
//
// These three presets are the fast path. They map onto the same 6–10 scale, so
// the stored field, the CSV export and the precise picker all keep working —
// this is a new way in, not a new column.

export const EFFORT = {
  EASY: 'easy',
  HARD: 'hard',
  MAX: 'max',
};

/**
 * The presets, in the order they're offered.
 *
 * `rpe` is what gets stored. `rir` is the same thing said the way lifters
 * actually think — reps left in the tank — which is the wording on screen.
 */
export const EFFORT_LEVELS = [
  { key: EFFORT.EASY, rpe: 7, label: 'Easy', rir: '3+ left', color: 'var(--color-sage)' },
  { key: EFFORT.HARD, rpe: 9, label: 'Hard', rir: '1–2 left', color: 'var(--color-gold)' },
  { key: EFFORT.MAX, rpe: 10, label: 'Max', rir: 'nothing left', color: 'var(--color-ember)' },
];

const BY_KEY = Object.fromEntries(EFFORT_LEVELS.map((l) => [l.key, l]));

/** Preset metadata by key, or null. */
export function effortMeta(key) {
  return BY_KEY[key] ?? null;
}

/**
 * Which preset a stored RPE reads as.
 *
 * Someone using the precise 6–10 picker can store an 8, which is no preset's
 * exact value — it still has to render as something, so the scale is bucketed
 * rather than matched.
 */
export function effortFromRpe(rpe) {
  const n = Number(rpe);
  if (!Number.isFinite(n) || n <= 0) return null;
  if (n >= 10) return BY_KEY[EFFORT.MAX];
  if (n >= 8) return BY_KEY[EFFORT.HARD];
  return BY_KEY[EFFORT.EASY];
}

/**
 * What the effort ratings say about a session as a whole.
 *
 * `rated` vs `total` matters: an average over two rated sets out of twenty is
 * not a fact about the session, and anything consuming this needs to know that
 * before it says something confident.
 */
export function sessionEffort(sets) {
  const working = (sets ?? []).filter((s) => s && !s.isWarmup);
  const rated = working.filter((s) => Number(s.rpe) > 0);
  if (!rated.length) {
    return { rated: 0, total: working.length, avgRpe: null, hardSets: 0, maxSets: 0, coverage: 0 };
  }
  const sum = rated.reduce((a, s) => a + Number(s.rpe), 0);
  return {
    rated: rated.length,
    total: working.length,
    avgRpe: Math.round((sum / rated.length) * 10) / 10,
    hardSets: rated.filter((s) => Number(s.rpe) >= 8 && Number(s.rpe) < 10).length,
    maxSets: rated.filter((s) => Number(s.rpe) >= 10).length,
    coverage: working.length ? rated.length / working.length : 0,
  };
}

// Rest scales with how hard the set was, but relative to the rest length the
// user already chose — someone whose default is 60s likes short rests, and
// overriding that with a flat 3 minutes because they tapped "Max" would be
// presumptuous. A multiplier adapts without arguing.
const REST_MULTIPLIER = { 10: 1.75, 9: 1.25, 8: 1.25 };
const MIN_REST = 30;
const MAX_REST = 300;

/**
 * How long to rest after a set of this effort, given the user's own default.
 *
 * Returns the default unchanged for an unrated set, so this can be called
 * unconditionally.
 */
export function suggestRest(rpe, defaultSecs = 90) {
  const base = Number(defaultSecs) > 0 ? Number(defaultSecs) : 90;
  const n = Number(rpe);
  if (!Number.isFinite(n) || n <= 0) return Math.round(base);
  const mult = REST_MULTIPLIER[Math.min(10, Math.round(n))] ?? 0.75;
  return Math.max(MIN_REST, Math.min(MAX_REST, Math.round((base * mult) / 5) * 5));
}
