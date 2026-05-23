export const XP_THRESHOLDS = [0, 500, 1200, 2500, 4500, 7000, 10000, 14000, 19000, 25000];

export const TITLES = {
  1: 'First Rep', 2: 'Iron Beginner', 3: 'Committed',
  4: 'Grinder',   5: 'Iron Will',    6: 'Forged',
  7: 'Elite',     8: 'Masterwork',   9: 'Legendary', 10: 'Magnum Opus',
};

export const COMPLETE_BONUS = 20;
export const PR_BONUS = 50;
export const STREAK_BONUS_PER_DAY = 10;
export const CONSISTENCY_BONUS = 30;

export function calcSetXP(weight, reps) {
  return Math.round((weight * reps) / 10);
}

export function calcWorkoutXP(sets) {
  const working = sets.filter((s) => !s.isWarmup);
  const setXP = working.reduce((sum, s) => sum + calcSetXP(s.weight, s.reps), 0);
  return setXP + COMPLETE_BONUS;
}

export function getLevelFromTotalXP(totalXp) {
  let level = 1;
  for (let i = 1; i < XP_THRESHOLDS.length; i++) {
    if (totalXp >= XP_THRESHOLDS[i]) level = i + 1;
    else break;
  }
  return level;
}

export function getTitle(level) {
  return TITLES[Math.min(level, 10)] ?? 'Magnum Opus';
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

// Returns { level, progress (0-1), xpToNext, currentLevelXP, nextLevelXP }
export function getXPProgress(totalXp) {
  const level = getLevelFromTotalXP(totalXp);
  const idx = level - 1;
  const currentFloor = XP_THRESHOLDS[idx] ?? 0;
  const nextFloor =
    XP_THRESHOLDS[level] ?? (XP_THRESHOLDS[XP_THRESHOLDS.length - 1] + level * 3000);
  const progress = Math.min((totalXp - currentFloor) / (nextFloor - currentFloor), 1);
  return { level, progress, xpToNext: nextFloor - totalXp, currentLevelXP: currentFloor, nextLevelXP: nextFloor };
}
