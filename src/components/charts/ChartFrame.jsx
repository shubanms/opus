import { useMemo } from 'react';
import { scaleBand, scaleLinear, scalePoint } from '@visx/scale';
import { useMeasure } from './useMeasure.js';
import { useScrub } from './useScrub.js';
import { compactNumber, niceTicks, padDomain, tickIndices } from '../../utils/chartMath.js';

// The shared chrome behind every cartesian chart: measuring, scales, grid,
// axes, the scrub overlay and the readout. The chart itself is a render prop,
// so a line and a bar chart differ only in what they draw inside the plot —
// they cannot drift apart on padding, tick density, or how inspection works.

const AXIS_FONT = 10;
const TOP = 12;
// Enough for the marker on a final data point to sit at the plot edge without
// half of it hanging outside the frame.
const RIGHT = 8;
const BOTTOM = 20;
/**
 * Advance width of one axis glyph at AXIS_FONT, plus breathing room.
 *
 * Deliberately wider than DM Mono actually measures. The label budget is an
 * estimate, and it has to hold when the webfont has *not* loaded — offline
 * first paint, a blocked CDN — because the system fallback is wider and the
 * labels then overlap ("6/156/22"). Erring wide costs at most one label.
 */
const CHAR = 7;
const LABEL_GAP = 18;

/** Rough width of a right-aligned axis label at AXIS_FONT in the mono face. */
function gutterFor(ticks) {
  const longest = ticks.reduce((n, t) => Math.max(n, compactNumber(t).length), 1);
  return Math.min(46, longest * CHAR + 8);
}

export default function ChartFrame({
  data,
  height = 176,
  /** Pull the plotted number out of a datum. */
  getValue,
  /** Pull the x-axis caption out of a datum. */
  labelOf = (d) => d.label,
  /** Format a value for the readout (the axis always uses compactNumber). */
  format = (v) => compactNumber(v),
  /** Bars need a zero baseline or they misreport ratios; lines want headroom. */
  zeroBased = false,
  /** 'band' gives each datum a slot with a width; 'point' spans edge to edge. */
  xKind = 'band',
  /** Draw a vertical guide at the scrubbed point. */
  guide = true,
  empty = 'No data yet.',
  ariaLabel,
  children,
}) {
  const [ref, width] = useMeasure();
  const rows = data ?? [];

  const layout = useMemo(() => {
    if (!rows.length || width <= 0) return null;

    const values = rows.map(getValue);
    const [lo, hi] = padDomain(values, { zeroBased });
    const ticks = niceTicks(lo, hi);
    const left = gutterFor(ticks.length ? ticks : [hi]);

    const innerWidth = Math.max(0, width - left - RIGHT);
    const innerHeight = Math.max(0, height - TOP - BOTTOM);
    const yScale = scaleLinear({ domain: [lo, hi], range: [innerHeight, 0] });

    const indices = rows.map((_, i) => i);
    let xs;
    let bandWidth;
    if (xKind === 'band') {
      const x = scaleBand({ domain: indices, range: [0, innerWidth], padding: 0.34 });
      bandWidth = x.bandwidth();
      xs = indices.map((i) => x(i) + bandWidth / 2);
    } else {
      const x = scalePoint({ domain: indices, range: [0, innerWidth] });
      // A single point has no step; park it in the middle rather than at x=0.
      xs = indices.map((i) => (rows.length === 1 ? innerWidth / 2 : x(i)));
      bandWidth = rows.length > 1 ? innerWidth / (rows.length - 1) : innerWidth;
    }

    return { left, innerWidth, innerHeight, yScale, xs, bandWidth, ticks, values };
  }, [rows, width, height, getValue, zeroBased, xKind]);

  const { index, handlers } = useScrub(layout?.xs ?? []);
  const active = index != null && index < rows.length ? rows[index] : null;

  if (!rows.length) {
    return (
      <p className="py-6 text-center font-sans text-sm" style={{ color: 'var(--color-text-secondary)' }}>
        {empty}
      </p>
    );
  }

  // Two passes: the first render has no width, so reserve the height and let
  // the observer fill it in. Without this the section jumps as charts appear.
  if (!layout) return <div ref={ref} style={{ height }} />;

  const { left, innerWidth, innerHeight, yScale, xs, bandWidth, ticks } = layout;
  // Budget the x labels against the widest one actually present, rather than a
  // fixed slot size: "06-12" and "Week 12" do not need the same room.
  const widest = rows.reduce((n, r) => Math.max(n, String(labelOf(r)).length), 1);
  const labelSlots = Math.max(2, Math.floor(innerWidth / (widest * CHAR + LABEL_GAP)));
  const xTicks = tickIndices(rows.length, labelSlots);
  // Flip the readout to the far side so it never sits under the finger.
  const readoutRight = index != null && xs[index] < innerWidth / 2;

  return (
    <div ref={ref} className="relative" style={{ height }}>
      <svg
        width={width}
        height={height}
        role="img"
        aria-label={ariaLabel ?? `Chart, ${rows.length} points`}
        style={{ display: 'block', touchAction: 'pan-y' }}
      >
        <g transform={`translate(${left},${TOP})`}>
          {ticks.map((t) => (
            <line
              key={t}
              x1={0}
              x2={innerWidth}
              y1={yScale(t)}
              y2={yScale(t)}
              stroke="var(--color-ash)"
              strokeOpacity={0.16}
              strokeDasharray="2 5"
            />
          ))}

          {ticks.map((t) => (
            <text
              key={t}
              x={-7}
              y={yScale(t)}
              dy="0.32em"
              textAnchor="end"
              fontSize={AXIS_FONT}
              fontFamily="DM Mono, monospace"
              fill="var(--color-ash)"
            >
              {compactNumber(t)}
            </text>
          ))}

          {children({ innerWidth, innerHeight, yScale, xs, bandWidth, activeIndex: index })}

          {guide && index != null && (
            <line
              x1={xs[index]}
              x2={xs[index]}
              y1={0}
              y2={innerHeight}
              stroke="var(--color-gold)"
              strokeOpacity={0.5}
              strokeWidth={1}
            />
          )}

          {xTicks.map((i) => (
            <text
              key={i}
              x={xs[i]}
              y={innerHeight + 14}
              textAnchor={i === 0 ? 'start' : i === rows.length - 1 ? 'end' : 'middle'}
              fontSize={AXIS_FONT}
              fontFamily="DM Mono, monospace"
              fill={index === i ? 'var(--color-gold)' : 'var(--color-ash)'}
            >
              {labelOf(rows[i])}
            </text>
          ))}

          {/* Catches the drag. Last so nothing painted above it steals the
              pointer, and transparent so it never shows. */}
          <rect
            x={0}
            y={-TOP}
            width={innerWidth}
            height={innerHeight + TOP}
            fill="transparent"
            style={{ cursor: 'crosshair' }}
            {...handlers}
          />
        </g>
      </svg>

      {active && (
        <div
          className="glass glass-strong pointer-events-none absolute flex flex-col rounded-xl px-2.5 py-1.5"
          style={{
            top: 0,
            [readoutRight ? 'right' : 'left']: RIGHT,
            boxShadow: 'var(--elev-2)',
          }}
        >
          <span className="font-sans text-[10px] leading-none" style={{ color: 'var(--color-text-secondary)' }}>
            {labelOf(active)}
          </span>
          <span
            className="mt-1 font-mono text-sm font-semibold leading-none"
            style={{ color: 'var(--color-text-primary)' }}
          >
            {format(getValue(active))}
          </span>
        </div>
      )}
    </div>
  );
}
