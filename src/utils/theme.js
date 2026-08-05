// Resolves 'system' to the OS preference; applies the theme to <html> and the
// browser status-bar colour. Guarded so it's safe to import outside the browser.
export function resolveTheme(theme) {
  if (theme === 'system') {
    return typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light';
  }
  return theme === 'dark' ? 'dark' : 'light';
}

let animTimer;

export function applyTheme(theme) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  const resolved = resolveTheme(theme);
  const changed = root.dataset.theme && root.dataset.theme !== resolved;

  // Cross-fade the palette only while it's actually changing. The colour
  // transition is a per-element paint cost, so it must not stay on permanently.
  if (changed) {
    root.dataset.themeAnim = '';
    clearTimeout(animTimer);
    animTimer = setTimeout(() => {
      delete root.dataset.themeAnim;
    }, 400);
  }

  root.dataset.theme = resolved;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', resolved === 'dark' ? '#0b1020' : '#f4f6fd');
}
