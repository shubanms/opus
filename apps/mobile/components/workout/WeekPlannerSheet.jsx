// Guided split → week planner (native). Pick a split + days/week + level +
// session length + rest → planWeek() → preview each day → save the whole week
// as editable routines (one per weekday). Mirrors the web WeekPlannerModal.
import { useState } from 'react';
import { Modal, View, Text, ScrollView, StyleSheet, Alert } from 'react-native';
import Icon from '../Icon';
import { routineGenerator, weekPlanner } from '@opus/core';
import { H2, Label, Body, Mono } from '../../ui';
import { radius, space, fonts } from '../../theme';
import { useColors, useThemedStyles } from '../../native/ThemeProvider';
import PressScale from '../PressScale';
import { GoldButton } from '../Button';
import { getExercises, createWeek } from '../../native/db';
import { playCue } from '../../native/sound';
import { success as hSuccess } from '../../native/haptics';

const LEVELS = ['beginner', 'intermediate', 'advanced'];
const MINUTES = [30, 45, 60, 75, 90];
const REST_LABEL = { short: 'Short', standard: 'Standard', long: 'Long' };
const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const toAppDow = (d) => (d === 7 ? 0 : d); // planner 1=Mon…7=Sun → app 0=Sun…6=Sat

let seed = 1;

