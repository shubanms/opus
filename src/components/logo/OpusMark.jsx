import { useEffect, useState } from 'react';
import lifter from '../../assets/lifter.png';

// Gold ring + lifter image. r=90 in a 200x200 viewBox → circumference ≈ 565.
const CIRCUMFERENCE = 565;
const BRIGHT_GOLD = '#C4BCFF';

// Point on the ring at a clock angle (0 = 12 o'clock), given a radius.
function pointAt(angleDeg, radius) {
  const a = ((angleDeg - 90) * Math.PI) / 180;
  return [100 + radius * Math.cos(a), 100 + radius * Math.sin(a)];
}

// The character mark evolves with `level` (1–10) and `prestige` (0+):
// the ring gains studs (one per level), a brightening halo, and — once
// prestiging — a slow rotating sweep plus a row of gems. Passing no level
// (the default) renders the plain branding mark used on loading/onboarding.
export default function OpusMark({ size = 200, dark = true, animate = false, level = 0, prestige = 0 }) {
  const [showImage, setShowImage] = useState(!animate);

  useEffect(() => {
    if (!animate) return;
    const t = setTimeout(() => setShowImage(true), 800);
    return () => clearTimeout(t);
  }, [animate]);

  const bg = dark ? 'var(--color-obsidian)' : 'var(--color-chalk)';

  const lv = Math.max(0, Math.min(level, 10));
  const p = Math.max(0, Math.min(prestige, 5)); // clamp so the halo stays tasteful
  const ringWidth = 4 + (lv >= 4 ? 1 : 0) + (lv >= 8 ? 1 : 0);
  const glowAlpha = lv >= 3 ? Math.min(0.1 + (lv - 3) * 0.03 + p * 0.05, 0.4) : 0;
  const glowBlur = Math.round(6 + lv * 1.3 + p * 2.2);
  const studs = lv >= 2 ? Array.from({ length: lv }, (_, i) => pointAt((i * 360) / lv, 90)) : [];
  const gems = p;

  return (
    <div
      className="relative"
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        overflow: 'hidden',
        background: bg,
        boxShadow: glowAlpha > 0 ? `0 0 ${glowBlur}px rgba(139, 125, 255,${glowAlpha})` : undefined,
      }}
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
          transition: 'opacity 600ms var(--opus-ease-out)',
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
          strokeWidth={ringWidth}
          strokeLinecap="round"
          transform="rotate(-90 100 100)"
          style={
            animate
              ? {
                  strokeDasharray: CIRCUMFERENCE,
                  strokeDashoffset: CIRCUMFERENCE,
                  animation: 'ringDraw 900ms var(--opus-ease-out) 300ms forwards',
                }
              : undefined
          }
        />

        {/* Prestige: a slow rotating bright sweep over the ring. */}
        {prestige > 0 && (
          <g className="anim-spin-slow" style={{ transformOrigin: '100px 100px' }}>
            <circle
              cx="100"
              cy="100"
              r="90"
              fill="none"
              stroke={BRIGHT_GOLD}
              strokeWidth={ringWidth}
              strokeLinecap="round"
              strokeDasharray={`${Math.round(CIRCUMFERENCE * 0.18)} ${CIRCUMFERENCE}`}
            />
          </g>
        )}

        {/* Level studs around the ring (one per level). */}
        {studs.map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r={ringWidth >= 5 ? 3.4 : 3} fill="var(--color-gold)" />
        ))}

        {/* Prestige gems — a small crown at the top. */}
        {Array.from({ length: gems }, (_, i) => {
          const cx = 100 + (i - (gems - 1) / 2) * 15;
          return (
            <rect
              key={`g${i}`}
              x={cx - 3.2}
              y={16.8}
              width={6.4}
              height={6.4}
              fill={BRIGHT_GOLD}
              transform={`rotate(45 ${cx} 20)`}
            />
          );
        })}
      </svg>
    </div>
  );
}
