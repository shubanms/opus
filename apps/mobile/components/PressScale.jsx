// Every tappable in OPUS presses in slightly (scale 0.96, the PWA's
// button:active), fires a light haptic, and optionally plays a sound cue — all
// gated by settings/reduced-motion. Use this instead of raw Pressable.
//
// The incoming `style` (including layout like flex:1) goes on the Pressable
// itself via an Animated Pressable, so flex/width behave correctly — a plain
// inner Animated.View would swallow flex and collapse rows (e.g. segmented
// controls) to their text width.
import { useRef } from 'react';
import { Animated, Pressable } from 'react-native';
import { tapLight } from '../native/haptics';
import { playCue } from '../native/sound';
import { motionOn } from '../native/settings';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export default function PressScale({ children, onPress, sound, style, disabled, hitSlop, to = 0.96 }) {
  const scale = useRef(new Animated.Value(1)).current;

  const animate = (v) => {
    if (!motionOn()) return;
    Animated.spring(scale, { toValue: v, useNativeDriver: true, speed: 40, bounciness: 6 }).start();
  };

  return (
    <AnimatedPressable
      disabled={disabled}
      hitSlop={hitSlop}
      onPressIn={() => animate(to)}
      onPressOut={() => animate(1)}
      onPress={(e) => {
        tapLight();
        if (sound) playCue(sound);
        onPress?.(e);
      }}
      style={[style, { transform: [{ scale }] }]}
    >
      {children}
    </AnimatedPressable>
  );
}
