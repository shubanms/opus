export const PLATES_KG = [25, 20, 15, 10, 5, 2.5, 1.25];
export const PLATES_LB = [45, 35, 25, 10, 5, 2.5];

// Returns plates needed per side to reach targetWeight with the given bar.
export function calcPlates(targetWeight, barWeight = 20, plates = PLATES_KG) {
  if (!targetWeight || targetWeight <= barWeight) return [];
  let remaining = Math.round(((targetWeight - barWeight) / 2) * 1000) / 1000;
  const result = [];
  for (const kg of plates) {
    const count = Math.floor(remaining / kg);
    if (count > 0) {
      result.push({ kg, count });
      remaining = Math.round((remaining - kg * count) * 1000) / 1000;
    }
  }
  return result;
}

// Returns the closest achievable weight given available plates.
export function nearestLoadable(targetWeight, barWeight = 20, plates = PLATES_KG) {
  const loaded = calcPlates(targetWeight, barWeight, plates);
  const perSide = loaded.reduce((s, { kg, count }) => s + kg * count, 0);
  return barWeight + perSide * 2;
}
