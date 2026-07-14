// Bento stat tile — accent icon + count-up mono value + small label, on a
// chalk/ivory rounded card. The PWA's KpiTile/StatTile.
import { View, StyleSheet } from 'react-native';
import Icon from './Icon';
import CountUp from './fx/CountUp';
import { Label } from '../ui';
import { colors, radius, space, fonts } from '../theme';

// Compact number: 0–999 as-is, 1000+ as "1k", "12k" (one decimal under 10k).
function compactNum(n) {
  const v = Math.round(n);
  if (v < 1000) return String(v);
  const k = v / 1000;
  return `${k < 10 ? Math.round(k * 10) / 10 : Math.round(k)}k`;
}

export default function StatTile({ icon, value, label, accent = colors.gold, suffix = '', format, compact = false, countUp = true, style }) {
  const fmt = compact ? compactNum : format;
  return (
    <View style={[s.tile, style]}>
      {icon ? <Icon name={icon} size={15} color={accent} style={{ marginBottom: 6 }} /> : null}
      {countUp ? (
        <CountUp value={value} suffix={compact ? '' : suffix} format={fmt} style={[s.value, { color: accent }]} />
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
