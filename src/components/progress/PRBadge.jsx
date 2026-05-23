import { Trophy } from 'lucide-react';

// Compact celebratory badge for a personal record. Pulses gold on mount.
export default function PRBadge({ label, value, unit = 'kg' }) {
  return (
    <div
      className="flex items-center gap-2 rounded-xl px-3 py-2"
      style={{
        background: 'var(--color-gold)',
        color: 'var(--color-obsidian)',
        animation: 'goldPulse 1.6s var(--ease-out) 1',
      }}
    >
      <Trophy size={14} />
      <span className="font-sans text-xs font-semibold">{label}</span>
      <span className="ml-auto font-mono text-sm font-semibold">
        {value}{unit ? ` ${unit}` : ''}
      </span>
    </div>
  );
}
