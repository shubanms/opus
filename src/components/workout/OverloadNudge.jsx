import { TrendingUp, Plus, Dumbbell } from 'lucide-react';
import { useOverload } from '../../hooks/useOverload.js';

const ICON = {
  increase_reps: TrendingUp,
  increase_sets: Plus,
  increase_weight: Dumbbell,
};

export default function OverloadNudge({ exerciseId }) {
  const s = useOverload(exerciseId);
  if (!s || s.action === 'maintain') return null;

  const Icon = ICON[s.action] ?? TrendingUp;

  return (
    <div
      className="mb-3 flex items-start gap-2 rounded-xl px-3 py-2"
      style={{ background: '#C9A84C18', border: '1px solid #C9A84C44' }}
    >
      <Icon size={14} style={{ color: 'var(--color-gold)', marginTop: 1, flexShrink: 0 }} />
      <p className="font-sans text-xs" style={{ color: 'var(--color-text-primary)' }}>
        {s.reason}
      </p>
    </div>
  );
}
