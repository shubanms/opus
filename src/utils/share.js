// Share-card rendering and delivery.
//
// Cards are drawn directly to a canvas (see `shareCards.js`). The previous
// implementation captured off-screen DOM with html2canvas, which cannot render
// backdrop-filter, modern colour functions, filters, or WebGL — it silently
// produced a flat or blank card for anything it did not implement.

import { CARD, DEFAULT_THEME } from './cardLayout.js';
import { canvasToBlob, createCanvas, ensureFonts } from './canvasKit.js';
import { CARD_RENDERERS } from './shareCards.js';

/**
 * Render a card to a canvas at full 1080×1080.
 * Waits for the webfonts first — canvas silently substitutes a fallback font
 * for any face that has not loaded, with no error to catch.
 */
export async function renderCard(kind, data, theme = DEFAULT_THEME) {
  const draw = CARD_RENDERERS[kind];
  if (!draw) throw new Error(`Unknown share card: ${kind}`);

  await ensureFonts();
  const canvas = createCanvas(CARD.size);
  const ctx = canvas.getContext('2d');
  draw(ctx, data, theme);
  return canvas;
}

/** Paint a card into an existing canvas element (used for the live preview). */
export async function paintCard(canvas, kind, data, theme = DEFAULT_THEME) {
  const draw = CARD_RENDERERS[kind];
  if (!canvas || !draw) return;

  await ensureFonts();
  canvas.width = CARD.size;
  canvas.height = CARD.size;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, CARD.size, CARD.size);
  draw(ctx, data, theme);
}

/**
 * Share a rendered canvas via the Web Share API, falling back to a download
 * when file sharing isn't available.
 */
export async function shareCanvas(canvas, filename = 'opus-card.png') {
  const blob = await canvasToBlob(canvas);
  if (!blob) return;
  const file = new File([blob], filename, { type: 'image/png' });

  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: 'OPUS', text: 'Build your masterpiece.' });
      return;
    } catch (e) {
      if (e?.name === 'AbortError') return; // user dismissed the sheet
      // otherwise fall through to download
    }
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** Render `kind` and hand it to the share sheet in one step. */
export async function shareCard(kind, data, theme, filename = 'opus-card.png') {
  const canvas = await renderCard(kind, data, theme);
  await shareCanvas(canvas, filename);
}
