import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Award } from 'lucide-react';
import Particles from '../fx/Particles.jsx';
import { playChime } from '../../utils/sound.js';

export default function AchievementToast({ achievements, onDismiss }) {
  useEffect(() => {
    playChime('achievement');
    const t = setTimeout(onDismiss, 4200);
    return () => clearTimeout(t);
  }, [onDismiss]);

  return createPortal(
    <div className="fixed inset-x-0 bottom-28 z-[65] flex flex-col items-center px-5" onClick={onDismiss}>
      <Particles count={18} />
      {achievements.map((a) => (
        <div
          key={a.key}
          className="anim-fade-slide-up mb-2 flex w-full max-w-md items-center gap-3 rounded-2xl px-4 py-3"
          style={{ background: 'var(--color-obsidian)', border: '1px solid var(--color-gold)' }}
        >
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full" style={{ background: 'var(--color-gold)' }}>
            <Award size={20} style={{ color: 'var(--color-obsidian)' }} />
          </div>
          <div className="min-w-0">
            <p className="font-sans text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'var(--color-gold)' }}>
              Achievement unlocked
            </p>
            <p className="truncate font-sans text-sm font-semibold" style={{ color: 'var(--color-text-inverse)' }}>{a.title}</p>
          </div>
          {a.xp > 0 && <span className="ml-auto font-mono text-sm" style={{ color: 'var(--color-gold)' }}>+{a.xp}</span>}
        </div>
      ))}
    </div>,
    document.body
  );
}
