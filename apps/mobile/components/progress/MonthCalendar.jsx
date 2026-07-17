// Tappable month grid of training days (native parity with the web calendar).
// `days` is a Set of YYYY-MM-DD keys; onSelect(dateKey|null) fires on tap.
import { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { calendar, dateKey } from '@opus/core';
import Icon from '../Icon';
import PressScale from '../PressScale';
import { radius, space, fonts } from '../../theme';
import { useColors, useThemedStyles } from '../../native/ThemeProvider';
import { tapLight } from '../../native/haptics';

export default function MonthCalendar({ days, selected, onSelect }) {
  const colors = useColors();
  const s = useThemedStyles(makeStyles);
  const now = new Date();
  const [ym, setYm] = useState({ year: now.getFullYear(), month: now.getMonth() });
  const tk = dateKey.todayKey();
  const weeks = calendar.monthGrid(ym.year, ym.month, days, { todayKey: tk });
  const stats = calendar.monthStats(ym.year, ym.month, days);
  const labels = calendar.dowLabels();

  const step = (d) => { setYm(calendar.stepMonth(ym.year, ym.month, d)); onSelect?.(null); };
  const tap = (cell) => { if (!cell) return; tapLight(); onSelect?.(selected === cell.dateKey ? null : cell.dateKey); };

  return (
    <View style={s.wrap}>
      <View style={s.header}>
        <PressScale hitSlop={10} onPress={() => step(-1)} style={s.navBtn}><Icon name="chevron-back" size={16} color={colors.textPrimary} /></PressScale>
        <View style={{ alignItems: 'center' }}>
          <Text style={s.title}>{calendar.monthLabel(ym.year, ym.month)}</Text>
          <Text style={s.sub}>{stats.trained} training {stats.trained === 1 ? 'day' : 'days'}</Text>
        </View>
        <PressScale hitSlop={10} onPress={() => step(1)} style={s.navBtn}><Icon name="chevron-forward" size={16} color={colors.textPrimary} /></PressScale>
      </View>

      <View style={s.dowRow}>
        {labels.map((l) => <Text key={l} style={s.dow}>{l}</Text>)}
      </View>

      {weeks.map((w, i) => (
        <View key={i} style={s.week}>
          {w.map((cell, j) => (cell === null ? (
            <View key={j} style={s.cell} />
          ) : (
            <PressScale
              key={j}
              onPress={() => tap(cell)}
              style={[
                s.cell, s.cellBtn,
                { backgroundColor: cell.trained ? colors.gold : colors.ivory },
                selected === cell.dateKey && s.selCell,
                selected !== cell.dateKey && cell.isToday && s.todayCell,
              ]}
            >
              <Text style={[s.dayNum, { color: cell.trained ? colors.obsidian : colors.textSecondary, fontFamily: cell.trained ? fonts.monoMedium : fonts.mono }]}>
                {cell.day}
              </Text>
            </PressScale>
          )))}
        </View>
      ))}
    </View>
  );
}

const makeStyles = (colors) => StyleSheet.create({
  wrap: { backgroundColor: colors.ivory, borderRadius: radius.xl, padding: space(4) },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: space(3) },
  navBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.chalk, alignItems: 'center', justifyContent: 'center' },
  title: { color: colors.textPrimary, fontFamily: fonts.displaySemi, fontSize: 16 },
  sub: { color: colors.textSecondary, fontFamily: fonts.mono, fontSize: 12, marginTop: 2 },
  dowRow: { flexDirection: 'row', marginBottom: space(1) },
  dow: { flex: 1, textAlign: 'center', color: colors.ash, fontFamily: fonts.mono, fontSize: 10 },
  week: { flexDirection: 'row', marginBottom: space(1) },
  cell: { flex: 1, aspectRatio: 1, marginHorizontal: 2, alignItems: 'center', justifyContent: 'center' },
  cellBtn: { borderRadius: radius.sm },
  selCell: { borderWidth: 2, borderColor: colors.gold },
  todayCell: { borderWidth: 2, borderColor: colors.ash },
  dayNum: { fontSize: 12 },
});
