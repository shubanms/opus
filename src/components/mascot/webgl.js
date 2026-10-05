// Whether this device can draw Magnus at all.
//
// three.js throws "Error creating WebGL context" when it can't get one — GPU
// blocklisted, hardware acceleration off, a remote/virtual display, or the
// browser out of contexts — and an uncaught render error took the whole app
// down to the error screen, for the sake of a decorative robot. Asking first
// also means a device that can't show him never downloads three.js.
//
// The probe context is released straight away: browsers cap live WebGL
// contexts (≈16), and a leaked one would count against the real canvas.

let cached;

export function hasWebGL() {
  if (cached !== undefined) return cached;
  cached = false;
  try {
    if (typeof document === 'undefined' || typeof window === 'undefined') return cached;
    if (!window.WebGLRenderingContext) return cached;
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (gl) {
      cached = true;
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    }
  } catch {
    cached = false;
  }
  return cached;
}
