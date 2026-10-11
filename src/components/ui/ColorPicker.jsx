import { Check, Ban } from 'lucide-react';

// Distinct label colours for marking exercises / templates / workouts.
export const LABEL_COLORS = [
  '#D2AE5A', // gold-leaf
  '#C8361F', // vermilion
  '#9DA67A', // moss
  '#6E7FA8', // indigo-light
  '#A86F5E', // clay
  '#DA7667', // ver-soft
  '#6F7A52', // moss-deep
  '#8F877B', // ash
];

export default function ColorPicker({ value, onChange }) {
  return (
    <div className="flex flex-wrap gap-2">
      <button
        onClick={() => onChange(null)}
        className="flex h-8 w-8 items-center justify-center rounded-full"
        style={{ background: 'var(--color-ivory)' }}
        aria-label="No colour"
      >
        {value == null ? <Check size={14} style={{ color: 'var(--color-ash)' }} strokeWidth={3} /> : <Ban size={14} style={{ color: 'var(--color-ash)' }} />}
      </button>
      {LABEL_COLORS.map((c) => (
        <button
          key={c}
          onClick={() => onChange(c)}
          className="flex h-8 w-8 items-center justify-center rounded-full"
          style={{ background: c }}
          aria-label={`Colour ${c}`}
        >
          {value === c && <Check size={14} style={{ color: '#100E0C' }} strokeWidth={3} />}
        </button>
      ))}
    </div>
  );
}
