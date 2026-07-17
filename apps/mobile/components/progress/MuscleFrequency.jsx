// Muscle-focus bars — working sets per muscle group, coloured by region. Ports
// the web MuscleFrequency (pure views, no chart lib). data = [{muscle, sets}].
import { View, Text, StyleSheet } from 'react-native';
import { Label } from '../../ui';
import { radius, space, fonts } from '../../theme';
import { useColors, useThemedStyles } from '../../native/ThemeProvider';
import Card from '../Card';

const MUSCLE_HUE = {
  chest: '#D4622A', triceps: '#D4622A', 'front-deltoids': '#D4622A',
  biceps: '#C9A84C', forearm: '#C9A84C', abs: '#C9A84C', obliques: '#C9A84C',
  'upper-back': '#6B8F71', 'lower-back': '#6B8F71', trapezius: '#6B8F71', 'back-deltoids': '#6B8F71',
  quadriceps: '#8A8780', hamstring: '#8A8780', gluteal: '#8A8780', calves: '#8A8780',
};

export default function MuscleFrequency({ data = [] }) {
  const colors = useColors();
  const s = useThemedStyles(makeStyles);
  const max = data.reduce((m, d) => Math.max(m, d.sets || 0), 0) || 1;

  return (
    <Card>
      <Label>Muscle focus</Label>
      {data.length === 0 ? (
        <Text style={s.empty}>Train a few sessions to see your balance.</Text>
      ) : (
        <View style={{ marginTop: space(3), gap: space(2) }}>
          {data.map((d) => {
            const hue = MUSCLE_HUE[d.muscle] ?? '#8A8780';
            return (
              <View key={d.muscle} style={s.row}>
                <Text style={s.name} numberOfLines={1}>{String(d.muscle).replace(/-/g, ' ')}</Text>
                <View style={s.track}>
                  <View style={[s.fill, { width: `${((d.sets || 0) / max) * 100}%`, backgroundColor: hue }]} />
                </View>
                <Text style={s.count}>{d.sets}</Text>
              </View>
            );
          })}
        </View>
      )}
    </Card>
  );
}

const makeStyles = (colors) => StyleSheet.create({
  empty: { marginTop: space(2), color: colors.textSecondary, fontFamily: fonts.sans, fontSize: 13 },
  row: { flexDirection: 'row', alignItems: 'center', gap: space(3) },
  name: { width: 96, color: colors.textSecondary, fontFamily: fonts.sans, fontSize: 12, textTransform: 'capitalize' },
  track: { flex: 1, height: 10, borderRadius: radius.full, backgroundColor: colors.ivory, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: radius.full },
  count: { width: 26, textAlign: 'right', color: colors.textPrimary, fontFamily: fonts.mono, fontSize: 12 },
});
