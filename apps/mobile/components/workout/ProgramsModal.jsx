// Classic bundled programs (native parity). Install adds a program as editable
// routines with progression switched on. Opened from the Routines sheet.
import { useState } from 'react';
import { Modal, View, Text, ScrollView, StyleSheet } from 'react-native';
import { programs as programsCore } from '@opus/core';
import Icon from '../Icon';
import { H2, Body } from '../../ui';
import { radius, space, fonts } from '../../theme';
import { useColors, useThemedStyles } from '../../native/ThemeProvider';
import PressScale from '../PressScale';
import { installProgram } from '../../native/db';
import { playCue } from '../../native/sound';
import { success as hSuccess } from '../../native/haptics';

export default function ProgramsModal({ visible, onClose }) {
  const colors = useColors();
  const s = useThemedStyles(makeStyles);
  const [busy, setBusy] = useState(null);

  const install = (p) => {
    setBusy(p.id);
    try { installProgram(p.id); hSuccess(); playCue('quest'); onClose?.(); }
    catch {} finally { setBusy(null); }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={s.backdrop}>
        <View style={s.sheet}>
          <View style={s.header}>
            <H2>Programs</H2>
            <PressScale hitSlop={10} onPress={onClose}><Icon name="close" size={24} color={colors.ash} /></PressScale>
          </View>
          <Body style={{ marginBottom: space(3), fontSize: 12 }}>
            Proven templates — installing adds editable routines with progression on, so targets advance as you train.
          </Body>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: space(8), gap: space(3) }}>
            {programsCore.PROGRAMS.map((p) => (
              <View key={p.id} style={s.card}>
                <View style={s.top}>
                  <Text style={s.name}>{p.name}</Text>
                  <Text style={s.level}>{p.level}</Text>
                </View>
                <Text style={s.desc}>{p.desc}</Text>
                <View style={s.chips}>
                  {p.schedule.map((d) => (
                    <Text key={d.name} style={s.chip}>{d.name} · {d.exercises.length}</Text>
                  ))}
                </View>
                <PressScale onPress={() => install(p)} style={[s.btn, busy === p.id && { opacity: 0.6 }]}>
                  <Text style={s.btnText}>{busy === p.id ? 'Adding…' : `Add ${p.daysPerWeek}-day program`}</Text>
                </PressScale>
              </View>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const makeStyles = (colors) => StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(17,16,16,0.72)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.chalk, borderTopLeftRadius: radius['2xl'], borderTopRightRadius: radius['2xl'], padding: space(5), paddingBottom: space(2), height: '86%' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: space(3) },
  card: { backgroundColor: colors.ivory, borderRadius: radius.xl, padding: space(4) },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  name: { color: colors.textPrimary, fontFamily: fonts.displaySemi, fontSize: 18 },
  level: { color: colors.ash, fontFamily: fonts.mono, fontSize: 10, textTransform: 'uppercase', backgroundColor: colors.chalk, paddingHorizontal: space(2), paddingVertical: 2, borderRadius: radius.full, overflow: 'hidden' },
  desc: { color: colors.textSecondary, fontFamily: fonts.sans, fontSize: 12, marginTop: space(1) },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space(1.5), marginTop: space(2) },
  chip: { backgroundColor: colors.chalk, color: colors.textPrimary, fontFamily: fonts.sans, fontSize: 11, paddingHorizontal: space(2), paddingVertical: 3, borderRadius: radius.full, overflow: 'hidden' },
  btn: { marginTop: space(3), backgroundColor: colors.gold, borderRadius: radius.lg, paddingVertical: space(2.5), alignItems: 'center' },
  btnText: { color: colors.obsidian, fontFamily: fonts.sansSemi, fontSize: 14 },
});
