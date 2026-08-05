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
      style={{ background: '#8B7DFF18', border: '1px solid #8B7DFF44' }}
    >
      <Icon size={14} style={{ color: 'var(--color-gold)', marginTop: 1, flexShrink: 0 }} />
      <p className="font-sans text-xs" style={{ color: 'var(--color-text-primary)' }}>
        {s.reason}
      </p>
    </div>
  );
}
