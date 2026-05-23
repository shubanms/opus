import { useState, useEffect, useRef } from 'react';
import { X } from 'lucide-react';

const R = 18;
const C = 2 * Math.PI * R; // ≈ 113

export default function RestTimer({ duration = 90, onComplete, onSkip }) {
  const [remaining, setRemaining] = useState(duration);
  const ref = useRef();

  useEffect(() => {
    ref.current = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          clearInterval(ref.current);
          navigator.vibrate?.([200, 100, 200]);
          onComplete?.();
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => clearInterval(ref.current);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const progress = remaining / duration;
  const dashoffset = C * (1 - progress);

  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;
  const label = mins > 0
    ? `${mins}:${String(secs).padStart(2, '0')}`
    : `${secs}s`;

  return (
    <div
      className="flex items-center gap-3 rounded-2xl px-4 py-3"
      style={{ background: 'var(--color-stone)' }}
    >
      {/* Circular countdown ring */}
      <svg width={44} height={44} viewBox="0 0 44 44" style={{ flexShrink: 0 }}>
        <circle
          cx={22} cy={22} r={R}
          fill="none"
          stroke="#444"
          strokeWidth={3}
        />
        <circle
          cx={22} cy={22} r={R}
          fill="none"
          stroke="var(--color-gold)"
          strokeWidth={3}
          strokeLinecap="round"
          strokeDasharray={C}
          strokeDashoffset={dashoffset}
          transform="rotate(-90 22 22)"
          style={{ transition: 'stroke-dashoffset 1s linear' }}
        />
      </svg>

      <div className="flex-1">
        <p className="font-mono text-lg font-medium" style={{ color: 'var(--color-chalk)' }}>
          {label}
        </p>
        <p className="font-sans text-xs" style={{ color: 'var(--color-ash)' }}>Rest</p>
      </div>

      <button
        onClick={onSkip}
        className="flex h-8 w-8 items-center justify-center rounded-full"
        style={{ background: 'rgba(255,255,255,0.08)' }}
        aria-label="Skip rest"
      >
        <X size={15} style={{ color: 'var(--color-ash)' }} />
      </button>
    </div>
  );
}
