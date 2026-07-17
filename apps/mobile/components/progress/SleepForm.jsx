// Log last night's sleep — hours + a 1–5 star quality. Ports the web SleepForm.
// Modal-sheet; upserts by date via logSleep.
import { useState } from 'react';
import { Modal, View, Text, TextInput, StyleSheet } from 'react-native';
import { dateKey } from '@opus/core';
import Icon from '../Icon';
import { H2, Label } from '../../ui';
import { radius, space, fonts } from '../../theme';
import { useColors, useThemedStyles } from '../../native/ThemeProvider';
import PressScale from '../PressScale';
import { GoldButton } from '../Button';
import { logSleep } from '../../native/db';

export default function SleepForm({ visible, onClose, onSaved }) {
  const colors = useColors();
  const s = useThemedStyles(makeStyles);
  const [hours, setHours] = useState('');
  const [quality, setQuality] = useState(0);

  const canSave = String(hours).trim() !== '' || quality > 0;
  const save = () => {
    logSleep({ date: dateKey.todayKey(), hours: String(hours).trim() === '' ? null : Number(hours), quality });
    onSaved?.();
    setHours(''); setQuality(0);
    onClose?.();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={s.backdrop}>
        <View style={s.sheet}>
          <View style={s.header}>
            <H2>Sleep</H2>
            <PressScale hitSlop={10} onPress={onClose}><Icon name="close" size={24} color={colors.ash} /></PressScale>
          </View>

          <View style={s.row}>
            <Label>Hours slept</Label>
            <TextInput
              value={String(hours)}
              onChangeText={setHours}
              keyboardType="decimal-pad"
              placeholder="e.g. 7.5"
              placeholderTextColor={colors.ash}
              style={s.input}
            />
          </View>

          <Label style={{ marginTop: space(4) }}>Quality</Label>
          <View style={s.stars}>
            {[1, 2, 3, 4, 5].map((n) => (
              <PressScale key={n} sound="tap" onPress={() => setQuality(quality === n ? 0 : n)} hitSlop={4}>
                <Text style={[s.star, { color: n <= quality ? colors.gold : colors.ivory }]}>★</Text>
              </PressScale>
            ))}
          </View>

          <GoldButton label="Save sleep" icon="checkmark" sound="success" onPress={save} style={{ marginTop: space(5), opacity: canSave ? 1 : 0.5 }} />
        </View>
      </View>
    </Modal>
  );
}

const makeStyles = (colors) => StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(17,16,16,0.72)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.chalk, borderTopLeftRadius: radius['2xl'], borderTopRightRadius: radius['2xl'], padding: space(5), paddingBottom: space(8) },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: space(4) },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  input: { minWidth: 100, color: colors.textPrimary, fontFamily: fonts.mono, fontSize: 16, textAlign: 'right', backgroundColor: colors.ivory, borderRadius: radius.md, paddingHorizontal: space(4), paddingVertical: space(3) },
  stars: { flexDirection: 'row', gap: space(2), marginTop: space(2) },
  star: { fontSize: 36 },
});
