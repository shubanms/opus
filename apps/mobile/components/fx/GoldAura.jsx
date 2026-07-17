// The living gold aura that breathes behind the Home hero (ports the PWA's
// radial-gradient + anim-breathe). A blurred gold radial via react-native-svg,
// slowly pulsing opacity/scale. Static (dim) when motion is off.
import { useEffect, useRef } from 'react';
import { Animated, View } from 'react-native';
import Svg, { Defs, RadialGradient, Stop, Circle } from 'react-native-svg';
import { motionOn } from '../../native/settings';

const AView = Animated.createAnimatedComponent(View);

export default function GoldAura({ size = 320, intensity = 0.5, speed = 0.5 }) {
  const t = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!motionOn()) return;
    // Livelier progression → faster breathe (mirrors the web (7 - speed*3)s).
    const half = Math.round((7 - Math.max(0, Math.min(1, speed)) * 3) * 500);
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(t, { toValue: 1, duration: half, useNativeDriver: true }),
        Animated.timing(t, { toValue: 0, duration: half, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [speed]);

  const opacity = motionOn() ? t.interpolate({ inputRange: [0, 1], outputRange: [0.55, 1] }) : 0.7;
  const scale = motionOn() ? t.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] }) : 1;

  return (
    <AView
      pointerEvents="none"
      style={{
        position: 'absolute',
        alignSelf: 'center',
        top: -size * 0.28,
        width: size,
        height: size,
        opacity,
        transform: [{ scale }],
      }}
    >
      <Svg width={size} height={size}>
        <Defs>
          <RadialGradient id="aura" cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor="#C9A84C" stopOpacity={intensity} />
            <Stop offset="45%" stopColor="#C9A84C" stopOpacity={intensity * 0.35} />
            <Stop offset="72%" stopColor="#C9A84C" stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Circle cx={size / 2} cy={size / 2} r={size / 2} fill="url(#aura)" />
      </Svg>
    </AView>
  );
}
