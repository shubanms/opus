import '../../styles/ink-forms.css';
import useInkMotion from '../ink/useInkMotion.js';

// Grey ink still-lifes of the equipment, with the form kanji writing on over
// them. No figures, ever: the kanji carries the movement. Shapes are lifted
// from the Forms artboard.
const PROPS = {
  barbell: (
    <>
      <rect x="14" y="80" width="84" height="7" rx="3" strokeWidth="0" />
      <path d="M26 87 L 26 97 M86 87 L 86 97" fill="none" strokeWidth="3" />
      <path d="M18 80 L 18 46 M94 80 L 94 46" fill="none" strokeWidth="2.4" />
      <path d="M4 47 L 108 47" fill="none" strokeWidth="2.4" />
      <rect x="6" y="35" width="6" height="24" rx="1.5" strokeWidth="0" />
      <rect x="100" y="35" width="6" height="24" rx="1.5" strokeWidth="0" />
      <rect x="13" y="39" width="4" height="16" rx="1" strokeWidth="0" />
      <rect x="95" y="39" width="4" height="16" rx="1" strokeWidth="0" />
    </>
  ),
  dumbbell: (
    <>
      <path d="M30 50 L 82 50" fill="none" strokeWidth="3" />
      <rect x="18" y="36" width="8" height="28" rx="2" strokeWidth="0" />
      <rect x="26" y="41" width="5" height="18" rx="1.5" strokeWidth="0" />
      <rect x="86" y="36" width="8" height="28" rx="2" strokeWidth="0" />
      <rect x="81" y="41" width="5" height="18" rx="1.5" strokeWidth="0" />
      <path d="M10 88 L 102 88" fill="none" strokeWidth="2" />
    </>
  ),
  cable: (
    <>
      <path d="M20 94 L 20 12 M92 94 L 92 12" fill="none" strokeWidth="2.6" />
      <path d="M14 12 L 98 12" fill="none" strokeWidth="2.6" />
      <circle cx="56" cy="12" r="5" fill="none" strokeWidth="2" />
      <path d="M56 17 L 56 58" fill="none" strokeWidth="1.6" />
      <rect x="49" y="58" width="14" height="6" rx="2" strokeWidth="0" />
      <rect x="10" y="88" width="92" height="6" rx="2" strokeWidth="0" />
    </>
  ),
  machine: (
    <>
      <rect x="14" y="20" width="14" height="70" rx="2" strokeWidth="0" />
      <path d="M21 20 L 21 14 M21 14 L 80 14 M80 14 L 80 40" fill="none" strokeWidth="2.4" />
      <rect x="62" y="40" width="36" height="9" rx="3" strokeWidth="0" />
      <rect x="36" y="62" width="48" height="8" rx="3" strokeWidth="0" />
      <path d="M44 70 L 44 92 M76 70 L 76 92 M10 92 L 102 92" fill="none" strokeWidth="2.4" />
    </>
  ),
  bodyweight: (
    <>
      <path d="M12 94 L 12 22 M100 94 L 100 22" fill="none" strokeWidth="2.6" />
      <path d="M6 24 L 106 24" fill="none" strokeWidth="3.4" />
      <path d="M40 24 L 40 32 M72 24 L 72 32" fill="none" strokeWidth="1.8" />
      <path d="M6 94 L 106 94" fill="none" strokeWidth="2" />
    </>
  ),
  other: (
    <>
      <circle cx="56" cy="58" r="26" fill="none" strokeWidth="3" />
      <circle cx="56" cy="58" r="8" fill="none" strokeWidth="2" />
      <path d="M20 94 L 92 94" fill="none" strokeWidth="2" />
    </>
  ),
};

export default function FormStillLife({ kanji, equipment, label, delay = 0, fontSize = 66, className = '' }) {
  const motionOn = useInkMotion();
  const prop = PROPS[equipment] ?? PROPS.other;
  return (
    <svg
      role="img"
      aria-label={label}
      viewBox="0 0 112 100"
      className={`forms-still ${motionOn ? 'forms-still--write' : ''} ${className}`}
      style={{ '--forms-delay': `${-delay}s` }}
    >
      <g className="forms-still__prop" filter="url(#ink-brush)">{prop}</g>
      <text className="forms-still__fill" x="56" y="72" lang="ja" fontSize={fontSize}>{kanji}</text>
      {motionOn ? (
        <text className="forms-still__stroke" x="56" y="72" lang="ja" fontSize={fontSize}>{kanji}</text>
      ) : null}
    </svg>
  );
}
