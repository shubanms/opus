// Geometry and formatting for the chart layer.
//
// Everything a chart needs to decide *before* it draws lives here: where the
// gridlines go, how much headroom the domain gets, which x labels survive on a
// narrow phone, where a radar vertex lands. Keeping it pure means the awkward
// cases — a flat series, a single point, an empty array — are pinned by tests
// instead of discovered on a device.

const TAU = Math.PI * 2;

/** Round away float accumulation error without changing meaningful precision. */
function tidy(n) {
  return Math.abs(n) < 1e-10 ? 0 : Number(n.toPrecision(12));
}

// d3's step thresholds. They round the ideal step to the nearest 1/2/5/10 ×
// power of ten rather than flooring it, which lands nearer the requested tick
// count — flooring turns "give me 3 lines across 0–100" into 2.
const E10 = Math.sqrt(50);
const E5 = Math.sqrt(10);
const E2 = Math.sqrt(2);

/**
 * Gridline values that land on human numbers (10, 25, 500) rather than
 * wherever an even division of the domain happens to fall (13.7, 27.4).
 *
 * `count` is a target, not a promise: the whole point is to trade the exact
 * number of lines for readable ones. Returns an empty array if the domain is
 * degenerate, so callers can simply not draw a grid.
 */
export function niceTicks(min, max, count = 3) {
  if (!Number.isFinite(min) || !Number.isFinite(max) || max <= min || count < 1) return [];

  const rawStep = (max - min) / count;
  const magnitude = 10 ** Math.floor(Math.log10(rawStep));
  const normalized = rawStep / magnitude;
  const step = (normalized >= E10 ? 10 : normalized >= E5 ? 5 : normalized >= E2 ? 2 : 1) * magnitude;

  const first = Math.ceil(min / step) * step;
  const out = [];
  // Multiply rather than accumulate: `v += step` drifts visibly by the 20th tick.
  for (let i = 0; ; i += 1) {
    const v = tidy(first + i * step);
    if (v > max + step * 1e-9) break;
    out.push(v);
  }
  return out;
}

/**
 * The [min, max] a series should be plotted against.
 *
 * A trend line wants headroom on both ends so the peak isn't welded to the top
 * edge; a bar chart wants to start at zero or the bars lie about their ratios
 * (`zeroBased`). A flat series has no span to pad, so it gets an arbitrary one
 * — otherwise every point sits on a single line at the top of the frame.
 */
export function padDomain(values, { zeroBased = false, pad = 0.12 } = {}) {
  const nums = (values ?? []).filter((v) => Number.isFinite(v));
  if (nums.length === 0) return [0, 1];

  let lo = Math.min(...nums);
  let hi = Math.max(...nums);

  if (lo === hi) {
    // A single value, or a genuinely flat run. Centre it in the frame.
    const spread = Math.abs(lo) * 0.15 || 1;
    lo -= spread;
    hi += spread;
  } else {
    const headroom = (hi - lo) * pad;
    lo -= headroom;
    hi += headroom;
  }

  if (zeroBased) lo = Math.min(0, Math.min(...nums));
  // Never let a non-negative series dip below zero just from padding: negative
  // reps or negative kilos are nonsense, and the axis label would say so.
  else if (Math.min(...nums) >= 0) lo = Math.max(0, lo);

  return [tidy(lo), tidy(hi)];
}

/** Axis label for a value: 1240 → "1.2k", 2_400_000 → "2.4M". */
export function compactNumber(n) {
  if (!Number.isFinite(n)) return '';
  const abs = Math.abs(n);
  if (abs >= 1e6) return `${trimZero(n / 1e6)}M`;
  if (abs >= 1e4) return `${Math.round(n / 1e3)}k`;
  if (abs >= 1e3) return `${trimZero(n / 1e3)}k`;
  if (abs >= 100 || Number.isInteger(n)) return String(Math.round(n));
  return String(tidy(Math.round(n * 10) / 10));
}

function trimZero(n) {
  const s = n.toFixed(1);
  return s.endsWith('.0') ? s.slice(0, -2) : s;
}

/**
 * Index of the position nearest `x` — the scrub hit test.
 *
 * Linear because these series are tens of points, not thousands; a binary
 * search would be the same wall-clock and more to get wrong.
 */
