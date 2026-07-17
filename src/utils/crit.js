// Crit sets + combo meter. A working set can "crit" for bonus XP (the first
// working set of a session is a guaranteed crit); chaining sets without a long
// rest builds a combo that adds a smaller bonus. The crit + combo bonus for a
// set is computed once at log time and stored as that set's `bonusXp`, so every
// XP total already includes it and delete-revert needs no recompute. Crit is
// deterministic per (seed, setNumber) so it can't be re-rolled by deleting and
// re-logging the same set. Pure + unit-tested.

export const CRIT_CHANCE = 0.15;   // base per-set crit probability
const CRIT_BONUS = 1;              // crit adds +100% of the set's base XP
const COMBO_CAP_MS = 150000;       // ≤2.5 min between sets keeps the combo alive
const COMBO_STEP = 0.05;           // +5% base XP per chained set
const COMBO_MAX = 5;               // combo bonus caps at +25%

// Deterministic FNV-1a hash of the parts → a float in [0, 1).
export function hashSeed(...parts) {
  let h = 2166136261 >>> 0;
  const str = parts.join('|');
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967296;
}

// Whether a set crits. The session's first working set always crits; otherwise
// it's a deterministic roll seeded by the session + set position.
export function rollCrit({ seed, setNumber, first = false, chance = CRIT_CHANCE } = {}) {
  if (first) return true;
  return hashSeed(seed ?? 0, 'crit', setNumber ?? 0) < chance;
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
