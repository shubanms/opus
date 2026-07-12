// All weights are stored in kg internally; convert only at display.
export const LB_PER_KG = 2.20462262;

export function unitLabel(unit) {
  return unit === 'lbs' ? 'lbs' : 'kg';
}

// kg (stored) -> number in the display unit
export function toDisplay(kg, unit) {
  if (kg == null || kg === '' || isNaN(kg)) return kg;
  const v = unit === 'lbs' ? kg * LB_PER_KG : kg;
  return Math.round(v * 100) / 100;
}

// value entered in the display unit -> kg (stored)
export function toKg(value, unit) {
  if (value == null || value === '' || isNaN(value)) return 0;
  return unit === 'lbs' ? Number(value) / LB_PER_KG : Number(value);
}

// Pretty weight string with unit label (trims trailing zeros).
export function fmtWeight(kg, unit) {
  if (kg == null || isNaN(kg)) return '—';
  const v = toDisplay(kg, unit);
  const rounded = Math.round(v * 10) / 10;
  const num = Number.isInteger(rounded) ? rounded : rounded.toFixed(1);
  return `${num} ${unitLabel(unit)}`;
}

// Pretty volume string (large numbers, no decimals) with unit label.
export function fmtVolume(kg, unit) {
  const v = Math.round(toDisplay(kg ?? 0, unit));
  return `${v.toLocaleString()} ${unitLabel(unit)}`;
}
