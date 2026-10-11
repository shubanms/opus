/**
 * Shared "is it worth running heavy visuals" gates.
 *
 * Browsers fall back to a software rasteriser (SwiftShader, llvmpipe) when the
 * GPU is unavailable or blocklisted. WebGL still works there, but every frame
 * is rasterised on the CPU and starves the main thread. Anything GPU-heavy
 * (the 3D stage) must check these first.
 */
export function hasUsableGPU() {
  if (typeof document === 'undefined') return false;
  try {
    const c = document.createElement('canvas');
    const gl = c.getContext('webgl2') || c.getContext('webgl');
    if (!gl) return false;
    const info = gl.getExtension('WEBGL_debug_renderer_info');
    const renderer = String(
      info ? gl.getParameter(info.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER)
    ).toLowerCase();
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return !/swiftshader|llvmpipe|software|basic render|microsoft basic/.test(renderer);
  } catch {
    return false;
  }
}

const QUERIES = ['(prefers-reduced-motion: reduce)', '(prefers-reduced-transparency: reduce)'];

/** True when the OS asks for less motion or less transparency. */
export function prefersReducedEffects() {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return QUERIES.some((q) => window.matchMedia(q).matches);
}

/** Subscribe to changes of the motion/transparency preference. Returns unsubscribe. */
export function watchReducedEffects(cb) {
  if (typeof window === 'undefined' || !window.matchMedia) return () => {};
  const mqs = QUERIES.map((q) => window.matchMedia(q));
  const fn = () => cb(prefersReducedEffects());
  mqs.forEach((q) => q.addEventListener?.('change', fn));
  return () => mqs.forEach((q) => q.removeEventListener?.('change', fn));
}

/** Full gate for GPU-heavy visuals: a real GPU and no reduced-effects preference. */
export function canRunHeavyFx() {
  return !prefersReducedEffects() && hasUsableGPU();
}
