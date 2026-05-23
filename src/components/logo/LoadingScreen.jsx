import OpusMark from './OpusMark.jsx';

// Full 3.8s intro sequence. Timings in ms keyed off mount.
export default function LoadingScreen({ fadingOut = false }) {
  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center"
      style={{
        background: 'var(--color-obsidian)',
        opacity: fadingOut ? 0 : 1,
        transition: 'opacity 600ms var(--ease-out)',
      }}
    >
      <div style={{ animation: 'scaleIn 600ms var(--ease-out) 300ms both' }}>
        <OpusMark size={200} dark animate />
      </div>

      <h1
        className="font-display text-chalk"
        style={{
          marginTop: 'var(--space-8)',
          fontSize: 52,
          fontWeight: 700,
          letterSpacing: 18,
          textIndent: 18,
          animation: 'fadeSlideUp 700ms var(--ease-out) 2000ms both',
        }}
      >
        OPUS
      </h1>

      <p
        className="font-sans"
        style={{
          marginTop: 'var(--space-3)',
          fontSize: 12,
          letterSpacing: 5,
          textIndent: 5,
          textTransform: 'uppercase',
          color: 'var(--color-ash)',
          animation: 'fadeIn 600ms var(--ease-out) 2600ms both',
        }}
      >
        Build your masterpiece.
      </p>
    </div>
  );
}
