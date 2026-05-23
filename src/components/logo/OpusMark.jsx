import { useEffect, useState } from 'react';
import lifter from '../../assets/lifter.png';

// Gold ring + lifter image. r=90 in a 200x200 viewBox → circumference ≈ 565.
const CIRCUMFERENCE = 565;

export default function OpusMark({ size = 200, dark = true, animate = false }) {
  const [showImage, setShowImage] = useState(!animate);

  useEffect(() => {
    if (!animate) return;
    const t = setTimeout(() => setShowImage(true), 800);
    return () => clearTimeout(t);
  }, [animate]);

  const bg = dark ? 'var(--color-obsidian)' : 'var(--color-chalk)';

  return (
    <div
      className="relative"
      style={{ width: size, height: size, borderRadius: '50%', overflow: 'hidden', background: bg }}
    >
      <img
        src={lifter}
        alt="OPUS"
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          width: '78%',
          height: '78%',
          objectFit: 'contain',
          transform: 'translate(-50%, -50%)',
          opacity: showImage ? 1 : 0,
          transition: 'opacity 600ms var(--ease-out)',
        }}
      />
      <svg
        viewBox="0 0 200 200"
        width={size}
        height={size}
        style={{ position: 'absolute', top: 0, left: 0 }}
      >
        <circle
          cx="100"
          cy="100"
          r="90"
          fill="none"
          stroke="var(--color-gold)"
          strokeWidth="4"
          strokeLinecap="round"
          transform="rotate(-90 100 100)"
          style={
            animate
              ? {
                  strokeDasharray: CIRCUMFERENCE,
                  strokeDashoffset: CIRCUMFERENCE,
                  animation: 'ringDraw 900ms var(--ease-out) 300ms forwards',
                }
              : undefined
          }
        />
      </svg>
    </div>
  );
}
