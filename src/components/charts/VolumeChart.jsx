import ChartFrame from './ChartFrame.jsx';
import { m, useMotionEnabled, useReducedMotion } from '../../motion/index.jsx';
import { preciseNumber, roundedTopRect } from '../../utils/chartMath.js';

// Tonnage per week or per session, and calories on the same footing.
//
// Brush bars (HANDOFF 8.5): rounded tops under the ink-brush-fine filter. Past
// weeks sit in #B5AC9C, the newest bar is vermilion.
const PAST = '#B5AC9C';

const getValue = (d) => d.volume;
const MAX_STAGGER = 0.28;
const MAX_BAR = 22;
const MIN_BAR = 8;

export default function VolumeChart({ data, unit = 'kg', empty = 'Log this exercise to see volume trends.' }) {
  const effects = useMotionEnabled();
  const reduced = useReducedMotion();
  const animate = effects && !reduced;

  const format = (v) => `${preciseNumber(v)} ${unit}`;

  return (
    <ChartFrame
      data={data}
      getValue={getValue}
      format={format}
      zeroBased
      bare
      height={130}
      guide={false}
      empty={empty}
      ariaLabel={data?.length ? `Volume chart, ${data.length} bars, in ${unit}` : empty}
    >
      {({ innerWidth, innerHeight, yScale, xs, bandWidth, activeIndex }) => {
        // `zeroBased` guarantees the domain reaches 0, so this is the axis.
        const baseline = yScale(0);
        const width = Math.min(bandWidth, MAX_BAR);
        const step = Math.min(0.04, MAX_STAGGER / Math.max(1, data.length));

        // Position is what identifies a bar in a fixed-order series, but the
        // label alone is not unique — "03-14" recurs once an exercise has more
        // than a year of history — so the key carries both.
        const bars = data.map((d, i) => {
          const top = yScale(getValue(d));
          const h = Math.max(MIN_BAR, Math.abs(baseline - top));
          return {
            key: `${d.label}#${i}`,
            empty: !(getValue(d) > 0),
            d: roundedTopRect(xs[i] - width / 2, baseline - h, width, h),
            current: i === data.length - 1,
            dimmed: activeIndex != null && activeIndex !== i,
            delay: animate ? i * step : 0,
          };
        });

        return (
          <>
            {bars.map((bar) => (
              <m.path
                key={bar.key}
                d={bar.d}
                fill={bar.current ? 'var(--ver)' : PAST}
                filter="url(#ink-brush-fine)"
                // Grown from the baseline rather than scaled about its middle:
                // fill-box puts the origin on the bar's own bounding box.
                style={{ transformBox: 'fill-box', transformOrigin: '50% 100%' }}
                initial={animate ? { scaleY: 0 } : false}
                // Dimmed, not erased. Anything below ~0.4 disappears entirely
                // against the light theme's near-white ground, which loses the
                // shape of the series you are scrubbing through.
                animate={{ scaleY: 1, opacity: bar.dimmed ? 0.45 : bar.empty ? 0.4 : 1 }}
                transition={{
                  scaleY: { duration: 0.5, ease: [0.22, 1, 0.36, 1], delay: bar.delay },
                  opacity: { duration: 0.14 },
                }}
              />
            ))}

            {activeIndex != null && (
              <line
                x1={xs[activeIndex]}
                x2={xs[activeIndex]}
                y1={yScale(getValue(data[activeIndex]))}
                y2={baseline}
                stroke="var(--ver)"
                strokeWidth={1.5}
                strokeOpacity={0.7}
              />
            )}

            <rect x={0} y={0} width={innerWidth} height={innerHeight} fill="none" />
          </>
        );
      }}
    </ChartFrame>
  );
}
