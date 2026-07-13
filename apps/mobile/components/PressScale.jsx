// Every tappable in OPUS presses in slightly (scale 0.96, the PWA's
// button:active), fires a light haptic, and optionally plays a sound cue — all
// gated by settings/reduced-motion. Use this instead of raw Pressable.
import { useRef } from 'react';
import { Animated, Pressable } from 'react-native';
import { tapLight } from '../native/haptics';
import { playCue } from '../native/sound';
import { motionOn } from '../native/settings';

export default function PressScale({ children, onPress, sound, style, disabled, hitSlop, to = 0.96 }) {
  const scale = useRef(new Animated.Value(1)).current;

  const animate = (v) => {
    if (!motionOn()) return;
    Animated.spring(scale, { toValue: v, useNativeDriver: true, speed: 40, bounciness: 6 }).start();
  };

  return (
    <Pressable
      disabled={disabled}
      hitSlop={hitSlop}
      onPressIn={() => animate(to)}
      onPressOut={() => animate(1)}
      onPress={(e) => {
        tapLight();
        if (sound) playCue(sound);
        onPress?.(e);
      }}
    >
      <Animated.View style={[{ transform: [{ scale }] }, style]}>{children}</Animated.View>
    </Pressable>
  );
}
