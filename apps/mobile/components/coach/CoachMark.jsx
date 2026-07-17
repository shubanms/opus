// Per-tab first-visit coaching tip — a small pill floating above the tab bar,
// shown after the tour is done until dismissed per tab. Ports the web CoachMark.
// `route` is the focused tab name; dismissal is stored in `coachMarksSeen`.
import { View, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from '../Icon';
import { radius, space, fonts } from '../../theme';
import { useColors, useThemedStyles } from '../../native/ThemeProvider';
import { useSettings } from '../../native/settings';
import PressScale from '../PressScale';

const TIPS = {
  Home: 'This is your base — streak, level, today\'s plan and your week at a glance.',
  Progress: 'Charts live here: switch between Overview, By-Exercise and Body.',
  Workout: 'Tap ➕ to start. Add exercises, then log each set — everything saves itself.',
  Exercises: 'Tap any lift for its records and charts, or ＋ to add your own.',
  Profile: 'Your character sheet — level, radar, achievements, records and Wrapped.',
};

export default function CoachMark({ route }) {
  const colors = useColors();
  const s = useThemedStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const { settings, update } = useSettings();
  const seen = settings.coachMarksSeen || {};
  const tip = TIPS[route];

  if (!tip || seen[route]) return null;

  return (
    <View style={[s.wrap, { bottom: 60 + insets.bottom + 16 }]} pointerEvents="box-none">
      <View style={s.pill}>
        <View style={s.bulb}><Icon name="bulb" size={16} color={colors.obsidian} /></View>
        <Text style={s.tip}>{tip}</Text>
        <PressScale sound="tap" onPress={() => update('coachMarksSeen', { ...seen, [route]: true })} style={s.gotIt}>
          <Text style={s.gotItText}>Got it</Text>
        </PressScale>
      </View>
    </View>
  );
}

const makeStyles = (colors) => StyleSheet.create({
  wrap: { position: 'absolute', left: space(4), right: space(4), alignItems: 'center' },
  pill: { flexDirection: 'row', alignItems: 'center', gap: space(3), backgroundColor: colors.obsidian, borderColor: colors.gold, borderWidth: 1, borderRadius: radius.xl, paddingHorizontal: space(4), paddingVertical: space(3) },
  bulb: { width: 30, height: 30, borderRadius: 15, backgroundColor: colors.gold, alignItems: 'center', justifyContent: 'center' },
  tip: { flex: 1, color: colors.textInverse, fontFamily: fonts.sans, fontSize: 12, lineHeight: 17 },
  gotIt: { backgroundColor: colors.gold, borderRadius: radius.md, paddingHorizontal: space(3), paddingVertical: space(2) },
  gotItText: { color: colors.obsidian, fontFamily: fonts.sansSemi, fontSize: 12 },
});