export function nearestIndex(positions, x) {
  if (!positions?.length) return null;
  let best = 0;
  let bestDist = Math.abs(positions[0] - x);
  for (let i = 1; i < positions.length; i += 1) {
    const d = Math.abs(positions[i] - x);
    if (d < bestDist) {
      bestDist = d;
      best = i;
    }
  }
  return best;
}

/**
 * Which x labels to actually draw, given room for `max` of them.
 *
 * Charting libraries default to drawing every category label and letting them
 * collide — which is exactly how a phone-width chart ends up with a smear of
 * overlapping dates. Always keeps the first and last, so the axis still says
 * what range you're looking at.
 *
 * Spacing is a fixed stride, not `max` evenly-spread fractions: spreading and
 * rounding lands adjacent indices next to each other (10 points into 7 slots
 * gives 0,2,3,5,6,8,9 — and 2 and 3 are one bar apart, which is the collision
 * this function exists to prevent).
 */
export function tickIndices(count, max = 5) {
  if (count <= 0) return [];
  if (count === 1) return [0];
  if (count <= max) return Array.from({ length: count }, (_, i) => i);

  const stride = Math.ceil(count / Math.max(2, max));
  const out = [];
  for (let i = 0; i < count; i += stride) out.push(i);

  const last = count - 1;
  const tail = out[out.length - 1];
  // Pull the final label onto the last point rather than appending it — the
  // remainder is shorter than a stride, so appending is the collision again.
  if (tail !== last) {
    if (last - tail < stride) out[out.length - 1] = last;
    else out.push(last);
  }
  return out;
}

/**
 * Where vertex `i` of an `n`-sided radar sits, relative to the centre.
 *
 * Slot 0 is at 12 o'clock and slots run clockwise, so the axis order reads the
 * way the labels are listed. `value` is clamped into [0, maxValue] — a stat
 * that overshoots its cap should sit on the rim, not outside the chart.
 */
export function radarPoint(i, n, value, maxValue, radius) {
  const angle = -Math.PI / 2 + (TAU * i) / Math.max(1, n);
  const safeMax = maxValue > 0 ? maxValue : 1;
  const ratio = Math.max(0, Math.min(Number.isFinite(value) ? value / safeMax : 0, 1));
  const r = radius * ratio;
  return { x: tidy(Math.cos(angle) * r), y: tidy(Math.sin(angle) * r), angle };
}

/**
 * A bar: square where it meets the baseline, rounded where it ends.
 *
 * `rx` on a `<rect>` rounds all four corners, which lifts a bar off its own
 * axis. The radius is clamped against both dimensions so short bars — a light
 * week next to a heavy one — round proportionally instead of turning into
 * lozenges or inverting the curve.
 */
export function roundedTopRect(x, y, width, height, radius = 5) {
  const w = Math.max(0, width);
  const h = Math.max(0, height);
  if (w === 0 || h === 0) return '';
  const r = Math.max(0, Math.min(radius, w / 2, h));
  const [l, t, right, bottom] = [tidy(x), tidy(y), tidy(x + w), tidy(y + h)];
  return (
    `M${l},${bottom}` +
    `L${l},${tidy(t + r)}` +
    `Q${l},${t} ${tidy(l + r)},${t}` +
    `L${tidy(right - r)},${t}` +
    `Q${right},${t} ${right},${tidy(t + r)}` +
    `L${right},${bottom}Z`
  );
}

/** An SVG path through points, closed. `[]` yields '' so React renders nothing. */
export function polygonPath(points) {
  if (!points?.length) return '';
  return `${points.map((p, i) => `${i === 0 ? 'M' : 'L'}${tidy(p.x)},${tidy(p.y)}`).join('')}Z`;
}

/**
 * Text anchoring for a radar axis label at `angle`.
 *
 * Labels left of the centre must end at their anchor and labels right of it
 * must start there, or long words ("Consistency") reach across the chart.
 */
export function radialAnchor(angle) {
  const cos = Math.cos(angle);
  if (cos > 0.25) return 'start';
  if (cos < -0.25) return 'end';
  return 'middle';
}
