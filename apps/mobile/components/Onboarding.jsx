// First-run onboarding — gathers the profile (name, units, bodyweight, height,
// age, sex, barbell) then drops into the app, where the guided Tour runs next.
// Shown once (gated on the `onboarded` setting). Mirrors the PWA onboarding
// `begin()` (src/components/onboarding/Onboarding.jsx).
import { useState } from 'react';
import { View, Text, TextInput, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { units, dateKey, weekPlanner, routineGenerator } from '@opus/core';
import { Wordmark, Display, Label, Body } from '../ui';
import { radius, space, fonts } from '../theme';
import { useColors, useThemedStyles } from '../native/ThemeProvider';
import PressScale from './PressScale';
import { GoldButton } from './Button';
import GoldAura from './fx/GoldAura';
import { useSettings } from '../native/settings';
import { logBodyStat, getExercises, createWeek } from '../native/db';

const SEX = ['Male', 'Female', 'Other'];
const LEVELS = ['beginner', 'intermediate', 'advanced'];
const toAppDow = (d) => (d === 7 ? 0 : d);

export default function Onboarding({ onDone }) {
  const colors = useColors();
  const s = useThemedStyles(makeStyles);
  const { update } = useSettings();
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [unit, setUnit] = useState('kg');
  const [bodyweight, setBodyweight] = useState('');
  const [height, setHeight] = useState('');
  const [age, setAge] = useState('');
  const [sex, setSex] = useState('');
  const [bar, setBar] = useState('20');
  const [splitKey, setSplitKey] = useState('ppl');
  const [days, setDays] = useState(6);
  const [level, setLevel] = useState('intermediate');
  const currentYear = new Date().getFullYear();
  const split = weekPlanner.SPLIT_LIST.find((x) => x.key === splitKey);

  const num = (v) => { const n = parseFloat(v); return Number.isFinite(n) ? n : 0; };

  const saveProfile = () => {
    update('name', name.trim() || 'Athlete');
    update('unit', unit);
    update('barWeight', units.toKg(num(bar) || 20, unit));
    update('height', Math.round(num(height)));
    update('birthYear', age ? currentYear - Math.round(num(age)) : 0);
    update('sex', sex);
    const bw = num(bodyweight);
    if (bw > 0) { try { logBodyStat({ date: dateKey.todayKey(), weight: units.toKg(bw, unit) }); } catch {} }
  };

  const start = () => { saveProfile(); setStep(1); };

  const finish = () => { update('onboarded', true); onDone?.(); };

  const pickSplit = (key) => {
    const sp = weekPlanner.SPLIT_LIST.find((x) => x.key === key);
    setSplitKey(key);
    if (sp && !sp.days.includes(days)) setDays(sp.days[sp.days.length - 1]);
  };

  const createMyWeek = () => {
    try {
      const catalog = getExercises().map((e) => ({ ...e, id: e.name }));
      const rng = routineGenerator.makeRng((Date.now() % 100000) + 7919);
      const wk = weekPlanner.planWeek({ split: splitKey, days, level, sessionMinutes: 60, rest: 'standard', exercises: catalog, rng });
      createWeek(wk.map((day) => ({ ...day, dayOfWeek: toAppDow(day.dayOfWeek) })));
    } catch {}
    finish();
  };

  const NumField = ({ label, value, onChange, suffix, placeholder }) => (
    <View style={s.field}>
      <Label>{label}</Label>
      <View style={s.inputWrap}>
        <TextInput
          value={value}
          onChangeText={onChange}
          placeholder={placeholder}
          placeholderTextColor={colors.ash}
          keyboardType="decimal-pad"
          style={s.inputFlex}
        />
        {suffix ? <Text style={s.suffix}>{suffix}</Text> : null}
      </View>
    </View>
  );

  if (step === 1) {
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.aura}><GoldAura size={380} intensity={0.5} /></View>
        <ScrollView contentContainerStyle={s.body} showsVerticalScrollIndicator={false}>
          <View style={{ alignItems: 'center' }}>
            <Wordmark size={40} />
            <Display style={[s.tagline, { fontSize: 28, lineHeight: 32 }]}>Plan your week.</Display>
            <Body style={{ textAlign: 'center', marginTop: space(2) }}>Pick a split — we'll build a full week of routines, fully editable after.</Body>
          </View>

          <View style={{ gap: space(2), marginTop: space(4) }}>
            {weekPlanner.SPLIT_LIST.map((sp) => {
              const on = sp.key === splitKey;
              return (
                <PressScale key={sp.key} sound="tap" onPress={() => pickSplit(sp.key)} style={[s.splitCard, on && s.splitCardOn]}>
                  <View style={s.splitTop}>
                    <Text style={s.splitLabel}>{sp.label}</Text>
                    <Text style={s.splitDays}>{sp.days.join('/')}d</Text>
                  </View>
                  <Text style={s.splitBlurb}>{sp.blurb}</Text>
                </PressScale>
              );
            })}
          </View>

          <Label style={{ marginTop: space(4) }}>Days per week</Label>
          <View style={s.seg}>
            {split.days.map((d) => (
              <PressScale key={d} sound="tap" onPress={() => setDays(d)} style={[s.segItem, days === d && s.segActive]}>
                <Text style={[s.segText, days === d && s.segTextActive]}>{d} days</Text>
              </PressScale>
            ))}
          </View>

          <Label style={{ marginTop: space(4) }}>Experience</Label>
          <View style={s.seg}>
            {LEVELS.map((l) => (
              <PressScale key={l} sound="tap" onPress={() => setLevel(l)} style={[s.segItem, level === l && s.segActive]}>
                <Text style={[s.segText, level === l && s.segTextActive, { textTransform: 'capitalize' }]}>{l}</Text>
              </PressScale>
            ))}
          </View>

          <GoldButton label="Create my week" icon="calendar" sound="start" onPress={createMyWeek} style={{ marginTop: space(6) }} />
          <PressScale onPress={finish} style={{ alignItems: 'center', paddingVertical: space(3) }}>
            <Text style={{ color: colors.ash, fontFamily: fonts.sansMedium, fontSize: 14 }}>Skip for now</Text>
          </PressScale>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.aura}><GoldAura size={420} intensity={0.6} /></View>
      <ScrollView contentContainerStyle={s.body} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={{ alignItems: 'center' }}>
          <Wordmark size={48} />
          <Display style={s.tagline}>Build your masterpiece.</Display>
          <Body style={{ textAlign: 'center', marginTop: space(2) }}>
            A free, offline gym tracker with RPG progression. Set up your character — it all stays on your phone.
          </Body>
        </View>

        <View style={s.field}>
          <Label>Preferred units</Label>
          <View style={s.seg}>
            {[{ v: 'kg', l: 'Kilograms' }, { v: 'lbs', l: 'Pounds' }].map((o) => (
              <PressScale key={o.v} sound="tap" onPress={() => setUnit(o.v)} style={[s.segItem, unit === o.v && s.segActive]}>
                <Text style={[s.segText, unit === o.v && s.segTextActive]}>{o.l}</Text>
              </PressScale>
            ))}
          </View>
        </View>

        <View style={s.field}>
          <Label>What should we call you?</Label>
          <TextInput value={name} onChangeText={setName} placeholder="Your name" placeholderTextColor={colors.ash} style={s.input} />
        </View>

        <NumField label="Bodyweight" value={bodyweight} onChange={setBodyweight} suffix={units.unitLabel(unit)} placeholder="—" />
        <NumField label="Height" value={height} onChange={setHeight} suffix="cm" placeholder="—" />
        <NumField label="Age" value={age} onChange={setAge} placeholder="—" />

        <View style={s.field}>
          <Label>Sex</Label>
          <View style={s.seg}>
            {SEX.map((o) => (
              <PressScale key={o} sound="tap" onPress={() => setSex(o)} style={[s.segItem, sex === o && s.segActive]}>
                <Text style={[s.segText, sex === o && s.segTextActive]}>{o}</Text>
              </PressScale>
            ))}
          </View>
        </View>

        <NumField label="Empty barbell weight" value={bar} onChange={setBar} suffix={units.unitLabel(unit)} placeholder="20" />
      </ScrollView>

      <View style={s.footer}>
        <GoldButton label="Start training" icon="add" sound="start" onPress={start} />
      </View>
    </SafeAreaView>
  );
}

