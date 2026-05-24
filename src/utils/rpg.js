// 50 levels on a steepening quadratic curve: total XP to BE level L is
// LEVEL_BASE·(L-1)². (Closely matches the original hand-tuned 10-level table,
// so no one drops a level — it just extends much further.)
export const LEVEL_COUNT = 50;
const LEVEL_BASE = 300;

export function xpForLevel(level) {
  const L = Math.max(1, Math.min(Math.floor(level), LEVEL_COUNT));
  return LEVEL_BASE * (L - 1) * (L - 1);
}

export const XP_THRESHOLDS = Array.from({ length: LEVEL_COUNT }, (_, i) => xpForLevel(i + 1));

export const TITLES = {
  1: 'First Rep', 2: 'Iron Beginner', 3: 'Committed',
  4: 'Grinder',   5: 'Iron Will',    6: 'Forged',
  7: 'Elite',     8: 'Masterwork',   9: 'Legendary', 10: 'Magnum Opus',
};

// 10 named titles spread across the 50 levels (one per band of 5).
const TITLE_BAND = LEVEL_COUNT / 10;

export const COMPLETE_BONUS = 20;
export const PR_BONUS = 50;
export const STREAK_BONUS_PER_DAY = 10;
export const CONSISTENCY_BONUS = 30;

// The 10 named milestone ranks (each spans TITLE_BAND levels), with the level
// + XP where the title begins.
export const RANKS = Array.from({ length: 10 }, (_, i) => {
  const level = i * TITLE_BAND + 1;
  return { level, title: TITLES[i + 1], xp: xpForLevel(level) };
});

// Beyond max level (50) come prestige tiers.
export const MAX_TITLE_XP = xpForLevel(LEVEL_COUNT);
export const PRESTIGE_STEP = 30000;

const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];
export function roman(n) {
  return ROMAN[n] ?? `x${n}`;
}

// Prestige tier (0 until Magnum Opus, then 1, 2, 3… every PRESTIGE_STEP XP).
export function getPrestige(totalXp) {
  if (totalXp < MAX_TITLE_XP) return 0;
  return 1 + Math.floor((totalXp - MAX_TITLE_XP) / PRESTIGE_STEP);
}

// XP threshold to reach a given prestige tier.
export function prestigeXp(tier) {
  return MAX_TITLE_XP + (tier - 1) * PRESTIGE_STEP;
}

// Display label: "Magnum Opus II" once prestiging, else the plain title.
export function getRankLabel(totalXp) {
  const level = getLevelFromTotalXP(totalXp);
  const title = getTitle(level);
  const p = getPrestige(totalXp);
  return p > 0 ? `${title} ${roman(p)}` : title;
}

export function calcSetXP(weight, reps) {
  // Bodyweight sets (no external load) still earn XP from reps.
  if (!weight || weight <= 0) return Math.round((reps ?? 0));
  return Math.round((weight * reps) / 10);
}

export function calcWorkoutXP(sets) {
  const working = sets.filter((s) => !s.isWarmup);
  const setXP = working.reduce((sum, s) => sum + calcSetXP(s.weight, s.reps), 0);
  return setXP + COMPLETE_BONUS;
}

// Inverse of xpForLevel: level = 1 + floor(sqrt(xp / base)), capped at LEVEL_COUNT.
export function getLevelFromTotalXP(totalXp) {
  if (!totalXp || totalXp <= 0) return 1;
  const L = 1 + Math.floor(Math.sqrt(totalXp / LEVEL_BASE) + 1e-9);
  return Math.min(L, LEVEL_COUNT);
}

export function getTitle(level) {
  const band = Math.min(Math.max(Math.ceil(level / TITLE_BAND), 1), 10);
  return TITLES[band] ?? 'Magnum Opus';
}

const clamp = (n) => Math.max(0, Math.min(100, Math.round(n)));

// Five-axis character radar (each 0-100) from aggregate training data.
export function getCharacterStats({
  maxWeight = 0,
  avgVolume = 0,
  avgSets = 0,
  streak = 0,
  workoutsPerWeek = 0,
  muscleVariety = 0,
}) {
  return [
    { axis: 'Strength', value: clamp((maxWeight / 200) * 100) },
    { axis: 'Power', value: clamp((avgVolume / 8000) * 100) },
    { axis: 'Endurance', value: clamp((avgSets / 25) * 100) },
    { axis: 'Consistency', value: clamp(streak * 5 + (workoutsPerWeek / 5) * 50) },
    { axis: 'Balance', value: clamp((muscleVariety / 15) * 100) },
  ];
}

// Returns { level, prestige, progress (0-1), xpToNext, currentLevelXP, nextLevelXP }.
// At/beyond max level, progress tracks the current prestige band (so xpToNext
// stays positive and meaningful instead of underflowing past the last level).
export function getXPProgress(totalXp) {
  const level = getLevelFromTotalXP(totalXp);
  if (totalXp >= MAX_TITLE_XP) {
    const p = getPrestige(totalXp);
    const floor = prestigeXp(p);
    const next = prestigeXp(p + 1);
    return {
      level, prestige: p,
      progress: Math.min((totalXp - floor) / (next - floor), 1),
      xpToNext: Math.max(0, next - totalXp),
      currentLevelXP: floor, nextLevelXP: next,
    };
  }
  const idx = level - 1;
  const currentFloor = XP_THRESHOLDS[idx] ?? 0;
  const nextFloor = XP_THRESHOLDS[level] ?? MAX_TITLE_XP;
  return {
    level, prestige: 0,
    progress: Math.min((totalXp - currentFloor) / (nextFloor - currentFloor), 1),
    xpToNext: Math.max(0, nextFloor - totalXp),
    currentLevelXP: currentFloor, nextLevelXP: nextFloor,
  };
}
