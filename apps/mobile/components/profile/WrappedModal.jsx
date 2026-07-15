// "Wrapped" sheet — Spotify-style recap over a month or year. Pure aggregation
// from @opus/core/wrapped; the caller passes shaped rows (getWrappedInputs).
import { useMemo, useState } from 'react';
import { Modal, View, Text, ScrollView, StyleSheet } from 'react-native';
import Icon from '../Icon';
import { wrapped as coreWrapped } from '@opus/core';
import { H1, H2, Label, Body, Mono } from '../../ui';
import { radius, space, fonts } from '../../theme';
import { useColors, useThemedStyles } from '../../native/ThemeProvider';
import PressScale from '../PressScale';
import CountUp from '../fx/CountUp';
import LineChart from '../progress/LineChart';

function Stat({ value, label, suffix }) {
  const colors = useColors();
  const s = useThemedStyles(makeStyles);
  return (
    <View style={s.stat}>
      <CountUp value={value} suffix={suffix} style={s.statVal} />
      <Label style={{ marginTop: 2 }}>{label}</Label>
    </View>
  );
}

export default function WrappedModal({ visible, onClose, inputs }) {
  const colors = useColors();
  const s = useThemedStyles(makeStyles);
  const periods = useMemo(
    () => coreWrapped.availablePeriods(inputs?.workouts || []),
    [inputs]
  );
  const [mode, setMode] = useState('month'); // 'month' | 'year'
  const [idx, setIdx] = useState(0);

  const list = mode === 'month' ? periods.months : periods.years;
  const period = list[Math.min(idx, list.length - 1)] || list[0];
  const data = useMemo(() => {
    if (!period || !inputs) return null;
    return coreWrapped.buildWrapped(inputs.workouts, inputs.sets, inputs.prs, coreWrapped.rangeOf(period), inputs.exName);
  }, [period, inputs]);

  const setModeSafe = (m) => { setMode(m); setIdx(0); };
  const step = (delta) => setIdx((i) => Math.max(0, Math.min(list.length - 1, i + delta)));

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={s.backdrop}>
        <View style={s.sheet}>
          <View style={s.header}>
            <H2>Wrapped</H2>
            <PressScale hitSlop={10} onPress={onClose}><Icon name="close" size={24} color={colors.ash} /></PressScale>
          </View>

          <View style={s.toggle}>
            {['month', 'year'].map((m) => (
              <PressScale key={m} sound="tap" onPress={() => setModeSafe(m)} style={[s.tog, mode === m && s.togActive]}>
                <Text style={[s.togText, mode === m && s.togTextActive]}>{m === 'month' ? 'Month' : 'Year'}</Text>
              </PressScale>
            ))}
          </View>

          <View style={s.stepper}>
            <PressScale hitSlop={10} onPress={() => step(1)} disabled={idx >= list.length - 1}>
              <Icon name="chevron-back" size={22} color={idx >= list.length - 1 ? colors.ivory : colors.textPrimary} />
            </PressScale>
            <Text style={s.period}>{data?.label || period?.label || '—'}</Text>
            <PressScale hitSlop={10} onPress={() => step(-1)} disabled={idx <= 0}>
              <Icon name="chevron-forward" size={22} color={idx <= 0 ? colors.ivory : colors.textPrimary} />
            </PressScale>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: space(8) }}>
            {!data || !data.hasData ? (
              <Body style={{ textAlign: 'center', marginTop: space(6) }}>No training logged in this period.</Body>
            ) : (
              <>
                <View style={s.headline}>
                  <Label>Total volume</Label>
                  <CountUp value={data.volumeKg} suffix=" kg" style={s.big} />
                </View>
                {data.series.length >= 2 && <LineChart data={data.series} width={280} height={90} />}

                <View style={s.grid}>
                  <Stat value={data.sessions} label="Sessions" />
                  <Stat value={data.sets} label="Sets" />
                  <Stat value={data.prs} label="PRs" />
                  <Stat value={Math.round(data.xp)} label="XP" />
                </View>

                <View style={s.chips}>
                  {data.topLift && (
                    <View style={s.chip}><Icon name="barbell" size={14} color={colors.gold} /><Text style={s.chipText}> Top lift · {data.topLift}</Text></View>
                  )}
                  {data.busiestDay && (
                    <View style={s.chip}><Icon name="calendar" size={14} color={colors.sage} /><Text style={s.chipText}> Busiest · {data.busiestDay}</Text></View>
                  )}
                  <View style={s.chip}><Icon name="time" size={14} color={colors.ember} /><Text style={s.chipText}> {data.hours.toFixed(1)} h trained</Text></View>
                </View>
              </>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const makeStyles = (colors) => StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(17,16,16,0.72)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.chalk, borderTopLeftRadius: radius['2xl'], borderTopRightRadius: radius['2xl'], padding: space(5), paddingBottom: space(2), height: '82%' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: space(3) },
  toggle: { flexDirection: 'row', backgroundColor: colors.ivory, borderRadius: radius.full, padding: 3, alignSelf: 'center' },
  tog: { paddingHorizontal: space(6), paddingVertical: space(2), borderRadius: radius.full },
  togActive: { backgroundColor: colors.gold },
  togText: { color: colors.textSecondary, fontFamily: fonts.sansMedium, fontSize: 13 },
  togTextActive: { color: colors.obsidian },
  stepper: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space(4), marginVertical: space(3) },
  period: { color: colors.textPrimary, fontFamily: fonts.displaySemi, fontSize: 20, minWidth: 140, textAlign: 'center' },
  headline: { alignItems: 'center', marginBottom: space(3) },
  big: { fontSize: 48, color: colors.gold, fontFamily: fonts.display, marginTop: 2 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: space(4) },
  stat: { width: '25%', alignItems: 'center', paddingVertical: space(2) },
  statVal: { fontSize: 24, color: colors.textPrimary, fontFamily: fonts.mono },
  chips: { gap: space(2), marginTop: space(4) },
  chip: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.ivory, borderRadius: radius.md, paddingHorizontal: space(4), paddingVertical: space(3) },
  chipText: { color: colors.textPrimary, fontFamily: fonts.sansMedium, fontSize: 14 },
});
