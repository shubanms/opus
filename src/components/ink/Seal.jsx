import { m } from '../../motion/index.jsx';
import '../../styles/ink-components.css';
import useInkMotion from './useInkMotion.js';

/** Hanko. rotate is clamped to -6..6. `stamp` plays the landing animation (150 ms fade when motion is off). */
export default function Seal({ kanji, size = 40, rotate = -4, stamp = false, label, className = '', onStamped }) {
  const motionOn = useInkMotion();
  const r = Math.max(-6, Math.min(6, rotate));
  const a11y = label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true };
  const style = { width: size, height: size, fontSize: Math.round(size * 0.62) };
  const glyph = <span style={{ filter: 'url(#ink-stamp)' }}>{kanji}</span>;
  if (!stamp) {
    return <span className={`ink-seal ${className}`} style={{ ...style, transform: `rotate(${r}deg)` }} {...a11y}>{glyph}</span>;
  }
  const anim = motionOn
    ? {
        initial: { scale: 1.8, rotate: -8, opacity: 0 },
        animate: { scale: [1.8, 0.94, 1], rotate: [-8, -2, r], opacity: [0, 1, 1] },
        transition: { duration: 0.55, times: [0, 0.6, 1], ease: [0.16, 0.84, 0.3, 1] },
      }
    : { initial: { opacity: 0, rotate: r }, animate: { opacity: 1, rotate: r }, transition: { duration: 0.15, ease: 'easeOut' } };
  return (
    <m.span className={`ink-seal ${className}`} style={style} onAnimationComplete={onStamped} {...anim} {...a11y}>
      {glyph}
    </m.span>
  );
}
