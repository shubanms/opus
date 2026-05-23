import { useState, useEffect } from 'react';
import { Zap } from 'lucide-react';
import { getXPProgress } from '../../utils/rpg.js';

// Animated XP progress bar. Pass totalXp; fills from 0 → progress on mount.
export default function XPBar({ totalXp = 0, showLabel = true }) {
  const { level, progress, xpToNext } = getXPProgress(totalXp);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const id = requestAnimationFrame(() => setWidth(progress * 100));
    return () => cancelAnimationFrame(id);
  }, [progress]);

  return (
    <div>
      {showLabel && (
        <div className="mb-2 flex items-center justify-between">
          <span className="flex items-center gap-1.5 font-sans text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>
            <Zap size={12} style={{ color: 'var(--color-gold)' }} />
            Level {level}
          </span>
          <span className="font-mono text-xs" style={{ color: 'var(--color-text-secondary)' }}>
            {xpToNext.toLocaleString()} XP to next
          </span>
        </div>
      )}
      <div className="h-2 overflow-hidden rounded-full" style={{ background: 'var(--color-ivory)' }}>
        <div
          className="h-full rounded-full"
          style={{
            width: `${Math.round(width)}%`,
            background: 'var(--color-gold)',
            transition: 'width 1.1s var(--ease-out)',
          }}
        />
      </div>
    </div>
  );
}
