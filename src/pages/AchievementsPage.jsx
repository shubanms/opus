import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Award, Lock, HelpCircle } from 'lucide-react';
import { useAchievements } from '../hooks/useAchievements.js';

export default function AchievementsPage() {
  const navigate = useNavigate();
  const { items, count, total } = useAchievements();

  return (
    <div className="anim-fade-slide-up px-5 pb-8 pt-8">
      <button onClick={() => navigate(-1)} className="mb-5 flex items-center gap-2">
        <ArrowLeft size={18} style={{ color: 'var(--color-text-secondary)' }} />
        <span className="font-sans text-sm" style={{ color: 'var(--color-text-secondary)' }}>Back</span>
      </button>

      <h1 className="font-display text-4xl font-bold leading-none" style={{ color: 'var(--color-text-primary)' }}>
        Achievements
      </h1>
      <p className="mt-1 mb-5 font-sans text-sm" style={{ color: 'var(--color-text-secondary)' }}>
        {count} of {total} unlocked
      </p>

      <div className="flex flex-col gap-2">
        {items.map((it) => {
          const secret = it.hidden && !it.unlocked;
          return (
            <div
              key={it.key}
              className="flex items-center gap-3 rounded-2xl px-4 py-3"
              style={{ background: 'var(--color-chalk)', border: '1px solid var(--color-ivory)', opacity: it.unlocked ? 1 : 0.85 }}
            >
              <div
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full"
                style={{ background: it.unlocked ? 'var(--color-gold)' : 'var(--color-ivory)' }}
              >
                {it.unlocked
                  ? <Award size={20} style={{ color: 'var(--color-obsidian)' }} />
                  : secret
                    ? <HelpCircle size={18} style={{ color: 'var(--color-ash)' }} />
                    : <Lock size={16} style={{ color: 'var(--color-ash)' }} />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-sans text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                  {secret ? 'Hidden achievement' : it.title}
                </p>
                <p className="font-sans text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                  {secret ? 'Keep training to reveal this one.' : it.desc}
                </p>
              </div>
              {it.unlocked
                ? (it.xp > 0 && <span className="font-mono text-xs" style={{ color: 'var(--color-gold)' }}>+{it.xp}</span>)
                : (!secret && it.xp > 0 && <span className="font-mono text-xs" style={{ color: 'var(--color-ash)' }}>+{it.xp}</span>)}
            </div>
          );
        })}
      </div>
    </div>
  );
}
