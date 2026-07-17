// Plate calculator — given a target weight and the configured barbell, shows
// the plates to load PER SIDE as colored chips. Reuses @opus/core plateCalc so
// web and native agree. Weights are kg (the app's internal unit).
import { View, Text, StyleSheet } from 'react-native';
import { plateCalc, inventory } from '@opus/core';
import { Label, Mono } from '../../ui';
import { radius, space, fonts } from '../../theme';
import { useColors, useThemedStyles } from '../../native/ThemeProvider';
import { getSetting } from '../../native/settings';

// Plate → chip color (roughly the calibrated-plate convention, warm-toned).
const PLATE_COLOR = {
  25: '#D4622A', 20: '#3B6FB0', 15: '#C9A84C', 10: '#6B8F71',
  5: '#8A8780', 2.5: '#2C2C2C', 1.25: '#8A8780',
};

export default function PlateCalculator({ weight }) {
  const colors = useColors();
  const s = useThemedStyles(makeStyles);
  // Use the active equipment location's bar + owned plates (falls back to the
  // global barWeight + the standard kg set).
  const invData = getSetting('inventory') || {};
  const loc = invData[invData.active] || {};
  const bar = loc.barKg ?? (Number(getSetting('barWeight')) || 20);
  const plates = inventory.effectivePlates(loc, 'kg', plateCalc.PLATES_KG);
  const target = Number(weight) || 0;
  if (target <= bar) return null;

  const perSide = plateCalc.calcPlates(target, bar, plates);
  const loadable = plateCalc.nearestLoadable(target, bar, plates);
  const off = Math.abs(loadable - target) > 0.01;

  return (
    <View style={s.wrap}>
      <View style={s.head}>
        <Label>Per side · {bar} kg bar</Label>
        {off && <Label style={{ color: colors.ember }}>≈ {loadable} kg loadable</Label>}
      </View>
      {perSide.length === 0 ? (
        <Text style={s.empty}>Just the bar.</Text>
      ) : (
        <View style={s.chips}>
          {perSide.map(({ kg, count }) => (
            <View key={kg} style={[s.chip, { backgroundColor: PLATE_COLOR[kg] || colors.stone }]}>
              <Mono style={s.chipText}>{count}×{kg}</Mono>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const makeStyles = (colors) => StyleSheet.create({
  wrap: { backgroundColor: colors.ivory, borderRadius: radius.md, padding: space(3), gap: space(2) },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space(2) },
  chip: { borderRadius: radius.sm, paddingHorizontal: space(3), paddingVertical: space(1.5) },
  chipText: { color: colors.textInverse, fontSize: 13, fontFamily: fonts.mono },
  empty: { color: colors.textSecondary, fontFamily: fonts.sans, fontSize: 13 },
});
