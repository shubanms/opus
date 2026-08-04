// Pure layout + formatting math for the 1080×1080 share cards.
//
// Everything here is deterministic and free of canvas/DOM APIs so it can be
// unit-tested. The drawing primitives live in `canvasKit.js` and the card
// compositions in `shareCards.js`.

export const CARD = {
  size: 1080,
  pad: 88,
  get inner() {
    return this.size - this.pad * 2;
  },
};

export const THEMES = [
  { id: 'slate', label: 'Slate', bg: '#2C2C2C', text: '#F7F5F2', sub: '#8A8780' },
  { id: 'obsidian', label: 'Black', bg: '#111010', text: '#F7F5F2', sub: '#8A8780' },
  { id: 'chalk', label: 'Light', bg: '#F7F5F2', text: '#1A1A1A', sub: '#8A8780' },
];

export const ACCENTS = [
  { id: 'gold', color: '#C9A84C' },
  { id: 'ember', color: '#D4622A' },
  { id: 'sage', color: '#6B8F71' },
];

export const DEFAULT_THEME = { ...THEMES[0], accent: ACCENTS[0].color };

/** Resolve a {theme,accent} id pair to a full theme, falling back to defaults. */
export function resolveTheme(themeId, accentId) {
  const t = THEMES.find((x) => x.id === themeId) ?? THEMES[0];
  const a = ACCENTS.find((x) => x.id === accentId) ?? ACCENTS[0];
  return { ...t, accent: a.color };
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * Date for a share card. Deliberately locale-free: a poster should look the
 * same whoever exports it, and `toLocaleDateString` varies per device.
 */
export function formatShareDate(iso) {
  if (!iso) return '';
  const d = iso instanceof Date ? iso : new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

/** Seconds → "1h 5m" / "45m". */
export function formatDuration(secs) {
  const m = Math.floor((secs ?? 0) / 60);
  const h = Math.floor(m / 60);
  return h > 0 ? `${h}h ${m % 60}m` : `${m}m`;
}

/**
 * Thousands separator, locale-free for the same reason as `formatShareDate`.
 * Non-finite input renders as "0" rather than "NaN" on someone's poster.
 */
export function groupNumber(n) {
  const num = Number(n);
  if (!Number.isFinite(num)) return '0';
  const rounded = Math.round(num);
  const sign = rounded < 0 ? '-' : '';
  const digits = Math.abs(rounded).toString();
  return sign + digits.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

export function pluralize(n, singular, plural = `${singular}s`) {
  return n === 1 ? singular : plural;
}

/** Evenly split a row into `count` columns; returns left x of each. */
export function columns(count, x = CARD.pad, width = CARD.inner) {
  if (count <= 0) return [];
  const w = width / count;
  return Array.from({ length: count }, (_, i) => ({ x: x + i * w, width: w }));
}

/**
 * Largest font size (stepping down from `max`) at which `text` fits `maxWidth`.
 * `measure(size)` returns the rendered width at that size — injected so this
 * stays pure and testable.
 */
export function fitFontSize({ measure, maxWidth, max, min = 12, step = 2 }) {
  let size = max;
  while (size > min && measure(size) > maxWidth) size -= step;
  return Math.max(min, size);
}

/**
 * Truncate `text` with an ellipsis so it fits `maxWidth`.
 * `measure(str)` returns the rendered width of that string.
 */
export function truncateToWidth({ measure, text, maxWidth, ellipsis = '…' }) {
  const str = String(text ?? '');
  if (!str || measure(str) <= maxWidth) return str;
  let lo = 0;
  let hi = str.length;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    if (measure(str.slice(0, mid) + ellipsis) <= maxWidth) lo = mid;
    else hi = mid - 1;
  }
  return lo > 0 ? str.slice(0, lo) + ellipsis : ellipsis;
}

/**
 * Geometry for the Wrapped sparkline. Bars are bottom-aligned in the band and
 * fade with their relative height, matching the previous DOM version.
 */
export function sparkBars(series, { x, y, width, height, gap = 6, minHeight = 6 }) {
  const vals = (series ?? []).filter((v) => Number.isFinite(v));
  if (vals.length < 2) return [];
  const peak = Math.max(...vals, 0) || 1;
  const barW = (width - gap * (vals.length - 1)) / vals.length;
  return vals.map((v, i) => {
    const ratio = Math.max(0, v) / peak;
    const h = Math.max(minHeight, ratio * height);
    return {
      x: x + i * (barW + gap),
      y: y + height - h,
      width: barW,
      height: h,
      alpha: 0.55 + 0.45 * ratio,
    };
  });
}

/** "chest-upper · back" → "chest upper · back", capped at `max` entries. */
export function muscleLine(muscles, max = 4) {
  return (muscles ?? [])
    .slice(0, max)
    .map((m) => String(m).replace(/-/g, ' '))
    .join('  ·  ');
}
