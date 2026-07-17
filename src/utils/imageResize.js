// Pure sizing math for progress-photo downscaling. The actual canvas draw lives
// in photoActions.js (DOM-only, not node-testable); this fit calc is the pure,
// tested core so thumbnails/stored blobs stay bounded and cheap.

// Scale (w×h) to fit inside a max square, preserving aspect ratio. Never
// upscales — a small image is returned unchanged (rounded to whole pixels).
export function fitDimensions(w, h, max = 1080) {
  if (!w || !h || w <= 0 || h <= 0) return { w: 0, h: 0 };
  const scale = Math.min(1, max / Math.max(w, h));
  return { w: Math.round(w * scale), h: Math.round(h * scale) };
}
