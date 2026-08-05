import { LazyMotion, MotionConfig } from 'motion/react';
import useSettingsStore from '../store/settingsStore.js';

// Fetched as its own chunk once the app has painted — see features.js.
const loadFeatures = () => import('./features.js').then((mod) => mod.default);

export { m, AnimatePresence, useReducedMotion } from 'motion/react';
export * from './spec.js';

/**
 * Whether motion should actually move things.
 *
 * Two independent gates, per the project's standing rule:
 *   - `settingsStore.effects` — the user's explicit choice.
 *   - `prefers-reduced-motion` — handled by MotionConfig below, which maps it to
 *     "animate opacity, never transforms".
 *
 * Components call this when they need to branch structurally (skip a drag
 * gesture, render a static frame). For plain animations they don't need to:
 * MotionProvider already neutralises them.
 */
export function useMotionEnabled() {
  return useSettingsStore((s) => s.effects);
}

/**
 * App-wide motion setup.
 *
 * `LazyMotion` loads the feature bundle lazily and `strict` forbids the full
 * `motion.*` components, so nothing can accidentally pull the whole library
 * back into the main chunk. This is a PWA — bundle size is a feature.
 *
 * `reducedMotion="user"` makes every transform animation a no-op when the OS
 * asks for reduced motion, while leaving opacity alone — so the app still reads
 * as responsive without moving anything.
 *
 * When `effects` is off we pass a zero-duration transition rather than stripping
 * the components out: the tree stays identical, so toggling the setting can't
 * remount half the app mid-session.
 */
export default function MotionProvider({ children }) {
  const effects = useSettingsStore((s) => s.effects);
  return (
    <LazyMotion features={loadFeatures} strict>
      <MotionConfig
        reducedMotion="user"
        transition={effects ? undefined : { duration: 0 }}
      >
        {children}
      </MotionConfig>
    </LazyMotion>
  );
}