const makeStyles = (colors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  aura: { position: 'absolute', top: 20, left: 0, right: 0, alignItems: 'center' },
  body: { paddingHorizontal: space(6), paddingTop: space(10), paddingBottom: space(6), gap: space(2) },
  tagline: { color: colors.textInverse, fontSize: 34, lineHeight: 38, marginTop: space(2), textAlign: 'center' },
  field: { marginTop: space(4), gap: space(2) },
  input: { backgroundColor: colors.chalk, borderRadius: radius.lg, paddingHorizontal: space(4), paddingVertical: space(4), color: colors.textPrimary, fontFamily: fonts.sans, fontSize: 16 },
  inputWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.chalk, borderRadius: radius.lg, paddingHorizontal: space(4) },
  inputFlex: { flex: 1, paddingVertical: space(4), color: colors.textPrimary, fontFamily: fonts.sans, fontSize: 16 },
  suffix: { color: colors.ash, fontFamily: fonts.sansMedium, fontSize: 14 },
  seg: { flexDirection: 'row', backgroundColor: colors.stone, borderRadius: radius.lg, padding: 4 },
  segItem: { flex: 1, paddingVertical: space(3), borderRadius: radius.md, alignItems: 'center' },
  segActive: { backgroundColor: colors.gold },
  segText: { color: colors.ash, fontFamily: fonts.sansMedium, fontSize: 14 },
  segTextActive: { color: colors.obsidian },
  footer: { padding: space(6), paddingTop: space(3) },
  splitCard: { backgroundColor: colors.stone, borderRadius: radius.lg, padding: space(4), borderWidth: 1, borderColor: 'transparent' },
  splitCardOn: { borderColor: colors.gold },
  splitTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  splitLabel: { color: colors.textInverse, fontFamily: fonts.sansSemi, fontSize: 15 },
  splitDays: { color: colors.ash, fontFamily: fonts.mono, fontSize: 12 },
  splitBlurb: { color: colors.ash, fontFamily: fonts.sans, fontSize: 12, marginTop: 2 },
});
