import { useNavigate } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { useAchievements } from '../../hooks/useAchievements.js';
import AchievementBadge from './AchievementBadge.jsx';

export default function TrophyCase() {
  const navigate = useNavigate();
  const { items, count, total } = useAchievements();
  // Show earned first, then a few locked, capped so the profile stays tidy.
  const sorted = [...items].sort((a, b) => Number(b.unlocked) - Number(a.unlocked));
  const preview = sorted.slice(0, 8);

  return (
    <button
      onClick={() => navigate('/achievements')}
      className="w-full rounded-2xl p-4 text-left"
      style={{ background: 'var(--color-chalk)', border: '1px solid var(--color-ivory)' }}
    >
      <div className="mb-4 flex items-center justify-between">
        <span className="font-sans text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--color-text-secondary)' }}>
          Achievements
        </span>
        <span className="flex items-center gap-1 font-mono text-xs" style={{ color: 'var(--color-gold)' }}>
          {count}/{total} <ChevronRight size={13} style={{ color: 'var(--color-ash)' }} />
        </span>
      </div>
      <div className="grid grid-cols-4 gap-3">
        {preview.map((it) => <AchievementBadge key={it.key} item={it} />)}
      </div>
    </button>
  );
}
