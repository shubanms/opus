import { useEffect, useState } from 'react';
import useSettingsStore from '../../store/settingsStore.js';
import { prefersReducedEffects, watchReducedEffects } from './gpuGate.js';

/**
 * The app backdrop: sumi ground, ember glow, grain, and (effects on) a slow mist
 * band plus three falling leaves. CSS only, no WebGL. Styles live in
 * styles/ink-chrome.css. Animations pause when the tab is hidden.
 */
const LEAF_PATH = 'M7 0 C9 3 13 4 14 8 C11 8 10 10 11 13 C8 12 7 14 7 17 C7 14 6 12 3 13 C4 10 3 8 0 8 C1 4 5 3 7 0Z';

// Randomised once per page load.
const LEAVES = Array.from({ length: 3 }, (_, i) => ({
  left: 8 + Math.random() * 84,
  dur: 9 + Math.random() * 5,
  delay: -(Math.random() * 9 + i),
  size: 11 + Math.random() * 6,
  drift: (Math.random() < 0.5 ? -1 : 1) * (30 + Math.random() * 50),
}));

export default function InkBackdrop() {
  const effects = useSettingsStore((s) => s.effects);
  const [reduced, setReduced] = useState(prefersReducedEffects);
  const [hidden, setHidden] = useState(false);

  useEffect(() => watchReducedEffects(setReduced), []);
  useEffect(() => {
    const read = () => setHidden(document.hidden);
    read();
    document.addEventListener('visibilitychange', read);
    return () => document.removeEventListener('visibilitychange', read);
  }, []);

  const live = effects && !reduced;

  return (
    <div aria-hidden="true" className={`ink-backdrop${live ? ' is-live' : ''}${hidden ? ' is-paused' : ''}`}>
      <div className="ink-glow" />
      {live && <div className="ink-mist" />}
      {live &&
        LEAVES.map((l) => (
          <svg
            key={`leaf-${l.left}`}
            className="ink-leaf"
            viewBox="0 0 14 17"
            width={l.size}
            height={l.size * 1.2}
            style={{
              left: `${l.left}%`,
              animationDuration: `${l.dur}s`,
              animationDelay: `${l.delay}s`,
              '--leaf-drift': `${l.drift}px`,
            }}
          >
            <path d={LEAF_PATH} fill="currentColor" />
          </svg>
        ))}
      <div className="ink-grain" />
    </div>
  );
}
