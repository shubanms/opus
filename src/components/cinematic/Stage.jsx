import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import Particles from '../fx/Particles.jsx';
import { m, TWEEN } from '../../motion/index.jsx';
import { useHaptics } from '../../hooks/useHaptics.js';
import { playChime } from '../../utils/sound.js';

// The shared shell every cinematic plays inside: full-screen ground, the enter
// and exit, the burst, and the one place sound and haptics fire.
//
// Keeping the chrome here is what makes three celebrations feel like one app
// rather than three one-off screens — and it means the sound cue can never be
// forgotten on a new one.
//
// z-85 puts it above the toast layer (z-80). A finished session fires toasts
// for Iron and routine changes at the same moment, and a full-screen
// celebration with "+85 Iron earned" poking through the bottom of it reads as
// a rendering fault. The burst then has to clear the stage in turn.

export default function Stage({ children, particles = 24, chime, haptic = 'success', label }) {
  const fire = useHaptics();

  // The cue is a one-shot on mount. The host remounts this per queue item, so
  // re-running on a prop change would double the sound rather than fix anything.
  // biome-ignore lint/correctness/useExhaustiveDependencies: fires once, on mount
  useEffect(() => {
    fire(haptic);
    if (chime) playChime(chime);
  }, []);

  return createPortal(
    <m.div
      aria-live="polite"
      aria-label={label}
      className="fixed inset-0 z-[85] flex flex-col items-center justify-center px-8 text-center"
      style={{ background: 'var(--aurora), var(--color-obsidian)' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={TWEEN.standard}
    >
      {particles > 0 && <Particles count={particles} z={86} />}
      {children}
    </m.div>,
    document.body
  );
}

/** The small letterspaced caption every cinematic opens with. */
export function Eyebrow({ children }) {
  return (
    <m.p
      className="font-sans text-xs font-semibold uppercase"
      style={{ color: 'var(--color-gold)', letterSpacing: '0.3em', textIndent: '0.3em' }}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={TWEEN.enter}
    >
      {children}
    </m.p>
  );
}

/** Big numerals, filled with the accent sweep rather than a flat colour. */
export function AccentNumber({ children, size = 96 }) {
  return (
    <span
      className="font-display font-bold leading-none"
      style={{
        fontSize: size,
        backgroundImage: 'var(--grad-accent)',
        WebkitBackgroundClip: 'text',
        backgroundClip: 'text',
        color: 'transparent',
      }}
    >
      {children}
    </span>
  );
}
