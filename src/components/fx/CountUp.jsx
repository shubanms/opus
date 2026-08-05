import { useEffect, useState } from 'react';
import { animate, useReducedMotion } from 'motion/react';
import { TWEEN, useMotionEnabled } from '../../motion/index.jsx';

/**
 * Odometer that counts from 0 → value on mount and on change.
 *
 * Honours both motion gates: with `effects` off or reduced-motion requested it
 * renders the final figure immediately. It previously animated regardless,
 * which is the one thing a reduced-motion user has explicitly asked not to
 * happen — and a counting number is exactly the kind of movement that causes
 * vestibular discomfort.
 */
export default function CountUp({
  value = 0,
  /**
   * Where to count from. Defaults to zero, but a record is a story about the
   * number it beat — starting at the old record lets you watch it get passed.
   */
  from = 0,
  duration = 0.9,
  format = (n) => Math.round(n).toLocaleString(),
  className,
  style,
}) {
  const motionOn = useMotionEnabled();
  const reduced = useReducedMotion();
  const animateIt = motionOn && !reduced;
  const [n, setN] = useState(animateIt ? from : value);

  useEffect(() => {
    if (!animateIt) {
      setN(value);
      return undefined;
    }
    const controls = animate(from, value, {
      duration,
      ease: TWEEN.enter.ease,
      onUpdate: setN,
    });
    return () => controls.stop();
  }, [value, from, duration, animateIt]);

  return (
    <span className={className} style={style}>
      {format(n)}
    </span>
  );
}
