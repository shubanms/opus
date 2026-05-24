import { Check, Ban } from 'lucide-react';

// Distinct label colours for marking exercises / templates / workouts.
export const LABEL_COLORS = [
  '#C9A84C', // gold
  '#D4622A', // ember
  '#6B8F71', // sage
  '#5B7C99', // steel
  '#8C6BA6', // plum
  '#C2557A', // rose
  '#3E8E8A', // teal
  '#8A8780', // ash
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
          {value === c && <Check size={14} style={{ color: '#111010' }} strokeWidth={3} />}
        </button>
      ))}
    </div>
  );
}
