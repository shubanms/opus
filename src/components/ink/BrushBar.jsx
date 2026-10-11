import { m } from '../../motion/index.jsx';
import '../../styles/ink-components.css';
import useInkMotion from './useInkMotion.js';

/** One chart bar. `ratio` 0..1 of the parent height (parent needs a fixed height). Current uses --ver. */
export default function BrushBar({ ratio = 0, current = false, label, delay = 0, className = '' }) {
  const motionOn = useInkMotion();
  const h = `${Math.round(Math.max(0, Math.min(1, ratio)) * 100)}%`;
  return (
    <div className={`ink-bar ${current ? 'ink-bar--current' : ''} ${className}`}>
      <div className="ink-bar__track">
        <m.div
          aria-hidden
          className="ink-bar__col"
          style={{ height: h, filter: 'url(#ink-brush-fine)' }}
          initial={motionOn ? { scaleY: 0 } : false}
          animate={{ scaleY: 1 }}
          transition={{ duration: 0.6, delay, ease: [0.16, 0.84, 0.3, 1] }}
        />
      </div>
      {label ? <span className="ink-bar__label">{label}</span> : null}
    </div>
  );
}
