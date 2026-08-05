import OpusMark from './OpusMark.jsx';
import { m, TWEEN, useMotionEnabled } from '../../motion/index.jsx';

const WORD = ['O', 'P', 'U', 'S'];

// Cold-start sequence: the mark draws itself, then the wordmark assembles one
// letter at a time, then the line. Timed to land just before the router moves
// on, so the app never appears to hang on a static splash.
export default function LoadingScreen({ fadingOut = false }) {
  const motionOn = useMotionEnabled();
  const step = motionOn ? 1 : 0;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center"
      style={{
        // The aurora, so the splash belongs to the same world as the app rather
        // than being a flat plate in front of it.
        background: 'var(--aurora), var(--color-chalk)',
        opacity: fadingOut ? 0 : 1,
        transition: 'opacity 600ms var(--opus-ease-out)',
      }}
    >
      <m.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ ...TWEEN.enter, delay: 0.15 * step }}
      >
        <OpusMark size={180} dark animate />
      </m.div>

      {/* Letters animate individually, so the wordmark assembles rather than
          simply fading in. */}
      <div className="flex" style={{ marginTop: 'var(--space-8)' }}>
        {WORD.map((letter, i) => (
          <m.span
            key={letter}
            className="font-display"
            style={{
              // Was `text-surface`, which resolves to the canvas colour — in
              // dark mode that is near-black on a near-black splash, so the
              // wordmark was effectively invisible.
              color: 'var(--color-text-primary)',
              fontSize: 52,
              fontWeight: 700,
              letterSpacing: 18,
              paddingLeft: i === 0 ? 18 : 0,
            }}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...TWEEN.enter, delay: (1.5 + i * 0.09) * step }}
          >
            {letter}
          </m.span>
        ))}
      </div>

      <m.p
        className="font-sans"
        style={{
          marginTop: 'var(--space-3)',
          fontSize: 12,
          letterSpacing: 5,
          textIndent: 5,
          textTransform: 'uppercase',
          color: 'var(--color-text-secondary)',
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ ...TWEEN.enter, delay: 2.1 * step }}
      >
        Build your masterpiece.
      </m.p>
    </div>
  );
}
