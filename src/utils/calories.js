// Offline calorie estimation. Cardio (treadmill / walking / running) uses the
// ACSM metabolic equations from speed + incline + bodyweight + time, which are
// the standard gym-machine formulas and reasonably accurate. Other cardio
// modalities and resistance training use MET estimates. All pure + unit-tested.

export const STRENGTH_MET = 3.5;   // whole-session average for lifting (incl. rest)
const KCAL_PER_L_O2 = 5;           // ~5 kcal per litre of O2
const RESTING_VO2 = 3.5;           // ml/kg/min

// Speed km/h -> metres/min (the unit the ACSM equations expect).
function metresPerMin(speedKmh) {
  return (speedKmh || 0) * 1000 / 60;
}

// ACSM VO2 (ml/kg/min). Walking equation up to ~8 km/h, running above it.
// `inclinePct` is the treadmill grade in percent (0–30).
export function acsmVO2({ speedKmh = 0, inclinePct = 0 } = {}) {
  const s = metresPerMin(speedKmh);
  const g = (inclinePct || 0) / 100;
  const running = speedKmh > 8; // ~5 mph — jog/run threshold
  const vo2 = running
    ? 0.2 * s + 0.9 * s * g + RESTING_VO2
    : 0.1 * s + 1.8 * s * g + RESTING_VO2;
  return Math.max(RESTING_VO2, vo2);
}

// kcal from a VO2 (ml/kg/min) over a duration.
export function vo2Kcal(vo2, weightKg, minutes) {
  return (vo2 * (weightKg || 0) / 1000) * KCAL_PER_L_O2 * (minutes || 0);
}

// Treadmill / walk / run calories from speed + incline + weight + time.
export function treadmillKcal({ speedKmh = 0, inclinePct = 0, weightKg = 0, minutes = 0 } = {}) {
  return Math.round(vo2Kcal(acsmVO2({ speedKmh, inclinePct }), weightKg, minutes));
}

// Generic MET calories: kcal/min = MET * 3.5 * kg / 200.
export function metKcal({ met = 0, weightKg = 0, minutes = 0 } = {}) {
  return Math.round((met * 3.5 * (weightKg || 0) / 200) * (minutes || 0));
}

// Resistance-training estimate for a lifting duration (minutes).
export function strengthKcal({ weightKg = 0, minutes = 0 } = {}) {
  return metKcal({ met: STRENGTH_MET, weightKg, minutes });
}

// Distance (km) covered at a steady speed for some minutes.
export function distanceKm(speedKmh = 0, minutes = 0) {
  return (speedKmh || 0) * (minutes || 0) / 60;
}

// Total calories for a saved workout. Uses the stored figure when present (new
// sessions bake in precise cardio kcal at save time); for older sessions saved
// before calories existed, it falls back to a MET estimate from the stored
// duration + bodyweight — so the whole history shows a number with no backfill.
export function workoutCalories(workout) {
  if (workout?.totalCalories != null) return workout.totalCalories;
  const minutes = (workout?.duration || 0) / 60;
  return strengthKcal({ weightKg: workout?.bodyweightKg ?? 70, minutes });
}
