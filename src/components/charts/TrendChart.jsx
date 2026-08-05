import { useId } from 'react';
import { AreaClosed, LinePath } from '@visx/shape';
import { curveMonotoneX } from '@visx/curve';
import ChartFrame from './ChartFrame.jsx';
import { m, TWEEN, useMotionEnabled, useReducedMotion } from '../../motion/index.jsx';
import { compactNumber } from '../../utils/chartMath.js';

// A trend over time: 1RM, max weight, body weight, sleep, steps, water.
//
// The line strokes through the accent gradient and the fill fades out beneath
// it, so the chart belongs to the same material as the rest of the app rather
// than being a default-blue plot dropped into it. The last point keeps a
// permanent marker — on a progress chart "where am I now" is the question
// being asked, and it should be answerable without touching anything.

const getValue = (d) => d.value;

export default function TrendChart({ data, unit = '', empty = 'No data yet.' }) {
  const gradientId = useId();
  const fillId = `${gradientId}-fill`;
  const strokeId = `${gradientId}-stroke`;
  const effects = useMotionEnabled();
  const reduced = useReducedMotion();
  const animate = effects && !reduced;

  const format = (v) => `${compactNumber(v)}${unit ? ` ${unit}` : ''}`;

  return (
    <ChartFrame
      data={data}
      getValue={getValue}
      format={format}
      xKind="point"
      empty={empty}
      ariaLabel={
        data?.length
          ? `Trend chart, ${data.length} points, from ${format(getValue(data[0]))} to ${format(
              getValue(data[data.length - 1])
            )}`
          : empty
      }
    >
      {({ innerWidth, innerHeight, yScale, xs, activeIndex }) => {
        const x = (_d, i) => xs[i];
        const y = (d) => yScale(getValue(d));

        return (
          <>
            <defs>
              <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--color-gold)" stopOpacity={0.34} />
                <stop offset="100%" stopColor="var(--color-gold)" stopOpacity={0} />
              </linearGradient>
              <linearGradient id={strokeId} x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="var(--color-gold)" />
                <stop offset="100%" stopColor="var(--color-sage)" />
              </linearGradient>
            </defs>

            <AreaClosed
              data={data}
              x={x}
              y={y}
              yScale={yScale}
              curve={curveMonotoneX}
              width={innerWidth}
            >
              {({ path }) => (
                <m.path
                  d={path(data) || ''}
                  fill={`url(#${fillId})`}
                  initial={animate ? { opacity: 0 } : false}
                  animate={{ opacity: 1 }}
                  transition={{ ...TWEEN.enter, delay: 0.25 }}
                />
              )}
            </AreaClosed>

            <LinePath data={data} x={x} y={y} curve={curveMonotoneX}>
              {({ path }) => (
                <m.path
                  d={path(data) || ''}
                  fill="none"
                  stroke={`url(#${strokeId})`}
                  strokeWidth={2.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  initial={animate ? { pathLength: 0 } : false}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.85, ease: [0.22, 1, 0.36, 1] }}
                />
              )}
            </LinePath>

            {/* "You are here". Sits under the scrub marker so the two never
                stack into a lumpy double dot. */}
            {data.length > 0 && activeIndex !== data.length - 1 && (
              <circle
                cx={xs[data.length - 1]}
                cy={y(data[data.length - 1])}
                r={3.5}
                fill="var(--color-sage)"
                stroke="var(--color-chalk)"
                strokeWidth={2}
              />
            )}

            {activeIndex != null && (
              <circle
                cx={xs[activeIndex]}
                cy={y(data[activeIndex])}
                r={5}
                fill="var(--color-gold)"
                stroke="var(--color-chalk)"
                strokeWidth={2.5}
              />
            )}

            {/* Keeps the plot area a fixed box for the scrub overlay to sit in
                even when the line hugs one edge. */}
            <rect x={0} y={0} width={innerWidth} height={innerHeight} fill="none" />
          </>
        );
      }}
    </ChartFrame>
  );
}