export default function WeekPlannerSheet({ visible, onClose }) {
  const colors = useColors();
  const s = useThemedStyles(makeStyles);
  const [splitKey, setSplitKey] = useState('ppl');
  const [days, setDays] = useState(6);
  const [level, setLevel] = useState('intermediate');
  const [minutes, setMinutes] = useState(60);
  const [rest, setRest] = useState('standard');
  const [week, setWeek] = useState(null);

  const split = weekPlanner.SPLIT_LIST.find((x) => x.key === splitKey);

  const pickSplit = (key) => {
    const sp = weekPlanner.SPLIT_LIST.find((x) => x.key === key);
    setSplitKey(key);
    if (sp && !sp.days.includes(days)) setDays(sp.days[sp.days.length - 1]);
    setWeek(null);
  };

  const generate = () => {
    try {
      const catalog = getExercises().map((e) => ({ ...e, id: e.name }));
      const rng = routineGenerator.makeRng((Date.now() % 100000) + seed++ * 7919);
      const w = weekPlanner.planWeek({ split: splitKey, days, level, sessionMinutes: minutes, rest, exercises: catalog, rng });
      setWeek(w);
      hSuccess();
      playCue('start');
    } catch (e) {
      Alert.alert('Error', String(e?.message || e));
    }
  };

  const save = () => {
    if (!week?.length) return;
    try {
      createWeek(week.map((day) => ({ ...day, dayOfWeek: toAppDow(day.dayOfWeek) })));
      hSuccess();
      playCue('success');
      setWeek(null);
      onClose?.();
    } catch (e) {
      Alert.alert('Error', String(e?.message || e));
    }
  };

  const Seg = ({ options, value, onChange }) => (
    <View style={s.seg}>
      {options.map((o) => {
        const v = typeof o === 'object' ? o.v : o;
        const l = typeof o === 'object' ? o.l : cap(o);
        return (
          <PressScale key={v} sound="tap" onPress={() => onChange(v)} style={[s.segItem, value === v && s.segActive]}>
            <Text style={[s.segText, value === v && s.segTextActive]}>{l}</Text>
          </PressScale>
        );
      })}
    </View>
  );

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={s.backdrop}>
        <View style={s.sheet}>
          <View style={s.header}>
            <H2>Plan my week</H2>
            <PressScale hitSlop={10} onPress={onClose}><Icon name="close" size={24} color={colors.ash} /></PressScale>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: space(8) }}>
            <Label>Choose a split</Label>
            <View style={{ gap: space(2), marginTop: space(2) }}>
              {weekPlanner.SPLIT_LIST.map((sp) => {
                const on = sp.key === splitKey;
                return (
                  <PressScale key={sp.key} sound="tap" onPress={() => pickSplit(sp.key)} style={[s.splitCard, on && s.splitCardOn]}>
                    <View style={s.splitTop}>
                      <Text style={s.splitLabel}>{sp.label}</Text>
                      <Mono style={s.splitDays}>{sp.days.join('/')}d</Mono>
                    </View>
                    <Text style={s.splitBlurb}>{sp.blurb}</Text>
                  </PressScale>
                );
              })}
            </View>

            <Label style={{ marginTop: space(4) }}>Days per week</Label>
            <Seg options={split.days.map((d) => ({ v: d, l: `${d} days` }))} value={days} onChange={(v) => { setDays(v); setWeek(null); }} />

            <Label style={{ marginTop: space(4) }}>Experience</Label>
            <Seg options={LEVELS} value={level} onChange={(v) => { setLevel(v); setWeek(null); }} />

            <Label style={{ marginTop: space(4) }}>Time per session</Label>
            <Seg options={MINUTES.map((m) => ({ v: m, l: `${m}m` }))} value={minutes} onChange={(v) => { setMinutes(v); setWeek(null); }} />

            <Label style={{ marginTop: space(4) }}>Rest between sets</Label>
            <Seg options={weekPlanner.REST_PREFS.map((r) => ({ v: r, l: REST_LABEL[r] }))} value={rest} onChange={(v) => { setRest(v); setWeek(null); }} />

            <GoldButton label={week ? 'Re-generate week' : 'Generate week'} icon="sparkles" onPress={generate} style={{ marginTop: space(5) }} />

            {week && (
              <View style={{ gap: space(3), marginTop: space(4) }}>
                {week.map((day, i) => (
                  <View key={i} style={s.dayCard}>
                    <View style={s.dayTop}>
                      <Text style={s.dayName}>{DOW[toAppDow(day.dayOfWeek)]} · {day.name}</Text>
                      <Mono style={s.dayCount}>{day.exercises.length} lifts</Mono>
                    </View>
                    {day.exercises.map((ex) => (
                      <View key={ex.exerciseId} style={s.exRow}>
                        <Text style={s.exName} numberOfLines={1}>{ex.exerciseId}</Text>
                        <Mono style={s.exMeta}>{ex.targetSets}×{ex.targetReps} · {ex.targetRest}s</Mono>
                      </View>
                    ))}
                  </View>
                ))}
                <GoldButton label={`Save week (${week.length} routines)`} icon="calendar" onPress={save} />
                <Body style={{ textAlign: 'center', fontSize: 12 }}>Each day is saved as an editable routine.</Body>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const makeStyles = (colors) => StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(17,16,16,0.72)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.chalk, borderTopLeftRadius: radius['2xl'], borderTopRightRadius: radius['2xl'], padding: space(5), paddingBottom: space(2), height: '88%' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: space(3) },
  seg: { flexDirection: 'row', backgroundColor: colors.ivory, borderRadius: radius.lg, padding: 3, marginTop: space(2) },
  segItem: { flex: 1, paddingVertical: space(2.5), borderRadius: radius.md, alignItems: 'center' },
  segActive: { backgroundColor: colors.gold },
  segText: { color: colors.textSecondary, fontFamily: fonts.sansMedium, fontSize: 12 },
  segTextActive: { color: colors.obsidian },
  splitCard: { backgroundColor: colors.ivory, borderRadius: radius.lg, padding: space(4), borderWidth: 1, borderColor: 'transparent' },
  splitCardOn: { borderColor: colors.gold },
  splitTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  splitLabel: { color: colors.textPrimary, fontFamily: fonts.sansSemi, fontSize: 15 },
  splitDays: { color: colors.textSecondary, fontFamily: fonts.mono, fontSize: 12 },
  splitBlurb: { color: colors.textSecondary, fontFamily: fonts.sans, fontSize: 12, marginTop: 2 },
  dayCard: { backgroundColor: colors.ivory, borderRadius: radius.md, padding: space(4), gap: space(1) },
  dayTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: space(1) },
  dayName: { color: colors.textPrimary, fontFamily: fonts.sansSemi, fontSize: 14 },
  dayCount: { color: colors.textSecondary, fontFamily: fonts.mono, fontSize: 12 },
  exRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  exName: { flex: 1, color: colors.textPrimary, fontFamily: fonts.sans, fontSize: 13 },
  exMeta: { color: colors.textSecondary, fontFamily: fonts.mono, fontSize: 11, marginLeft: space(2) },
});
