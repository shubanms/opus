import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import TitleBadge from './TitleBadge.jsx';
import Particles from '../fx/Particles.jsx';
import { useHaptics } from '../../hooks/useHaptics.js';
import { playChime } from '../../utils/sound.js';

// Full-screen gold celebration shown when the user levels up.
export default function LevelUpScreen({ level, title, onDismiss }) {
  const haptic = useHaptics();
  useEffect(() => {
    haptic('levelup');
    playChime('levelup');
    const t = setTimeout(onDismiss, 4200);
    return () => clearTimeout(t);
  }, [onDismiss]); // eslint-disable-line react-hooks/exhaustive-deps

  return createPortal(
    <div
      className="fixed inset-0 z-[60] flex flex-col items-center justify-center px-8"
      style={{ background: 'var(--color-obsidian)', animation: 'fadeIn 300ms var(--ease-out)' }}
      onClick={onDismiss}
    >
      <Particles count={28} />
      <p
        className="font-sans text-xs font-semibold uppercase tracking-[0.3em]"
        style={{ color: 'var(--color-gold)', animation: 'fadeSlideUp 500ms var(--ease-out)' }}
      >
        Level Up
      </p>

      <p
        className="mt-4 font-display font-bold leading-none"
        style={{
          fontSize: 120,
          color: 'var(--color-gold)',
          animation: 'scaleIn 600ms var(--ease-out)',
        }}
      >
        {level}
      </p>

      <div className="mt-6" style={{ animation: 'fadeSlideUp 700ms var(--ease-out) 400ms both' }}>
        <TitleBadge title={title} />
      </div>

      <p
        className="mt-10 font-display text-2xl italic"
        style={{ color: 'var(--color-ash)', animation: 'fadeIn 800ms var(--ease-out) 800ms both' }}
      >
        Build your masterpiece.
      </p>

      <p
        className="absolute bottom-10 font-sans text-xs"
        style={{ color: 'var(--color-ash)', opacity: 0.6 }}
      >
        Tap to continue
      </p>
    </div>,
    document.body
  );
}
