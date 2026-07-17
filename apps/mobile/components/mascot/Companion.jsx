// Magnus the companion — native port of the web Companion. Reuses the shared
// dialogue + gesture engine (@opus/core/mascot) and renders the 2D <Magnus/>
// with Animated gestures instead of a 3D model. Auto-greets on mount (first
// meet the very first time), does idle-break gestures on its own, and plays a
// hype line + gesture on tap. All motion gated by effects + reduce-motion.
import { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Animated, Easing } from 'react-native';
import { mascot } from '@opus/core';
import Magnus from './Magnus';
import { radius, space, fonts } from '../../theme';
import { useColors, useThemedStyles } from '../../native/ThemeProvider';
import { useSettings, motionOn } from '../../native/settings';
import { getTotals } from '../../native/db';
import { playCue } from '../../native/sound';
import { tapLight } from '../../native/haptics';

const { CLIP, MASCOT_NAME, pickLine, clipForKind, ambientClip } = mascot;

// Map a clip name to a whole-body Animated gesture (no articulated limbs in 2D).
function gestureSequence(anim, clip) {
  const spring = (to) => Animated.spring(anim, { toValue: to, useNativeDriver: true, friction: 4, tension: 90 });
  const timing = (to, dur) => Animated.timing(anim, { toValue: to, duration: dur, easing: Easing.out(Easing.quad), useNativeDriver: true });
  switch (clip) {
    case CLIP.jump: return Animated.sequence([timing(1, 160), spring(0)]);
    case CLIP.dance: // wiggle
    case CLIP.no:
      return Animated.sequence([timing(-1, 110), timing(1, 180), timing(-1, 180), spring(0)]);
    case CLIP.yes: // nod
      return Animated.sequence([timing(1, 130), timing(0, 130), timing(1, 130), spring(0)]);
    case CLIP.wave:
      return Animated.sequence([timing(1, 140), timing(-1, 220), spring(0)]);
    default: // cheer / flex / greet — a lively pop
      return Animated.sequence([spring(1), spring(0)]);
  }
}

// Turn the −1..1 gesture value into transforms that suit the current clip.
function transformFor(clip, anim) {
  if (clip === CLIP.jump) return [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [0, -22] }) }];
  if (clip === CLIP.dance || clip === CLIP.no || clip === CLIP.wave)
    return [{ rotate: anim.interpolate({ inputRange: [-1, 1], outputRange: ['-9deg', '9deg'] }) }];
  if (clip === CLIP.yes) return [{ scaleY: anim.interpolate({ inputRange: [0, 1], outputRange: [1, 0.86] }) }];
  return [{ scale: anim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.14] }) }];
}

export default function Companion({ autoGreet = true }) {
  const colors = useColors();
  const s = useThemedStyles(makeStyles);
  const { settings, update } = useSettings();

  const [line, setLine] = useState('');
  const [clip, setClip] = useState(CLIP.idle);
  const [blink, setBlink] = useState(false);
  const anim = useRef(new Animated.Value(0)).current; // per-gesture driver
  const bob = useRef(new Animated.Value(0)).current;   // continuous idle bob
  const hideRef = useRef();

  const play = useCallback((nextClip) => {
    if (!motionOn()) return;
    setClip(nextClip);
    anim.stopAnimation(() => { anim.setValue(0); gestureSequence(anim, nextClip).start(() => setClip(CLIP.idle)); });
  }, [anim]);

  const say = useCallback((kind) => {
    let streak = 0;
    try { streak = getTotals().streak || 0; } catch {}
    const hour = new Date().getHours();
    setLine(pickLine({ kind, streak, hour }));
    play(clipForKind(kind));
    clearTimeout(hideRef.current);
    hideRef.current = setTimeout(() => setLine(''), 5200);
  }, [play]);

  // Greeting on mount — first meet the very first time, then a normal greet.
  useEffect(() => {
    if (!autoGreet) return undefined;
    const met = settings.mascotMet;
    const t = setTimeout(() => { say(met ? 'greet' : 'firstMeet'); if (!met) update('mascotMet', true); }, 650);
    return () => { clearTimeout(t); clearTimeout(hideRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Continuous idle bob + occasional blink, only while motion is on.
  useEffect(() => {
    if (!motionOn()) return undefined;
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(bob, { toValue: 1, duration: 1600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(bob, { toValue: 0, duration: 1600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ]));
    loop.start();
    const blinkTimer = setInterval(() => { setBlink(true); setTimeout(() => setBlink(false), 130); }, 4200);
    return () => { loop.stop(); clearInterval(blinkTimer); };
  }, [bob]);

  // Idle-break: every 9–15s Magnus does a little gesture on his own.
  useEffect(() => {
    if (!motionOn()) return undefined;
    let timer;
    const loop = () => { timer = setTimeout(() => { play(ambientClip()); loop(); }, 9000 + Math.random() * 6000); };
    loop();
    return () => clearTimeout(timer);
  }, [play]);

  const onTap = useCallback(() => {
    tapLight();
    playCue('success');
    say('hype');
  }, [say]);

  const bobY = bob.interpolate({ inputRange: [0, 1], outputRange: [0, -6] });

  return (
    <View style={s.wrap} pointerEvents="box-none">
      <View style={[s.bubble, { opacity: line ? 1 : 0 }]} pointerEvents="none">
        <Text style={s.bubbleText}>
          <Text style={s.name}>{MASCOT_NAME}: </Text>{line}
        </Text>
      </View>
      <Pressable onPress={onTap} accessibilityLabel={`Talk to ${MASCOT_NAME}`} hitSlop={8}>
        <Animated.View style={{ transform: [{ translateY: bobY }, ...transformFor(clip, anim)] }}>
          <Magnus size={150} blink={blink} />
        </Animated.View>
      </Pressable>
    </View>
  );
}

const makeStyles = (colors) => StyleSheet.create({
  wrap: { alignItems: 'center', marginBottom: space(3) },
  bubble: { maxWidth: 280, backgroundColor: colors.obsidian, borderColor: colors.gold, borderWidth: 1, borderRadius: radius.xl, paddingHorizontal: space(4), paddingVertical: space(2), marginBottom: space(2) },
  bubbleText: { color: colors.textInverse, fontFamily: fonts.sans, fontSize: 12, lineHeight: 17, textAlign: 'center' },
  name: { color: colors.gold, fontFamily: fonts.sansSemi },
});
