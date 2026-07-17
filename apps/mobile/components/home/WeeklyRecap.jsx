// "Your week so far" — a dark recap card on Home with this week's Sessions /
// Volume / PRs / XP and the top lift. Ports the web WeeklyRecap. Self-hides when
// there's no data this week or the current week was dismissed.
import { View, Text, StyleSheet } from 'react-native';
import { units } from '@opus/core';
import Icon from '../Icon';
import { Label } from '../../ui';
import { radius, space, fonts } from '../../theme';
import { useColors, useThemedStyles } from '../../native/ThemeProvider';
import { useSettings } from '../../native/settings';
import { useDbQuery } from '../../native/useDbQuery';
import { getWeeklyRecap } from '../../native/db';
import PressScale from '../PressScale';
import CountUp from '../fx/CountUp';

function Stat({ value, label, suffix, accent }) {
  const colors = useColors();
  const s = useThemedStyles(makeStyles);
  return (
    <View style={s.stat}>
      <CountUp value={value} suffix={suffix} style={[s.statVal, accent && { color: colors.gold }]} />
      <Text style={s.statLabel}>{label}</Text>
    </View>
  );
}

export default function WeeklyRecap() {
  const colors = useColors();
  const s = useThemedStyles(makeStyles);
  const { settings, update } = useSettings();
  const unit = settings.unit || 'kg';
  const recap = useDbQuery(() => getWeeklyRecap(), [], { hasData: false });

  if (!recap.hasData) return null;
  if (settings.recapDismissedWeek === recap.weekKey) return null;

  return (
    <View style={s.card}>
      <View style={s.head}>
        <Label style={{ color: colors.gold }}>Your week so far</Label>
        <PressScale hitSlop={10} onPress={() => update('recapDismissedWeek', recap.weekKey)}>
          <Icon name="close" size={16} color={colors.ash} />
        </PressScale>
      </View>
      <View style={s.grid}>
        <Stat value={recap.sessions} label="Sessions" />
        <Stat value={Math.round(units.toDisplay(recap.volumeKg, unit))} label={`Vol ${units.unitLabel(unit)}`} />
        <Stat value={recap.prCount} label="PRs" accent={recap.prCount > 0} />
        <Stat value={recap.xp} label="XP" accent />
      </View>
      {!!recap.topLift && (
        <View style={s.topRow}>
          <Icon name="barbell" size={14} color={colors.gold} />
          <Text style={s.topText}>Top lift · {recap.topLift}</Text>
        </View>
      )}
    </View>
  );
}

const makeStyles = (colors) => StyleSheet.create({
  card: { backgroundColor: colors.obsidian, borderColor: colors.stone, borderWidth: 1, borderRadius: radius.xl, padding: space(4) },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  grid: { flexDirection: 'row', marginTop: space(3) },
  stat: { flex: 1 },
  statVal: { color: colors.textInverse, fontFamily: fonts.mono, fontSize: 22 },
  statLabel: { color: colors.ash, fontFamily: fonts.sans, fontSize: 11, marginTop: 2 },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: space(2), marginTop: space(3) },
  topText: { color: colors.textInverse, fontFamily: fonts.sansMedium, fontSize: 13 },
});
