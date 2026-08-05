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
import { chromium } from '@playwright/test';

const OUT = new URL('../public/', import.meta.url).pathname;

const draw = (size) => `
  const c = document.createElement('canvas');
  c.width = ${size}; c.height = ${size};
  const x = c.getContext('2d');
  const S = ${size};

  // Ground: deep slate with an aurora wash, matching the app canvas.
  x.fillStyle = '#0b1020';
  x.fillRect(0, 0, S, S);
  const g1 = x.createRadialGradient(S * 0.82, S * 0.04, 0, S * 0.82, S * 0.04, S * 0.85);
  g1.addColorStop(0, 'rgba(139,125,255,0.55)'); g1.addColorStop(1, 'rgba(139,125,255,0)');
  x.fillStyle = g1; x.fillRect(0, 0, S, S);
  const g2 = x.createRadialGradient(S * 0.1, S * 0.9, 0, S * 0.1, S * 0.9, S * 0.8);
  g2.addColorStop(0, 'rgba(79,216,196,0.4)'); g2.addColorStop(1, 'rgba(79,216,196,0)');
  x.fillStyle = g2; x.fillRect(0, 0, S, S);

  // The monogram, inside the maskable safe zone.
  const R = S * 0.27;
  const w = S * 0.075;
  x.translate(S / 2, S / 2);
  x.rotate(-Math.PI / 2);
  const ring = x.createConicGradient(0, 0, 0);
  ring.addColorStop(0, '#8b7dff');
  ring.addColorStop(0.5, '#4fd8c4');
  ring.addColorStop(1, '#8b7dff');
  x.strokeStyle = ring; x.lineWidth = w; x.lineCap = 'round';
  x.beginPath(); x.arc(0, 0, R, 0, Math.PI * 2); x.stroke();

  // Specular arc, frozen at the angle the animated mark passes through.
  x.strokeStyle = '#c4bcff'; x.lineWidth = w * 0.9;
  x.beginPath(); x.arc(0, 0, R, 0.6, 1.1); x.stroke();

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
