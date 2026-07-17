// Share-card constants + pure formatters, shared by the web PWA and the native
// app so both render identical export cards. The card *layout* lives in each UI
// (html2canvas divs on web, react-native-view-shot views on native); only the
// palette + deterministic text formatting live here.

// Background themes offered in the share sheet (id, label, surface + text).
export const THEMES = [
  { id: 'slate', label: 'Slate', bg: '#2C2C2C', text: '#F7F5F2', sub: '#8A8780' },
  { id: 'obsidian', label: 'Black', bg: '#111010', text: '#F7F5F2', sub: '#8A8780' },
  { id: 'chalk', label: 'Light', bg: '#F7F5F2', text: '#1A1A1A', sub: '#8A8780' },
];

// Accent swatches — OPUS gold / ember / sage.
export const ACCENTS = [
  { id: 'gold', color: '#C9A84C' },
  { id: 'ember', color: '#D4622A' },
  { id: 'sage', color: '#6B8F71' },
];

export const DEFAULT_THEME = { ...THEMES[0], accent: ACCENTS[0].color };

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// "1h 05m" / "42m" — a workout duration in whole minutes/hours. Locale-free so
// web and native (and their tests) agree regardless of environment.
export function formatDuration(secs) {
  const m = Math.floor((secs ?? 0) / 60);
  const h = Math.floor(m / 60);
  return h > 0 ? `${h}h ${m % 60}m` : `${m}m`;
}

// "Jul 2, 2026" from a 'YYYY-MM-DD' (or ISO) string. Deterministic (no Intl)
// so a card looks the same on every device and in Node tests.
export function formatShareDate(iso) {
  if (!iso || typeof iso !== 'string') return '';
  const m = iso.slice(0, 10).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return '';
  const [, y, mm, dd] = m;
  const month = MONTHS[Number(mm) - 1];
  if (!month) return '';
  return `${month} ${Number(dd)}, ${y}`;
}

// Resolve a { themeIdx, accentIdx } selection to a full theme object.
export function resolveTheme(themeIdx = 0, accentIdx = 0) {
  const base = THEMES[themeIdx] ?? THEMES[0];
  const accent = (ACCENTS[accentIdx] ?? ACCENTS[0]).color;
  return { ...base, accent };
}
