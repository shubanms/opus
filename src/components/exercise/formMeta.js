import { toDisplay } from '../../utils/units.js';
import { muscleFamily } from '../../utils/kanji.js';

// Muscle-family chips for the Forms filter. `kanji` is the family kanji from
// utils/kanji.js; `null` means All.
export const FAMILIES = [
  { id: 'all', label: 'All', kanji: null },
  { id: 'chest', label: 'Chest', kanji: '胸' },
  { id: 'back', label: 'Back', kanji: '背' },
  { id: 'shoulders', label: 'Shoulders', kanji: '肩' },
  { id: 'arms', label: 'Arms', kanji: '腕' },
  { id: 'legs', label: 'Legs', kanji: '脚' },
  { id: 'core', label: 'Core', kanji: '腹' },
  { id: 'cardio', label: 'Cardio', kanji: '息' },
];

const FAMILY_LABEL = Object.fromEntries(FAMILIES.filter((f) => f.kanji).map((f) => [f.kanji, f.label]));

export function familyLabelOf(muscleGroup) {
  return FAMILY_LABEL[muscleFamily[muscleGroup]] ?? 'Body';
}

export function inFamily(exercise, family) {
  return !family || !family.kanji || muscleFamily[exercise.muscleGroup] === family.kanji;
}

const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : '');
export function equipmentLabel(eq) {
  return cap(eq ?? '');
}

const fmtNum = (n) => String(Math.round(n * 10) / 10);

/** "best 100 × 3" / "best 12 reps" / null when never trained. Weights go through units.js. */
export function bestLabel(st, unit) {
  if (!st || !st.sessions) return null;
  if (st.bestW > 0) return `best ${fmtNum(toDisplay(st.bestW, unit))} × ${st.bestReps}`;
  if (st.bestReps > 0) return `best ${st.bestReps} reps`;
  return null;
}
