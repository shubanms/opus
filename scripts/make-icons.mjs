/**
 * Generates the PWA icons from the same monogram the app draws in-product.
 *
 * Rendered with headless Chromium rather than checked in as hand-made art, so
 * the icon can never drift from the palette: change the tokens here and re-run.
 *
 *   node scripts/make-icons.mjs
 *
 * Maskable-safe: Android crops a maskable icon to a shape that can eat the
 * outer ~20%, so the mark sits inside the inner 60% and the ground bleeds to
 * the edges.
 */
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const OUT = fileURLToPath(new URL('../public/', import.meta.url));

const draw = (size) => `
  const c = document.createElement('canvas');
  c.width = ${size}; c.height = ${size};
  const x = c.getContext('2d');
  const S = ${size};

  // Ground: sumi, flat.
  x.fillStyle = '#100E0C';
  x.fillRect(0, 0, S, S);

  // Brush enso with a vermilion sun disc, inside the maskable safe zone.
  const R = S * 0.27;
  const w = S * 0.075;
  x.translate(S / 2, S / 2);
  x.rotate(-Math.PI / 2);
  x.fillStyle = '#C8361F';
  x.beginPath(); x.arc(0, 0, R * 0.36, 0, Math.PI * 2); x.fill();
  x.strokeStyle = '#EEE6D6'; x.lineCap = 'round';
  const gap = Math.PI / 6 + 0.5, span = Math.PI * 2 - 0.5, N = 48;
  for (let i = 0; i < N; i++) {
    const f = i / N;
    x.lineWidth = w * (0.45 + 0.95 * Math.sin(Math.PI * Math.pow(f, 0.6)) * (1 - f * 0.35));
    x.beginPath(); x.arc(0, 0, R, gap + f * span, gap + Math.min((i + 1.4) / N, 1) * span); x.stroke();
  }

  return c.toDataURL('image/png');
`;

const browser = await chromium.launch({
  executablePath: process.env.PW_CHROMIUM_PATH || undefined,
});
const page = await browser.newPage();
await page.setContent('<!doctype html><body></body>');

for (const size of [192, 512]) {
  const dataUrl = await page.evaluate(new Function(draw(size)));
  writeFileSync(`${OUT}icon-${size}.png`, Buffer.from(dataUrl.split(',')[1], 'base64'));
  console.log(`icon-${size}.png`);
}

await browser.close();
