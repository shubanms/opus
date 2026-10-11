import { useMeasure } from './useMeasure.js';
import { m, TWEEN, SPRING, useMotionEnabled, useReducedMotion } from '../../motion/index.jsx';
import { polygonPath, radarPoint } from '../../utils/chartMath.js';
import '../../styles/ink-you.css';

// The character sheet in ink: five stats, 0–100, a hairline web, a vermilion
// polygon with dots, and last month's shape dashed behind it so progress reads
// as a shape growing rather than five numbers that each moved a bit.
//
// Deliberately not a visx chart: the whole job is five points on a circle, and
// the tested geometry in utils/chartMath.js is shared with the dots and labels.

const RINGS = [0.33, 0.66, 1];
const MAX = 100;
// Room beside the rim for the widest side label ("Balance", "Power").
const SIDE_ROOM = 52;

export default function RadarChart({ data, height = 184 }) {
  const [ref, width] = useMeasure();
  const effects = useMotionEnabled();
  const reduced = useReducedMotion();
  const animate = effects && !reduced;

  const rows = data ?? [];
  const hasPrev = rows.some((d) => d.valuePrev != null);

  if (!rows.length) return <div ref={ref} style={{ height }} />;
  if (width <= 0) return <div ref={ref} style={{ height }} />;

  const cx = width / 2;
  const cy = height / 2 + 2;
  // Bounded by both axes: labels sit outside the rim, so width has to hold the
  // rim *and* the side labels, while height has to clear the top and bottom.
  const radius = Math.max(36, Math.min(cy - 34, cx - SIDE_ROOM));

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
        <g transform={`translate(${cx},${cy})`}>
          <g filter="url(#ink-brush-fine)" fill="none" stroke="var(--washi-2)" strokeOpacity={0.22} strokeWidth={1}>
            {RINGS.map((ratio) => (
              <path key={ratio} d={polygonPath(rim.map((p) => ({ x: p.x * ratio, y: p.y * ratio })))} />
            ))}
            {rim.map((p) => (
              <line key={p.angle} x1={0} y1={0} x2={p.x} y2={p.y} />
            ))}
          </g>

          {prev && (
            <m.path
              d={polygonPath(prev)}
              fill="none"
              stroke="var(--washi-2)"
              strokeOpacity={0.55}
              strokeWidth={1.2}
              strokeDasharray="3 3"
              initial={animate ? { opacity: 0 } : false}
              animate={{ opacity: 1 }}
              transition={TWEEN.standard}
            />
          )}

          <m.path
            d={polygonPath(now)}
            fill="var(--ver)"
            fillOpacity={0.38}
            stroke="none"
            initial={animate ? { opacity: 0 } : false}
            animate={{ opacity: 1 }}
            transition={{ ...TWEEN.enter, delay: 0.3 }}
          />
          <m.path
            d={polygonPath(now)}
            fill="none"
            stroke="var(--ver-light)"
            strokeWidth={2}
            strokeLinejoin="round"
            filter="url(#ink-brush-fine)"
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
              r={2.6}
              fill="var(--ver-light)"
              initial={animate ? { scale: 0 } : false}
              animate={{ scale: 1 }}
              transition={{ ...SPRING.pop, delay: animate ? 0.5 + i * 0.05 : 0 }}
            />
          ))}

          {rows.map((d, i) => {
            const base = radarPoint(i, n, MAX, MAX, radius);
            const cos = Math.cos(base.angle);
            const sin = Math.sin(base.angle);
            const side = Math.abs(cos) > 0.25;
            const anchor = cos > 0.8 ? 'start' : cos < -0.8 ? 'end' : 'middle';
            const gap = Math.abs(cos) > 0.8 ? 5 : 13;
            // The two bottom labels would meet under the rim; nudge them apart.
            const x = base.x + cos * gap + (side && anchor === 'middle' ? Math.sign(cos) * 6 : 0);
            const y = base.y + sin * gap;
            const common = { fontFamily: 'var(--font-display)', fontSize: 11, fontWeight: 600, textAnchor: anchor };
            // Side labels stack (name over value) like the artboard so they fit
            // beside the rim; top and bottom labels run on one line.
            return side ? (
              <g key={d.axis}>
                <text x={x} y={y + (sin > 0 ? 6 : -1)} {...common} fill="var(--mute-1)">{d.axis}</text>
                <text x={x} y={y + (sin > 0 ? 19 : 12)} {...common} fill="var(--ver-soft)">{Math.round(d.value)}</text>
              </g>
            ) : (
              <text key={d.axis} x={x} y={y} dy={`${0.32 + sin * 0.45}em`} {...common} fill="var(--mute-1)">
                {d.axis}
                <tspan fill="var(--ver-soft)" dx={4}>{Math.round(d.value)}</tspan>
              </text>
            );
          })}
        </g>
      </svg>

      {hasPrev && (
        <div className="you-radar__legend">
          <span><i />Now</span>
          <span><i className="dash" />Last month</span>
        </div>
      )}
    </div>
  );
}
