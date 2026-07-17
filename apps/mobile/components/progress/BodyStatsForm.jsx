// Log body weight + fat% + tape measurements for today. Ports the web
// BodyStatsForm. Weight is entered in the display unit and stored in kg; the
// rest are cm / %. Modal-sheet; upserts by date via logBodyStat.
import { useState } from 'react';
import { Modal, View, Text, TextInput, ScrollView, StyleSheet } from 'react-native';
import { units, dateKey } from '@opus/core';
import Icon from '../Icon';
import { H2, Label } from '../../ui';
import { radius, space, fonts } from '../../theme';
import { useColors, useThemedStyles } from '../../native/ThemeProvider';
import { useSettings } from '../../native/settings';
import PressScale from '../PressScale';
import { GoldButton } from '../Button';
import { logBodyStat } from '../../native/db';

export default function BodyStatsForm({ visible, onClose, onSaved }) {
  const colors = useColors();
  const s = useThemedStyles(makeStyles);
  const { settings } = useSettings();
  const unit = settings.unit || 'kg';
  const [vals, setVals] = useState({});

  const FIELDS = [
    { key: 'weight', label: 'Weight', suffix: units.unitLabel(unit), isWeight: true },
    { key: 'bodyFat', label: 'Body fat', suffix: '%' },
    { key: 'chest', label: 'Chest', suffix: 'cm' },
    { key: 'waist', label: 'Waist', suffix: 'cm' },
    { key: 'hips', label: 'Hips', suffix: 'cm' },
    { key: 'arms', label: 'Arms', suffix: 'cm' },
    { key: 'thighs', label: 'Thighs', suffix: 'cm' },
  ];

  const set = (k, v) => setVals((p) => ({ ...p, [k]: v }));
  const canSave = FIELDS.some((f) => String(vals[f.key] ?? '').trim() !== '');

  const save = () => {
    const entry = { date: dateKey.todayKey() };
    for (const f of FIELDS) {
      const raw = String(vals[f.key] ?? '').trim();
      if (raw === '') continue;
      const n = Number(raw);
      if (Number.isNaN(n)) continue;
      entry[f.key] = f.isWeight ? units.toKg(n, unit) : n;
    }
    logBodyStat(entry);
    onSaved?.();
    setVals({});
    onClose?.();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={s.backdrop}>
        <View style={s.sheet}>
          <View style={s.header}>
            <H2>Body stats</H2>
            <PressScale hitSlop={10} onPress={onClose}><Icon name="close" size={24} color={colors.ash} /></PressScale>
          </View>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: space(6) }}>
            {FIELDS.map((f) => (
              <View key={f.key} style={s.row}>
                <Label>{f.label}</Label>
                <View style={s.inputWrap}>
                  <TextInput
                    value={String(vals[f.key] ?? '')}
                    onChangeText={(v) => set(f.key, v)}
                    keyboardType="decimal-pad"
                    placeholder="—"
                    placeholderTextColor={colors.ash}
                    style={s.input}
                  />
                  <Text style={s.suffix}>{f.suffix}</Text>
                </View>
              </View>
            ))}
            <GoldButton label="Save today's stats" icon="checkmark" sound="success" onPress={save} style={{ marginTop: space(4), opacity: canSave ? 1 : 0.5 }} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const makeStyles = (colors) => StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(17,16,16,0.72)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.chalk, borderTopLeftRadius: radius['2xl'], borderTopRightRadius: radius['2xl'], padding: space(5), paddingBottom: space(2), maxHeight: '88%' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: space(4) },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: space(2.5), borderTopColor: colors.ivory, borderTopWidth: StyleSheet.hairlineWidth },
  inputWrap: { flexDirection: 'row', alignItems: 'center', gap: space(2) },
  input: { minWidth: 70, color: colors.textPrimary, fontFamily: fonts.mono, fontSize: 15, textAlign: 'right', paddingVertical: space(1) },
  suffix: { color: colors.ash, fontFamily: fonts.sans, fontSize: 12, width: 28 },
});
