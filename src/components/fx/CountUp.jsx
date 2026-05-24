import { useState, useEffect, useRef } from 'react';

// Animated odometer that eases from 0 → value on mount / value change.
export default function CountUp({ value = 0, duration = 900, format = (n) => Math.round(n).toLocaleString(), className, style }) {
  const [n, setN] = useState(0);
  const raf = useRef();

  useEffect(() => {
    const start = performance.now();
    cancelAnimationFrame(raf.current);
    const tick = (t) => {
      const p = Math.min((t - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setN(value * eased);
      if (p < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [value, duration]);

  return <span className={className} style={style}>{format(n)}</span>;
}
