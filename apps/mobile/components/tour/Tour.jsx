// First-run guided tour — an 8-step full-screen overlay shown once after
// onboarding (gated on the `tourSeen` setting). Ports the web Tour. Sets
// `tourSeen` on finish; "Open Settings" also jumps to the Settings tab.
import { useRef, useState } from 'react';
import { Modal, View, Text, StyleSheet, Animated } from 'react-native';
import Icon from '../Icon';
import { H1, Body } from '../../ui';
import { space, fonts } from '../../theme';
import { useColors, useThemedStyles } from '../../native/ThemeProvider';
import { useSettings, motionOn } from '../../native/settings';
import PressScale from '../PressScale';
import { GoldButton, SecondaryButton } from '../Button';
import GoldAura from '../fx/GoldAura';

const STEPS = [
  { icon: 'barbell', title: 'Log your workouts', body: 'Tap the center ➕ to start. Add exercises, log sets with the plate calculator, RPE and a rest timer — your session saves automatically.' },
  { icon: 'trending-up', title: 'Level up', body: 'Every set earns XP. Climb from First Rep to Magnum Opus, unlock prestige, and clear fresh weekly quests.' },
  { icon: 'trophy', title: 'Unlock achievements', body: 'Earn trophies as you train — some are hidden. Find them all on your Profile.' },
  { icon: 'book', title: 'Your exercise library', body: 'Browse every lift, favourite the ones you love, colour-code them, and keep coaching notes.' },
  { icon: 'calendar', title: 'Routines & planning', body: 'Build reusable routines with target sets and reps, and start them any day.' },
  { icon: 'activity', title: 'Track recovery & progress', body: 'See muscle recovery, log steps & water, and watch your volume, PRs and 1RM climb.' },
  { icon: 'share', title: 'Show it off', body: 'Share workout, profile, weekly-recap and Wrapped cards straight to your friends.' },
  { icon: 'palette', title: 'Make it yours', body: 'Sound, animations, dark mode and units all live in Settings. Replay this tour anytime.' },
];

export default function Tour({ navigation, onDone }) {
  const colors = useColors();
  const s = useThemedStyles(makeStyles);
  const { update } = useSettings();
  const [i, setI] = useState(0);
  const fade = useRef(new Animated.Value(1)).current;

  const step = STEPS[i];
  const last = i === STEPS.length - 1;

  const finish = (goSettings) => {
    update('tourSeen', true);
    onDone?.();
    if (goSettings) navigation?.navigate('Settings');
  };

  const go = (delta) => {
    if (!motionOn()) { setI((n) => n + delta); return; }
    Animated.timing(fade, { toValue: 0, duration: 120, useNativeDriver: true }).start(() => {
      setI((n) => n + delta);
      Animated.timing(fade, { toValue: 1, duration: 180, useNativeDriver: true }).start();
    });
  };

  return (
    <Modal visible transparent animationType="fade" onRequestClose={() => finish(false)}>
      <View style={s.backdrop}>
        <GoldAura size={300} intensity={0.4} speed={0.4} />
        <PressScale hitSlop={10} onPress={() => finish(false)} style={s.skip}>
          <Text style={s.skipText}>Skip</Text>
        </PressScale>

        <Animated.View style={[s.body, { opacity: fade }]}>
          <View style={s.iconCircle}>
            <Icon name={step.icon} size={34} color={colors.obsidian} />
          </View>
          <H1 style={s.title}>{step.title}</H1>
          <Body style={s.copy}>{step.body}</Body>
        </Animated.View>

        <View style={s.dots}>
          {STEPS.map((_, n) => (
            <View key={n} style={[s.dot, n === i ? s.dotActive : null]} />
          ))}
        </View>

        <View style={s.controls}>
          {i > 0 && !last && <SecondaryButton label="Back" onPress={() => go(-1)} style={{ flex: 1 }} />}
          {last ? (
            <>
              <SecondaryButton label="Not now" onPress={() => finish(false)} style={{ flex: 1 }} />
              <GoldButton label="Open Settings" icon="settings" onPress={() => finish(true)} style={{ flex: 1 }} />
            </>
          ) : (
            <GoldButton label="Next" icon="chevron-forward" sound="tap" onPress={() => go(1)} style={{ flex: i > 0 ? 1 : undefined, minWidth: 140 }} />
          )}
        </View>
      </View>
    </Modal>
  );
}

const makeStyles = (colors) => StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: colors.obsidian, alignItems: 'center', justifyContent: 'center', padding: space(6) },
  skip: { position: 'absolute', top: space(12), right: space(6) },
  skipText: { color: colors.ash, fontFamily: fonts.sansMedium, fontSize: 14 },
  body: { alignItems: 'center', maxWidth: 340 },
  iconCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: colors.gold, alignItems: 'center', justifyContent: 'center', marginBottom: space(5) },
  title: { color: colors.textInverse, textAlign: 'center' },
  copy: { color: colors.ash, textAlign: 'center', marginTop: space(3), fontSize: 15, lineHeight: 22 },
  dots: { flexDirection: 'row', gap: space(2), marginTop: space(8), marginBottom: space(6) },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.stone },
  dotActive: { width: 20, backgroundColor: colors.gold },
  controls: { flexDirection: 'row', gap: space(3), alignSelf: 'stretch', justifyContent: 'center' },
});
