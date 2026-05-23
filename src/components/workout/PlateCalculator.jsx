import { X } from 'lucide-react';
import { calcPlates } from '../../utils/plateCalc.js';

const PLATE_BG = {
  25: '#D4622A', 20: '#C9A84C', 15: '#6B8F71',
  10: '#8A8780', 5: '#4A4A4A', 2.5: '#3A3A3A', 1.25: '#2C2C2C',
};

export default function PlateCalculator({ weight, barWeight = 20, onClose }) {
  const plates = calcPlates(weight, barWeight);

  return (
    <div className="mt-3 rounded-2xl p-4" style={{ background: 'var(--color-stone)' }}>
      <div className="mb-3 flex items-center justify-between">
        <p className="font-sans text-sm font-medium" style={{ color: 'var(--color-chalk)' }}>
          Plates per side — {weight}kg
        </p>
        <button onClick={onClose} aria-label="Close plate calculator">
          <X size={16} style={{ color: 'var(--color-ash)' }} />
        </button>
      </div>

      {plates.length === 0 ? (
        <p className="font-sans text-xs" style={{ color: 'var(--color-ash)' }}>
          Bar only ({barWeight}kg)
        </p>
      ) : (
        <div className="flex flex-wrap items-end gap-1.5">
          {plates.map(({ kg, count }) =>
            Array.from({ length: count }).map((_, i) => (
              <div
                key={`${kg}-${i}`}
                className="flex items-center justify-center rounded"
                style={{
                  background: PLATE_BG[kg] ?? '#2C2C2C',
                  width: 36,
                  height: 48 + Math.min(kg, 25) * 0.8,
                }}
              >
                <span
                  className="font-mono font-bold"
                  style={{ color: 'var(--color-chalk)', fontSize: 10 }}
                >
                  {kg}
                </span>
              </div>
            ))
          )}
        </div>
      )}

      <div className="mt-3 flex gap-5">
        <div>
          <p className="font-mono text-base font-medium" style={{ color: 'var(--color-chalk)' }}>
            {weight}kg
          </p>
          <p className="font-sans text-xs" style={{ color: 'var(--color-ash)' }}>target</p>
        </div>
        <div>
          <p className="font-mono text-base font-medium" style={{ color: 'var(--color-chalk)' }}>
            {barWeight}kg
          </p>
          <p className="font-sans text-xs" style={{ color: 'var(--color-ash)' }}>bar</p>
        </div>
        <div>
          <p className="font-mono text-base font-medium" style={{ color: 'var(--color-gold)' }}>
            {plates.reduce((s, { kg, count }) => s + kg * count, 0) * 2 + barWeight}kg
          </p>
          <p className="font-sans text-xs" style={{ color: 'var(--color-ash)' }}>loaded</p>
        </div>
      </div>
    </div>
  );
}
