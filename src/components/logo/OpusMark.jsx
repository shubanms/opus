import { useEffect, useRef } from 'react';
import useSettingsStore from '../../store/settingsStore.js';

// The OPUS monogram: an "O" drawn as a living ring of light.
//
// Canvas 2D rather than SVG or a raster image. The previous mark was a gold PNG
// of a lifter — it couldn't be recoloured with the palette (it stayed gold
// through the whole Aurora migration), couldn't animate, and softened at large
// sizes. A canvas ring is resolution-independent, takes its colour from the
// theme, and can actually move.
//
// The mark still evolves with progression: `level` thickens the ring and adds
// one stud per level, `prestige` adds a crown and a brighter halo.

const ACCENT = '#8b7dff';
const ACCENT_2 = '#4fd8c4';
const BRIGHT = '#c4bcff';

export default function OpusMark({ size = 200, dark = true, animate = false, level = 0, prestige = 0 }) {
  const ref = useRef(null);
  const effects = useSettingsStore((s) => s.effects);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return undefined;
    const ctx = canvas.getContext('2d');
    if (!ctx) return undefined;

    const reduced =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const moving = animate && effects && !reduced;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = size * dpr;
    canvas.height = size * dpr;

    const lv = Math.max(0, Math.min(level, 10));
    const p = Math.max(0, Math.min(prestige, 5));
    const R = size * 0.42;
    const width = size * (0.028 + (lv >= 4 ? 0.006 : 0) + (lv >= 8 ? 0.006 : 0));
    const c = size / 2;

    let raf;
    const start = performance.now();

    function frame(now) {
      // `intro` draws the ring on over the first 900ms; `spin` is the endless
      // specular sweep that keeps the mark alive.
      const t = (now - start) / 1000;
      const intro = animate ? Math.min(t / 0.9, 1) : 1;
      const eased = 1 - (1 - intro) ** 3;
      const spin = moving ? t * 0.5 : 0.6;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, size, size);

      ctx.save();
      ctx.translate(c, c);
      ctx.rotate(-Math.PI / 2);

      // Base ring, swept through the accent gradient.
      const grad = ctx.createConicGradient
        ? ctx.createConicGradient(0, 0, 0)
        : ctx.createLinearGradient(-R, -R, R, R);
      grad.addColorStop(0, ACCENT);
      grad.addColorStop(0.5, ACCENT_2);
      grad.addColorStop(1, ACCENT);
      ctx.strokeStyle = grad;
      ctx.lineWidth = width;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(0, 0, R, 0, Math.PI * 2 * eased);
      ctx.stroke();

      if (eased >= 1) {
        // Specular highlight travelling around the ring.
        ctx.strokeStyle = BRIGHT;
        ctx.globalAlpha = 0.9;
        ctx.lineWidth = width * 0.9;
        ctx.beginPath();
        ctx.arc(0, 0, R, spin, spin + 0.5);
        ctx.stroke();
        ctx.globalAlpha = 1;

        // One stud per level, seated on the ring.
        if (lv >= 2) {
          ctx.fillStyle = ACCENT;
          for (let i = 0; i < lv; i += 1) {
            const a = (Math.PI * 2 * i) / lv;
            ctx.beginPath();
            ctx.arc(Math.cos(a) * R, Math.sin(a) * R, width * 0.55, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }
      ctx.restore();

      // Prestige crown — diamonds above the ring.
      if (p > 0 && eased >= 1) {
        ctx.fillStyle = BRIGHT;
        for (let i = 0; i < p; i += 1) {
          const x = c + (i - (p - 1) / 2) * size * 0.075;
          ctx.save();
          ctx.translate(x, c - R - size * 0.055);
          ctx.rotate(Math.PI / 4);
          const s = size * 0.032;
          ctx.fillRect(-s / 2, -s / 2, s, s);
          ctx.restore();
        }
      }

      if (moving || intro < 1) raf = requestAnimationFrame(frame);
    }

    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [size, animate, level, prestige, effects]);

  const glow = Math.min(0.1 + Math.max(0, level - 3) * 0.03 + prestige * 0.05, 0.4);

  return (
    <div
      className="relative"
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: dark ? 'transparent' : 'var(--color-ivory)',
        boxShadow:
          level >= 3
            ? `0 0 ${Math.round(10 + level * 1.6 + prestige * 3)}px rgba(139,125,255,${glow})`
            : undefined,
      }}
    >
      <canvas ref={ref} role="img" aria-label="OPUS" style={{ width: size, height: size, display: 'block' }} />
    </div>
  );
}
