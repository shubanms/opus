import InkDefs from '../fx/InkDefs.jsx';
import useInkMotion from '../ink/useInkMotion.js';
import '../../styles/ink-system.css';

// The same three ensō strokes as Home's ring, written on over 1.2 s around the wordmark.
const STROKES = [
  { d: 'M 62.1 197.9 A 96 96 0 1 1 146.7 224.5', w: 7 },
  { d: 'M 63.5 196.5 A 94 94 0 1 1 202 190.4', w: 10 },
  { d: 'M 64.9 195.1 A 92 92 0 0 1 98.5 43.5', w: 13 },
];

/**
 * Cold-start screen: the ensō writes itself around OPUS, then the line lands.
 * Motion off (Effects off or reduced motion) → a 150 ms fade, no drawing.
 */
export default function InkLoading({ fadingOut = false }) {
  const motionOn = useInkMotion();
  const rise = (delay) => ({ animationDelay: `${delay}s` });
  return (
    <div className={`sy-load${motionOn ? '' : ' sy-load--still'}`} style={{ opacity: fadingOut ? 0 : 1 }}>
      <InkDefs />
      <div className="sy-load__ring">
        <svg viewBox="0 0 260 260" aria-hidden="true">
          <g filter="url(#ink-brush)" fill="none" stroke="var(--washi-2)" strokeLinecap="round">
            {STROKES.map((st) => (
              <path key={st.w} d={st.d} pathLength="100" strokeWidth={st.w} className="sy-write" />
            ))}
          </g>
        </svg>
        <div className="sy-load__word sy-rise" style={rise(1.2)}>OPUS</div>
      </div>
      <p className="sy-load__tag sy-rise" style={rise(1.7)}>Build your masterpiece.</p>
    </div>
  );
}
