import useSettingsStore from '../store/settingsStore.js';
import { smallestIncrement } from '../utils/loadStep.js';
import { effectivePlates } from '../utils/inventory.js';
import { PLATES_KG, PLATES_LB } from '../utils/plateCalc.js';
import { toKg } from '../utils/units.js';

/**
 * The smallest jump you can load at the current location: a pair of its
 * lightest plates, in the display unit (`increment`) and in kg (`incrementKg`).
 *
 * One hook so the weight stepper and the coaching line cannot disagree — the
 * nudge used a flat 2.5 kg while the stepper moved in 5 lb, and suggested
 * 230.5 lb to someone whose stepper could only reach 230 or 235.
 */
export function usePlateIncrement() {
  const unit = useSettingsStore((s) => s.unit);
  const inventory = useSettingsStore((s) => s.inventory);
  const increment = smallestIncrement(
    effectivePlates(inventory?.[inventory?.active] ?? {}, unit, unit === 'lbs' ? PLATES_LB : PLATES_KG)
  );
  return { unit, increment, incrementKg: toKg(increment, unit) };
}
