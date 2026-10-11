import { useReducedMotion, useMotionEnabled } from '../../motion/index.jsx';

/** True when loops and transform animations may run (effects on, OS motion not reduced). */
export default function useInkMotion() {
  const effects = useMotionEnabled();
  const reduced = useReducedMotion();
  return Boolean(effects) && !reduced;
}
