import { useMemo } from 'react';
import { createPortal } from 'react-dom';

const COLORS = ['#8B7DFF', '#FF8FA3', '#F4F6FD', '#4FD8C4'];

// Full-screen one-shot particle burst from the centre. Parent renders it
// briefly (e.g. for ~1.2s) then unmounts.
//
// `z` exists because a burst has to sit above whatever it is celebrating: the
// default clears ordinary page content, while a full-screen cinematic — which
// itself sits above the toast layer — has to lift it further.
export default function Particles({ count = 22, z = 70 }) {
  const bits = useMemo(
    () =>
      Array.from({ length: count }).map(() => ({
        tx: (Math.random() * 2 - 1) * 240,
        ty: (Math.random() * 2 - 1) * 240 - 30,
        size: 6 + Math.random() * 9,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        delay: Math.random() * 80,
        dur: 700 + Math.random() * 600,
      })),
    [count]
  );

  return createPortal(
    <div className="pointer-events-none fixed inset-0 flex items-center justify-center" style={{ zIndex: z }}>
      {bits.map((b, i) => (
        <span
          key={i}
          style={{
            position: 'absolute',
            width: b.size,
            height: b.size,
            borderRadius: '50%',
            background: b.color,
            '--tx': `${b.tx}px`,
            '--ty': `${b.ty}px`,
            animation: `particleFly ${b.dur}ms var(--opus-ease-out) ${b.delay}ms forwards`,
          }}
        />
      ))}
    </div>,
    document.body
  );
}
