// Canvas 2D drawing primitives for the share cards.
//
// Replaces html2canvas, which re-implements a CSS renderer in JS and therefore
// supports only what its authors ported — no backdrop-filter, no modern colour
// functions, no WebGL. Drawing straight to a canvas gives exact control and,
// crucially, uses the page's already-loaded webfonts natively.
//
// Layout/format maths lives in `cardLayout.js` (pure + tested); this module is
// the thin browser-API layer.

export const FONT = {
  display: "'Cormorant Garamond', Georgia, serif",
  sans: "'DM Sans', system-ui, sans-serif",
  mono: "'DM Mono', ui-monospace, monospace",
};

// The exact faces the cards draw with. `document.fonts.load` resolves per
// family+weight+style, so one representative size per face is enough.
const FONT_SPECS = [
  `700 100px ${FONT.display}`,
  `600 40px ${FONT.display}`,
  `italic 600 36px ${FONT.display}`,
  `500 60px ${FONT.mono}`,
  `400 28px ${FONT.mono}`,
  `600 30px ${FONT.sans}`,
  `500 26px ${FONT.sans}`,
  `400 26px ${FONT.sans}`,
];

/**
 * Make sure every face a card uses is loaded before we draw. Canvas silently
 * falls back to a default font for a face that has not loaded yet, so skipping
 * this produces a card in the wrong typeface with no error.
 */
export async function ensureFonts() {
  if (typeof document === 'undefined' || !document.fonts) return;
  await Promise.all(
    FONT_SPECS.map((spec) => document.fonts.load(spec).catch(() => {}))
  );
  try {
    await document.fonts.ready;
  } catch {
    /* nothing to wait on */
  }
}

export function fontSpec({ family = FONT.sans, size = 16, weight = 400, italic = false }) {
  return `${italic ? 'italic ' : ''}${weight} ${size}px ${family}`;
}

/** Width of `text` including manual letter-spacing. */
export function measureText(ctx, text, opts = {}) {
  const { tracking = 0 } = opts;
  ctx.font = fontSpec(opts);
  const str = String(text ?? '');
  const base = ctx.measureText(str).width;
  return str.length > 1 ? base + tracking * (str.length - 1) : base;
}

/**
 * Draw text. Letter-spacing is applied by hand rather than via `ctx.letterSpacing`,
 * which is not supported everywhere and would silently render untracked.
 * Returns the width drawn.
 */
export function drawText(ctx, text, opts = {}) {
  const {
    x = 0,
    y = 0,
    color = '#000',
    align = 'left',
    baseline = 'top',
    tracking = 0,
    alpha = 1,
  } = opts;
  const str = String(text ?? '');
  if (!str) return 0;

  ctx.save();
  ctx.font = fontSpec(opts);
  ctx.fillStyle = color;
  ctx.textBaseline = baseline;
  ctx.globalAlpha = alpha;

  const width = measureText(ctx, str, opts);

  if (!tracking) {
    ctx.textAlign = align;
    ctx.fillText(str, x, y);
    ctx.restore();
    return width;
  }

  // Tracked text is drawn glyph by glyph, so alignment is resolved up front.
  ctx.textAlign = 'left';
  let cursor = align === 'right' ? x - width : align === 'center' ? x - width / 2 : x;
  for (const ch of str) {
    ctx.fillText(ch, cursor, y);
    cursor += ctx.measureText(ch).width + tracking;
  }
  ctx.restore();
  return width;
}

export function roundRectPath(ctx, x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

export function fillRoundRect(ctx, x, y, w, h, r, color, alpha = 1) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  roundRectPath(ctx, x, y, w, h, r);
  ctx.fill();
  ctx.restore();
}

/** Outlined circle with a filled core — the OPUS logo mark. */
export function drawLogoMark(ctx, cx, cy, radius, color, lineWidth = 4) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(cx, cy, radius * 0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** Small rotated square — one prestige pip. */
export function drawDiamond(ctx, cx, cy, size, color) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(Math.PI / 4);
  ctx.fillStyle = color;
  ctx.fillRect(-size / 2, -size / 2, size, size);
  ctx.restore();
}

/** The accent divider: a solid bar fading out to the right. */
export function drawFadeRule(ctx, x, y, width, height, color) {
  const grad = ctx.createLinearGradient(x, y, x + width, y);
  grad.addColorStop(0, color);
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.save();
  ctx.fillStyle = grad;
  ctx.fillRect(x, y, width, height);
  ctx.restore();
}

/**
 * Rounded pill with centred label. `filled` pills use the accent as background,
 * outlined ones draw a border instead. Returns the pill's total width.
 */
export function drawPill(ctx, text, opts) {
  const {
    x,
    y,
    label = text,
    size = 30,
    weight = 600,
    family = FONT.sans,
    padX = 32,
    height = 68,
    fill,
    border,
    color,
  } = opts;
  const textWidth = measureText(ctx, label, { size, weight, family });
  const width = textWidth + padX * 2;

  if (fill) {
    fillRoundRect(ctx, x, y, width, height, height / 2, fill);
  }
  if (border) {
    ctx.save();
    ctx.strokeStyle = border;
    ctx.lineWidth = 2;
    roundRectPath(ctx, x + 1, y + 1, width - 2, height - 2, (height - 2) / 2);
    ctx.stroke();
    ctx.restore();
  }

  drawText(ctx, label, {
    x: x + width / 2,
    y: y + height / 2,
    size,
    weight,
    family,
    color,
    align: 'center',
    baseline: 'middle',
  });
  return width;
}

/** A fresh, correctly-sized backing canvas. */
export function createCanvas(size) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  return canvas;
}

export function canvasToBlob(canvas, type = 'image/png') {
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), type));
}
