// Bodyweight logging + trend. Enter today's weight (in the display unit → stored
// kg) and see the recent trend. Ports the PWA BodyStatsForm + weight TrendChart.
import { useState } from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { dateKey, units } from '@opus/core';
import { Label, Mono } from '../../ui';
import { radius, space, fonts } from '../../theme';
import { useColors, useThemedStyles } from '../../native/ThemeProvider';
import Card from '../Card';
import PressScale from '../PressScale';
import LineChart from './LineChart';
import { useDbQuery } from '../../native/useDbQuery';
import { getBodyStats, logBodyStat, currentBodyweight } from '../../native/db';
import { useSettings } from '../../native/settings';

export default function BodyWeightCard({ width }) {
  const colors = useColors();
  const s = useThemedStyles(makeStyles);
  const { settings } = useSettings();
  const unit = settings.unit || 'kg';
  const [val, setVal] = useState('');
  const rows = useDbQuery(() => getBodyStats(30), [], []);
  const current = useDbQuery(() => currentBodyweight(), [], null);

  // Oldest→newest weights in display unit for the trend line.
  const series = [...(rows || [])].reverse().filter((r) => r.weight != null).map((r) => units.toDisplay(r.weight, unit));

  const log = () => {
    const n = parseFloat(val);
    if (!n || n <= 0) return;
    try { logBodyStat({ date: dateKey.todayKey(), weight: units.toKg(n, unit) }); } catch {}
    setVal('');
  };

  return (
    <Card>
      <View style={s.head}>
        <Label>Bodyweight</Label>
        {current != null && <Mono style={s.current}>{units.fmtWeight(current, unit)}</Mono>}
      </View>
      {series.length >= 2 && (
        <View style={{ marginTop: space(3) }}>
          <LineChart data={series} width={width} height={100} color={colors.sage} />
        </View>
      )}
      <View style={s.inputRow}>
        <TextInput
          value={val}
          onChangeText={setVal}
          keyboardType="decimal-pad"
          placeholder={`Today's weight (${units.unitLabel(unit)})`}
          placeholderTextColor={colors.ash}
          style={s.input}
        />
        <PressScale onPress={log} sound="success" style={s.logBtn}><Text style={s.logText}>Log</Text></PressScale>
      </View>
    </Card>
  );
}

const makeStyles = (colors) => StyleSheet.create({
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  current: { color: colors.sage, fontFamily: fonts.monoMedium, fontSize: 15 },
  inputRow: { flexDirection: 'row', gap: space(2), marginTop: space(3) },
  input: { flex: 1, backgroundColor: colors.ivory, borderRadius: radius.md, paddingHorizontal: space(4), paddingVertical: space(3), color: colors.textPrimary, fontFamily: fonts.sans, fontSize: 15 },
  logBtn: { backgroundColor: colors.sage, borderRadius: radius.md, paddingHorizontal: space(5), justifyContent: 'center' },
  logText: { color: colors.textInverse, fontFamily: fonts.sansSemi, fontSize: 15 },
});
