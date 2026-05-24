import { useAchievements } from '../../hooks/useAchievements.js';
import AchievementBadge from './AchievementBadge.jsx';

export default function TrophyCase() {
  const { items, count, total } = useAchievements();
  return (
    <div className="rounded-2xl p-4" style={{ background: 'var(--color-chalk)', border: '1px solid var(--color-ivory)' }}>
      <div className="mb-4 flex items-center justify-between">
        <span className="font-sans text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--color-text-secondary)' }}>
          Achievements
        </span>
        <span className="font-mono text-xs" style={{ color: 'var(--color-gold)' }}>{count}/{total}</span>
      </div>
      <div className="grid grid-cols-4 gap-3">
        {items.map((it) => <AchievementBadge key={it.key} item={it} />)}
      </div>
    </div>
  );
}
