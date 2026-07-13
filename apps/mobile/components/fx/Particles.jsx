// One-shot celebration burst — gold/ember/chalk/sage dots fly outward from a
// point and fade (ports the PWA Particles). Mount it (e.g. keyed by a counter)
// to fire; it self-cleans. Gated by reduced-motion.
import { useEffect, useRef } from 'react';
import { Animated, View, StyleSheet, Easing } from 'react-native';
import { motionOn } from '../../native/settings';

const COLORS = ['#C9A84C', '#D4622A', '#F7F5F2', '#6B8F71'];
const COUNT = 20;

export default function Particles({ origin = { x: 0, y: 0 }, spread = 130 }) {
  if (!motionOn()) return null;
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {Array.from({ length: COUNT }).map((_, i) => (
        <Bit key={i} index={i} origin={origin} spread={spread} />
      ))}
    </View>
  );
}

function Bit({ index, origin, spread }) {
  const t = useRef(new Animated.Value(0)).current;
  // Deterministic pseudo-random from index (no Math.random in this env).
  const ang = (index / COUNT) * Math.PI * 2 + (index % 3) * 0.4;
  const dist = spread * (0.5 + ((index * 37) % 100) / 160);
  const tx = Math.cos(ang) * dist;
  const ty = Math.sin(ang) * dist;
  const size = 6 + ((index * 13) % 8);
  const color = COLORS[index % COLORS.length];

  useEffect(() => {
    Animated.timing(t, {
      toValue: 1,
      duration: 620 + (index % 5) * 70,
      delay: (index % 4) * 30,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, []);

  const translateX = t.interpolate({ inputRange: [0, 1], outputRange: [0, tx] });
  const translateY = t.interpolate({ inputRange: [0, 1], outputRange: [0, ty] });
  const opacity = t.interpolate({ inputRange: [0, 0.7, 1], outputRange: [1, 1, 0] });
  const scale = t.interpolate({ inputRange: [0, 1], outputRange: [1, 0.3] });

  return (
    <Animated.View
      style={{
        position: 'absolute',
        left: origin.x,
        top: origin.y,
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: color,
        opacity,
        transform: [{ translateX }, { translateY }, { scale }],
      }}
    />
  );
}
