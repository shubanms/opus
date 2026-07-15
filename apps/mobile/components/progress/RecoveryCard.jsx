// Muscle recovery — days since each muscle group was last trained, most
// neglected first. Ports the PWA RecoveryMap as a compact list (no body-map
// dependency). Ember = trained today, gold = 1d, sage = 2d, neutral = rested.
import { View, Text, StyleSheet } from 'react-native';
import { Label, Body } from '../../ui';
import { radius, space, fonts } from '../../theme';
import { useColors, useThemedStyles } from '../../native/ThemeProvider';
import Card from '../Card';
import { useDbQuery } from '../../native/useDbQuery';
import { getMuscleRecovery } from '../../native/db';

function tone(days, colors) {
  if (days == null) return { c: colors.ash, t: 'Rested' };
  if (days <= 0) return { c: colors.ember, t: 'Today' };
  if (days === 1) return { c: colors.gold, t: '1d ago' };
  if (days === 2) return { c: colors.sage, t: '2d ago' };
  return { c: colors.ash, t: `${days}d ago` };
}

export default function RecoveryCard() {
  const colors = useColors();
  const s = useThemedStyles(makeStyles);
  const rows = useDbQuery(() => getMuscleRecovery(), [], []);
  if (!rows || rows.length === 0) return null;

  return (
    <Card>
      <Label>Muscle recovery</Label>
      <View style={{ marginTop: space(3), gap: space(2) }}>
        {rows.map((r) => {
          const { c, t } = tone(r.daysSince, colors);
          return (
            <View key={r.muscle} style={s.row}>
              <View style={[s.dot, { backgroundColor: c }]} />
              <Text style={s.muscle} numberOfLines={1}>{(r.muscle || '').replace(/-/g, ' ')}</Text>
              <Text style={[s.days, { color: c }]}>{t}</Text>
            </View>
          );
        })}
      </View>
    </Card>
  );
}

const makeStyles = (colors) => StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space(3) },
  dot: { width: 10, height: 10, borderRadius: 5 },
  muscle: { flex: 1, color: colors.textPrimary, fontFamily: fonts.sansMedium, fontSize: 14, textTransform: 'capitalize' },
  days: { fontFamily: fonts.mono, fontSize: 13 },
});
