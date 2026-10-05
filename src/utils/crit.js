// Crit sets + combo meter. A working set can "crit" for bonus XP (the first
// working set of a session is a guaranteed crit); chaining sets without a long
// rest builds a combo that adds a smaller bonus. The crit + combo bonus for a
// set is computed once at log time and stored as that set's `bonusXp`, so every
// XP total already includes it and delete-revert needs no recompute. Crit is
// deterministic per (session, exercise, set position) so it can't be re-rolled
// by deleting and re-logging the same set. Pure + unit-tested.

import { calcSetXP, intensityFactor } from './rpg.js';

export const CRIT_CHANCE = 0.15;   // base per-set crit probability
const CRIT_BONUS = 1;              // crit adds +100% of the set's base XP
const COMBO_CAP_MS = 150000;       // ≤2.5 min between sets keeps the combo alive
const COMBO_STEP = 0.05;           // +5% base XP per chained set
const COMBO_MAX = 5;               // combo bonus caps at +25%

// 32-bit FNV-1a over the parts joined with '|'.
function fnv1a(parts) {
  let h = 2166136261 >>> 0;
  const str = parts.join('|');
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// Deterministic FNV-1a hash of the parts → a float in [0, 1).
//
// Its output must never change: the Vault's chests and the daily dungeon are
// generated from it, so a "better" hash here would silently re-roll every
// dungeon and loot table a person has already seen.
export function hashSeed(...parts) {
  return fnv1a(parts) / 4294967296;
}

// murmur3's 32-bit finalizer: every input bit flips each output bit with
// probability ~½.
function fmix32(h) {
  let x = h >>> 0;
  x ^= x >>> 16;
  x = Math.imul(x, 0x85ebca6b);
  x ^= x >>> 13;
  x = Math.imul(x, 0xc2b2ae35);
  x ^= x >>> 16;
  return x >>> 0;
}

/**
 * The crit roll for one set position, in [0, 1).
 *
 * Plain FNV-1a was the bug. The set number is the *last* character hashed, and
 * FNV only stirs a late character into the low bits — but the roll reads the
 * high ones. So within a session every set landed on nearly the same number:
 * about one session in nine critted on every set from 2 to 8, and four in five
 * never critted at all. The finalizer spreads the last character across the
 * whole word, and the exercise id stops every lift in a session from sharing
 * one pattern.
 */
export function critRoll(seed, exerciseId, setNumber) {
  return fmix32(fnv1a([seed ?? 0, 'crit', exerciseId ?? 0, setNumber ?? 0])) / 4294967296;
}

// Whether a set crits. The session's first working set always crits; otherwise
// it's a deterministic roll seeded by the session, the exercise and the set's
// position.
export function rollCrit({ seed, setNumber, exerciseId = 0, first = false, chance = CRIT_CHANCE } = {}) {
  if (first) return true;
  return critRoll(seed, exerciseId, setNumber) < chance;
}

// Length of the trailing run of sets whose consecutive gaps are within `capMs`
// (including the newest set). Feed it the working-set timestamps + now.
export function comboCount(timestamps = [], capMs = COMBO_CAP_MS) {
  const t = timestamps.filter((x) => x != null).sort((a, b) => a - b);
  if (t.length === 0) return 1;
  let run = 1;
  for (let i = t.length - 1; i > 0; i--) {
    if (t[i] - t[i - 1] <= capMs) run += 1; else break;
  }
  return run;
}

// Multiplier from a combo count (1 = no bonus, capped at +25%).
export function comboMult(count = 1) {
  return 1 + COMBO_STEP * Math.min(Math.max(count - 1, 0), COMBO_MAX);
}

// Integer bonus XP for a set beyond its base, from crit + combo.
export function bonusXp(base, { crit = false, combo = 1 } = {}) {
  const b = Math.max(0, base || 0);
  const critPart = crit ? b * CRIT_BONUS : 0;
  const comboPart = b * (comboMult(combo) - 1);
  return Math.round(critPart + comboPart);
}

/**
 * What a working set is worth the moment it is logged: `base` is the share the
 * end-of-session total will count for it (intensity-weighted against your best
 * on the lift — effort is rated later and is not known yet), and `bonus` is the
 * crit + combo part stored on the set as `bonusXp`.
 *
 * One function for logging a set and for correcting it afterwards, so an edit
 * re-prices the set exactly the way the end modal will total it.
 */
export function setXp({ weightKg = 0, reps = 0, best = null, crit = false, combo = 1 } = {}) {
  const base = Math.round(calcSetXP(weightKg, reps) * intensityFactor(weightKg, best));
  return { base, bonus: bonusXp(base, { crit, combo }) };
}
