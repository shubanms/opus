import { Suspense, lazy, useEffect, useState } from 'react';
import useSettingsStore from '../../store/settingsStore.js';
import useUserStore from '../../store/userStore.js';
import { sceneParams } from '../../utils/ambient.js';
import { getPrestige } from '../../utils/rpg.js';
import { useStreak } from '../../hooks/useStreak.js';

// Own chunk: the WebGL library must never be in the critical path of a PWA
// that has to open fast, and most of the time it isn't rendered at all.
const AuroraShader = lazy(() => import('./AuroraShader.jsx'));

/**
 * Is there a GPU worth running a full-screen shader on?
 *
 * Not just "does WebGL exist". Browsers fall back to a software rasteriser
 * (SwiftShader, llvmpipe) when the GPU is unavailable or blocklisted — common
 * on cheap Androids and in headless CI. WebGL still *works* there, but every
 * frame is rasterised on the CPU, which starves the main thread and makes the
 * app feel broken. Those devices get the CSS aurora instead, which costs
 * nothing and looks nearly the same.
 */
function hasUsableGPU() {
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

/**
 * The app's backdrop.
 *
 * The CSS aurora in tokens.css is always painted on `body` and is the floor:
 * it is what shows under a static frame, on a device without WebGL, and before
 * the shader chunk arrives. The shader layers on top only when every gate says
 * yes, so there is never a moment with no background.
 *
 * Gates, all of which must pass:
 *   - `effects` — the user's explicit setting.
 *   - `prefers-reduced-motion` — a full-screen moving gradient is exactly what
 *     that setting exists to stop.
 *   - `prefers-reduced-transparency` — same intent, different axis.
 *   - a real GPU — software rasterisers are excluded, see hasUsableGPU.
 * Plus the shader itself drops to zero speed whenever the tab is hidden.
 */
export default function AuroraBackdrop() {
  const effects = useSettingsStore((s) => s.effects);
  const theme = useSettingsStore((s) => s.theme);
  // Read the profile straight from the store rather than via useRPG: that hook
  // also *initialises* the profile, and a second initialiser mounting in the
  // same tick as AppLayout's raced the first into creating two rows.
  const profile = useUserStore((s) => s.profile);
  // Safe here for the same reason: useStreak reads the store directly and
  // initialises nothing.
  const streak = useStreak().count;

  const [allowed, setAllowed] = useState(false);
  const [dark, setDark] = useState(false);
  // The shader is decoration, and decoration must never compete with boot.
  // Compiling shaders and running a full-screen fragment pass while the app is
  // still opening the database delays first interaction — badly so on a device
  // falling back to software rendering. Wait for an idle frame first.
  const [idle, setIdle] = useState(false);

  useEffect(() => {
    const ric = window.requestIdleCallback;
    if (ric) {
      const id = ric(() => setIdle(true), { timeout: 2000 });
      return () => window.cancelIdleCallback?.(id);
    }
    const t = setTimeout(() => setIdle(true), 800);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const motion = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    const transparency = window.matchMedia?.('(prefers-reduced-transparency: reduce)');
    const evaluate = () =>
      setAllowed(!motion?.matches && !transparency?.matches && hasUsableGPU());
    evaluate();
    motion?.addEventListener?.('change', evaluate);
    transparency?.addEventListener?.('change', evaluate);
    return () => {
      motion?.removeEventListener?.('change', evaluate);
      transparency?.removeEventListener?.('change', evaluate);
    };
  }, []);

  // Read the resolved theme off <html> rather than the setting, so 'system'
  // resolves correctly and the shader follows an OS-level switch.
  useEffect(() => {
    const read = () => setDark(document.documentElement.dataset.theme === 'dark');
    read();
    const obs = new MutationObserver(read);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => obs.disconnect();
  }, [theme]);

  if (!effects || !allowed || !idle) return null;

  const scene = sceneParams({
    streak,
    level: profile?.level ?? 1,
    prestige: getPrestige(profile?.totalXp ?? 0),
  });

  return (
    <div
      aria-hidden="true"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: -1,
        pointerEvents: 'none',
        // Sits over the CSS aurora rather than replacing it, so the fallback is
        // always underneath and a slow chunk never shows a bare canvas.
        opacity: dark ? 0.85 : 0.6,
      }}
    >
      <Suspense fallback={null}>
        <AuroraShader
          dark={dark}
          speed={0.06 + scene.motionSpeed * 0.16}
          distortion={0.55 + scene.intensity * 0.5}
        />
      </Suspense>
    </div>
  );
}
