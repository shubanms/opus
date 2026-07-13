// Bento stat tile — accent icon + count-up mono value + small label, on a
// chalk/ivory rounded card. The PWA's KpiTile/StatTile.
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import CountUp from './fx/CountUp';
import { Label } from '../ui';
import { colors, radius, space, fonts } from '../theme';

export default function StatTile({ icon, value, label, accent = colors.gold, suffix = '', format, countUp = true, style }) {
  return (
    <View style={[s.tile, style]}>
      {icon ? <Ionicons name={icon} size={15} color={accent} style={{ marginBottom: 6 }} /> : null}
      {countUp ? (
        <CountUp value={value} suffix={suffix} format={format} style={[s.value, { color: accent }]} />
      ) : (
        <Label style={[s.value, { color: accent, fontFamily: fonts.mono, textTransform: 'none', letterSpacing: 0 }]}>{value}{suffix}</Label>
      )}
      <Label style={s.label}>{label}</Label>
    </View>
  );
}

const s = StyleSheet.create({
  tile: { flex: 1, backgroundColor: colors.chalk, borderColor: colors.ivory, borderWidth: 1, borderRadius: radius.lg, paddingVertical: space(4), paddingHorizontal: space(3), alignItems: 'center' },
  value: { fontFamily: fonts.mono, fontSize: 20 },
  label: { marginTop: 4, fontSize: 10, letterSpacing: 1 },
});
