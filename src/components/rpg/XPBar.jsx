import { useState, useEffect } from 'react';
import { getXPProgress } from '../../utils/rpg.js';
import useInkMotion from '../ink/useInkMotion.js';
import '../../styles/ink-you.css';

/**
 * Ink XP bar: a vermilion brush fill on a sumi track. Pass totalXp; the fill
 * writes in from the left on mount (transform only, skipped when motion is off).
 *
 * `level` is the level to *show* — pass the boss-capped one from
 * useEffectiveXp. When XP has outrun it (a sealed gate), the bar reads as full
 * and the label says how many levels are banked, instead of announcing a level
 * the rest of the app says you do not have. Without it, the bar behaves as it
 * always did.
 */
export default function XPBar({ totalXp = 0, showLabel = true, level: shownLevel, className = '' }) {
  const motionOn = useInkMotion();
  const { level: xpLevel, progress, xpToNext } = getXPProgress(totalXp);
  const level = Number.isFinite(shownLevel) ? Math.min(shownLevel, xpLevel) : xpLevel;
  const banked = xpLevel - level;
  const sealed = banked > 0;
  const fill = sealed ? 1 : progress;
  const [ratio, setRatio] = useState(motionOn ? 0 : fill);

  useEffect(() => {
    if (!motionOn) { setRatio(fill); return undefined; }
    const id = requestAnimationFrame(() => setRatio(fill));
    return () => cancelAnimationFrame(id);
  }, [fill, motionOn]);

  return (
    <div className={className}>
      {showLabel && (
        <div className="mb-2 flex items-center justify-between">
          <span className="font-sans text-xs font-medium" style={{ color: 'var(--mute-1)' }}>
            Level {level}{sealed ? ' · sealed' : ''}
          </span>
          <span className="font-sans text-xs" style={{ color: 'var(--mute-2)' }}>
            {sealed ? `${banked} level${banked === 1 ? '' : 's'} banked` : `${xpToNext.toLocaleString()} XP to next`}
          </span>
        </div>
      )}
      {/* Decorative: the label (or the figures beside a label-less bar)
          already say what it shows. */}
      <div className="you-xp" aria-hidden="true">
        <div
          className="you-xp__fill"
          style={{
            transform: `scaleX(${ratio})`,
            transition: motionOn ? 'transform 1.1s var(--ink-ease)' : 'none',
          }}
        />
      </div>
    </div>
  );
}
