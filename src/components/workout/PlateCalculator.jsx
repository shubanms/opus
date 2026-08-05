import { X } from 'lucide-react';
import { calcPlates, PLATES_KG, PLATES_LB } from '../../utils/plateCalc.js';
import { effectivePlates } from '../../utils/inventory.js';
import useSettingsStore from '../../store/settingsStore.js';
import { toDisplay, unitLabel } from '../../utils/units.js';

const PLATE_BG = {
  45: '#FF8FA3', 35: '#8B7DFF', 25: '#FF8FA3', 20: '#8B7DFF', 15: '#4FD8C4',
  10: '#7B83A6', 5: '#4A4A4A', 2.5: '#3A3A3A', 1.25: '#161B2E',
};

// `weight` is already in the display unit (from the SetLogger input).
export default function PlateCalculator({ weight, onClose }) {
  const unit = useSettingsStore((s) => s.unit);
  const barWeightKg = useSettingsStore((s) => s.barWeight);
  const inventory = useSettingsStore((s) => s.inventory);
  const loc = inventory?.[inventory?.active] ?? {};
  const bar = Math.round(toDisplay(loc.barKg ?? barWeightKg, unit) * 10) / 10;
  const plateSet = effectivePlates(loc, unit, unit === 'lbs' ? PLATES_LB : PLATES_KG);
  const u = unitLabel(unit);
  const plates = calcPlates(weight, bar, plateSet);
  const loaded = plates.reduce((s, { kg, count }) => s + kg * count, 0) * 2 + bar;

  return (
    <div className="mt-3 rounded-2xl p-4" style={{ background: 'var(--color-stone)' }}>
      <div className="mb-3 flex items-center justify-between">
        <p className="font-sans text-sm font-medium" style={{ color: 'var(--color-text-inverse)' }}>
          Plates per side — {weight}{u}
        </p>
        <button onClick={onClose} aria-label="Close plate calculator">
          <X size={16} style={{ color: 'var(--color-ash)' }} />
        </button>
      </div>

      {plates.length === 0 ? (
        <p className="font-sans text-xs" style={{ color: 'var(--color-ash)' }}>
          Bar only ({bar}{u})
        </p>
      ) : (
        <div className="flex flex-wrap items-end gap-1.5">
          {plates.map(({ kg, count }) =>
            Array.from({ length: count }).map((_, i) => (
              <div
                key={`${kg}-${i}`}
                className="flex items-center justify-center rounded"
                style={{ background: PLATE_BG[kg] ?? '#161B2E', width: 36, height: 48 + Math.min(kg, 25) * 0.8 }}
              >
                <span className="font-mono font-bold" style={{ color: 'var(--color-text-inverse)', fontSize: 10 }}>{kg}</span>
              </div>
            ))
          )}
        </div>
      )}

      <div className="mt-3 flex gap-5">
        <div>
          <p className="font-mono text-base font-medium" style={{ color: 'var(--color-text-inverse)' }}>{weight}{u}</p>
          <p className="font-sans text-xs" style={{ color: 'var(--color-ash)' }}>target</p>
        </div>
        <div>
          <p className="font-mono text-base font-medium" style={{ color: 'var(--color-text-inverse)' }}>{bar}{u}</p>
          <p className="font-sans text-xs" style={{ color: 'var(--color-ash)' }}>bar</p>
        </div>
        <div>
          <p className="font-mono text-base font-medium" style={{ color: 'var(--color-gold)' }}>
            {Math.round(loaded * 10) / 10}{u}
          </p>
          <p className="font-sans text-xs" style={{ color: 'var(--color-ash)' }}>loaded</p>
        </div>
      </div>
    </div>
  );
}
