import { useId } from 'react';
import { useMeasure } from './useMeasure.js';
import { m, TWEEN, SPRING, useMotionEnabled, useReducedMotion } from '../../motion/index.jsx';
import { polygonPath, radarPoint, radialAnchor } from '../../utils/chartMath.js';

// The character sheet: five stats, 0–100, with last month's shape behind this
// month's so progress is visible as a shape growing rather than as five
// numbers that each moved a bit.
//
// Deliberately not a visx chart — visx earns its place on the cartesian ones,
// where scales and curve interpolation are real work. Here the whole job is
// five points on a circle, and the tested geometry in utils/chartMath.js is
// both smaller and shared with the vertex dots and the label placement, which
// a radial line generator would not be.

const RINGS = [0.25, 0.5, 0.75, 1];
const MAX = 100;
const LABEL_GAP = 16;
// Widest label ("Consistency 13") at 11px, plus the gap it sits behind.
const LABEL_ROOM = 74;

export default function RadarChart({ data, height = 268 }) {
  const [ref, width] = useMeasure();
  const gradientId = useId();
  const effects = useMotionEnabled();
  const reduced = useReducedMotion();
  const animate = effects && !reduced;

  const rows = data ?? [];
  const hasPrev = rows.some((d) => d.valuePrev != null);

  if (!rows.length) return <div ref={ref} style={{ height }} />;
  if (width <= 0) return <div ref={ref} style={{ height }} />;

  const cx = width / 2;
  const cy = height / 2;
  // Bounded by both axes: labels sit outside the rim, so width has to hold the
  // rim *and* "Consistency", while height has to clear the top and bottom
  // labels. Sizing off one axis alone either clips a label or wastes the card.
  const radius = Math.max(40, Math.min(cy - 30, cx - LABEL_ROOM));

  const n = rows.length;
  const rim = rows.map((_, i) => radarPoint(i, n, MAX, MAX, radius));
  const now = rows.map((d, i) => radarPoint(i, n, d.value, MAX, radius));
  const prev = hasPrev ? rows.map((d, i) => radarPoint(i, n, d.valuePrev ?? 0, MAX, radius)) : null;

  return (
    <div ref={ref}>
      <svg
        width={width}
        height={height}
        role="img"
        aria-label={`Character stats: ${rows.map((d) => `${d.axis} ${Math.round(d.value)}`).join(', ')}`}
        style={{ display: 'block' }}
      >
        <defs>
          <radialGradient id={gradientId}>
            <stop offset="0%" stopColor="var(--color-sage)" stopOpacity={0.5} />
            <stop offset="100%" stopColor="var(--color-gold)" stopOpacity={0.45} />
          </radialGradient>
        </defs>

        <g transform={`translate(${cx},${cy})`}>
          {RINGS.map((ratio) => (
            <path
              key={ratio}
              d={polygonPath(rim.map((p) => ({ x: p.x * ratio, y: p.y * ratio })))}
              fill="none"
              stroke="var(--color-ash)"
              strokeOpacity={ratio === 1 ? 0.34 : 0.16}
            />
          ))}

          {rim.map((p) => (
            <line
              key={p.angle}
              x1={0}
              y1={0}
              x2={p.x}
              y2={p.y}
              stroke="var(--color-ash)"
              strokeOpacity={0.16}
            />
          ))}

          {prev && (
            <m.path
              d={polygonPath(prev)}
              fill="var(--color-ash)"
              fillOpacity={0.1}
              stroke="var(--color-ash)"
              strokeOpacity={0.55}
              strokeWidth={1.5}
              strokeDasharray="4 4"
              initial={animate ? { opacity: 0 } : false}
              animate={{ opacity: 1 }}
              transition={TWEEN.standard}
            />
          )}

          <m.path
            d={polygonPath(now)}
            fill={`url(#${gradientId})`}
            stroke="none"
            initial={animate ? { opacity: 0 } : false}
            animate={{ opacity: 1 }}
            transition={{ ...TWEEN.enter, delay: 0.3 }}
          />
          <m.path
            d={polygonPath(now)}
            fill="none"
            stroke="var(--color-gold)"
            strokeWidth={2}
            strokeLinejoin="round"
            initial={animate ? { pathLength: 0 } : false}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          />

          {now.map((p, i) => (
            // A circle's own bounding box is centred on the circle, so the
            // default fill-box origin already pops it about its own middle.
            <m.circle
              key={rows[i].axis}
              cx={p.x}
              cy={p.y}
              r={3}
              fill="var(--color-gold)"
              // The halo separates the dot from the polygon behind it, so it
              // has to be the card's own ground — `chalk` is the page canvas,
              // which on this deliberately-dark card is the wrong colour in
              // light mode.
              stroke="var(--color-stone)"
              strokeWidth={1.5}
              initial={animate ? { scale: 0 } : false}
              animate={{ scale: 1 }}
              transition={{ ...SPRING.pop, delay: animate ? 0.5 + i * 0.05 : 0 }}
            />
          ))}

          {rows.map((d, i) => {
            const p = radarPoint(i, n, MAX, MAX, radius + LABEL_GAP);
            const anchor = radialAnchor(p.angle);
            return (
              <text
                key={d.axis}
                x={p.x}
                y={p.y}
                textAnchor={anchor}
                // Nudge by where the label sits: one above the chart needs to
                // clear the rim upward, one below needs to hang under it.
                dy={`${0.32 + Math.sin(p.angle) * 0.45}em`}
                fontSize={11}
                fontFamily="DM Sans, sans-serif"
                fill="var(--color-ash)"
              >
                {d.axis}
                <tspan fontFamily="DM Mono, monospace" fill="var(--color-text-inverse)" dx={5}>
                  {Math.round(d.value)}
                </tspan>
              </text>
            );
          })}
        </g>
      </svg>

      {hasPrev && (
        <div className="-mt-1 flex items-center justify-center gap-4">
          <span className="flex items-center gap-1.5 font-sans text-[11px]" style={{ color: 'var(--color-ash)' }}>
            <span style={{ width: 10, height: 3, borderRadius: 2, background: 'var(--color-gold)' }} /> Now
          </span>
          <span className="flex items-center gap-1.5 font-sans text-[11px]" style={{ color: 'var(--color-ash)' }}>
            <span style={{ width: 10, height: 0, borderTop: '2px dashed var(--color-ash)' }} /> Last month
          </span>
        </div>
      )}
    </div>
  );
}
