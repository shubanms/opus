// First-run onboarding — name + units, then into the app. Shown once (gated on
// the `onboarded` setting). Ports the PWA onboarding's essentials.
import { useState } from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Wordmark, Display, Label, Body } from '../ui';
import { radius, space, fonts } from '../theme';
import { useColors, useThemedStyles } from '../native/ThemeProvider';
import PressScale from './PressScale';
import { GoldButton } from './Button';
import GoldAura from './fx/GoldAura';
import { useSettings } from '../native/settings';

export default function Onboarding({ onDone }) {
  const colors = useColors();
  const s = useThemedStyles(makeStyles);
  const { update } = useSettings();
  const [name, setName] = useState('');
  const [unit, setUnit] = useState('kg');

  const start = () => {
    update('name', name.trim() || 'Athlete');
    update('unit', unit);
    update('onboarded', true);
    onDone?.();
  };

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.aura}><GoldAura size={420} intensity={0.6} /></View>
      <View style={s.body}>
        <Wordmark size={54} />
        <Display style={s.tagline}>Build your masterpiece.</Display>
        <Body style={{ textAlign: 'center', marginTop: space(2) }}>
          A free, offline gym tracker with RPG progression. Everything stays on your phone.
        </Body>

        <View style={s.field}>
          <Label>What should we call you?</Label>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Your name"
            placeholderTextColor={colors.ash}
            style={s.input}
          />
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
      </View>

      <View style={s.footer}>
        <GoldButton label="Start training" icon="add" sound="start" onPress={start} />
      </View>
    </SafeAreaView>
  );
}

const makeStyles = (colors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  aura: { position: 'absolute', top: 40, left: 0, right: 0, alignItems: 'center' },
  body: { flex: 1, justifyContent: 'center', paddingHorizontal: space(6), gap: space(3) },
  tagline: { color: colors.textInverse, fontSize: 40, lineHeight: 44, marginTop: space(2) },
  field: { marginTop: space(5), gap: space(2) },
  input: { backgroundColor: colors.chalk, borderRadius: radius.lg, paddingHorizontal: space(4), paddingVertical: space(4), color: colors.textPrimary, fontFamily: fonts.sans, fontSize: 16 },
  seg: { flexDirection: 'row', backgroundColor: colors.stone, borderRadius: radius.lg, padding: 4 },
  segItem: { flex: 1, paddingVertical: space(3), borderRadius: radius.md, alignItems: 'center' },
  segActive: { backgroundColor: colors.gold },
  segText: { color: colors.ash, fontFamily: fonts.sansMedium, fontSize: 14 },
  segTextActive: { color: colors.obsidian },
  footer: { padding: space(6) },
});
