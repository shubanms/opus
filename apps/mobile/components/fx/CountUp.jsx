// Odometer number — eases 0→value over ~900ms with cubic ease-out (ports the
// PWA CountUp). Renders DM Mono text. Respects reduced-motion (shows final).
import { useEffect, useRef, useState } from 'react';
import { Text } from 'react-native';
import { motionOn } from '../../native/settings';
import { fonts } from '../../theme';
import { useColors, useThemedStyles } from '../../native/ThemeProvider';

export default function CountUp({ value = 0, duration = 900, format, style, suffix = '' }) {
  const colors = useColors();
  const [display, setDisplay] = useState(motionOn() ? 0 : value);
  const raf = useRef(null);
  const fromRef = useRef(0);

  useEffect(() => {
    if (!motionOn()) {
      setDisplay(value);
      return;
    }
    const from = fromRef.current;
    const start = global.performance?.now?.() ?? null;
    let startTs = null;
    const target = Number(value) || 0;

    const tick = (ts) => {
      if (startTs == null) startTs = start ?? ts;
      const p = Math.min(1, (ts - startTs) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(from + (target - from) * eased);
      if (p < 1) raf.current = requestAnimationFrame(tick);
      else fromRef.current = target;
    };
    raf.current = requestAnimationFrame(tick);
    return () => raf.current && cancelAnimationFrame(raf.current);
  }, [value, duration]);

  const n = Math.round(display);
  const text = (format ? format(n) : n.toLocaleString()) + suffix;
  return <Text style={[{ fontFamily: fonts.mono, color: colors.textPrimary }, style]}>{text}</Text>;
}
