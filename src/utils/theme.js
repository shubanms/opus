// Ink is dark-first (HANDOFF 8 and 14.1): there is one palette. `applyTheme`
// stamps data-theme='dark' and the status-bar colour; the old light/dark/system
// choice is gone. `Sky` (dawn | dusk | night | auto) changes the scenery and is
// stamped on <html data-sky> for the backdrop and Home to read.
// Guarded so it is safe to import outside the browser.

export const SKIES = ['auto', 'dawn', 'dusk', 'night'];
export const THEME_COLOR = '#100E0C';

/** 'auto' follows the local clock: dawn 05-11, dusk 11-19, night otherwise. */
export function resolveSky(sky, date = new Date()) {
  if (sky === 'dawn' || sky === 'dusk' || sky === 'night') return sky;
  const h = date.getHours();
  if (h >= 5 && h < 11) return 'dawn';
  if (h >= 11 && h < 19) return 'dusk';
  return 'night';
}

export function applyTheme() {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.dataset.theme = 'dark';
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', THEME_COLOR);
}

export function applySky(sky) {
  if (typeof document === 'undefined') return;
  document.documentElement.dataset.sky = resolveSky(sky);
}
