import { useState, useEffect } from 'react';
import { Lock, Zap } from 'lucide-react';
import { getXPProgress } from '../../utils/rpg.js';

/**
 * Animated XP progress bar. Pass totalXp; fills from 0 → progress on mount.
 *
 * `level` is the level to *show* — pass the boss-capped one from
 * useEffectiveXp. When XP has outrun it (a sealed gate), the bar reads as full
 * and the label says how many levels are banked, instead of announcing a level
 * the rest of the app says you do not have. Without it, the bar behaves as it
 * always did.
 */
export default function XPBar({ totalXp = 0, showLabel = true, level: shownLevel }) {
  const { level: xpLevel, progress, xpToNext } = getXPProgress(totalXp);
  const level = Number.isFinite(shownLevel) ? Math.min(shownLevel, xpLevel) : xpLevel;
  const banked = xpLevel - level;
  const sealed = banked > 0;
  const fill = sealed ? 1 : progress;
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const id = requestAnimationFrame(() => setWidth(fill * 100));
    return () => cancelAnimationFrame(id);
  }, [fill]);

  return (
    <div>
      {showLabel && (
        <div className="mb-2 flex items-center justify-between">
          <span className="flex items-center gap-1.5 font-sans text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>
            {sealed ? <Lock size={12} style={{ color: 'var(--color-gold)' }} /> : <Zap size={12} style={{ color: 'var(--color-gold)' }} />}
            Level {level}{sealed ? ' · sealed' : ''}
          </span>
          <span className="font-mono text-xs" style={{ color: 'var(--color-text-secondary)' }}>
            {sealed ? `${banked} level${banked === 1 ? '' : 's'} banked` : `${xpToNext.toLocaleString()} XP to next`}
          </span>
        </div>
      )}
      {/* Decorative: the label (or the level badge beside a label-less bar)
          already says what it shows. */}
      <div className="h-2 overflow-hidden rounded-full" style={{ background: 'var(--color-ivory)' }} aria-hidden="true">
        <div
          className="h-full rounded-full"
          style={{
            width: `${Math.round(width)}%`,
            background: 'var(--color-gold)',
            transition: 'width 1.1s var(--opus-ease-out)',
          }}
        />
      </div>
    </div>
  );
}
