// Equipment & plates — per-location (Gym/Home) barbell weight + the plates you
// own, feeding the plate calculator. Ports the web EquipmentModal; reuses
// @opus/core/inventory + plateCalc. Plate sizes are physical kg plates (the
// app's internal unit); the bar is entered in the display unit.
import { useState } from 'react';
import { Modal, View, Text, TextInput, ScrollView, StyleSheet } from 'react-native';
import { inventory as inv, plateCalc, units } from '@opus/core';
import Icon from '../Icon';
import { H2, Label, Body } from '../../ui';
import { radius, space, fonts } from '../../theme';
import { useColors, useThemedStyles } from '../../native/ThemeProvider';
import { useSettings } from '../../native/settings';
import PressScale from '../PressScale';
import Segmented from '../Segmented';

const DEFAULT_INV = { active: 'gym', gym: { barKg: null, plates: null, unit: null }, home: { barKg: null, plates: null, unit: null } };

export default function EquipmentModal({ visible, onClose }) {
  const colors = useColors();
  const s = useThemedStyles(makeStyles);
  const { settings, update } = useSettings();
  const unit = settings.unit || 'kg';
  const data = settings.inventory || DEFAULT_INV;
  const active = data.active || 'gym';
  const loc = data[active] || {};
  const owned = inv.effectivePlates(loc, 'kg', plateCalc.PLATES_KG);
  const bar = loc.barKg ?? (Number(settings.barWeight) || 20);
  const [custom, setCustom] = useState('');

  const chips = [...new Set([...plateCalc.PLATES_KG, ...owned])].sort((a, b) => b - a);

  const setActive = (a) => update('inventory', { ...data, active: a });
  const setBar = (v) => {
    const kg = units.toKg(Number(v) || 0, unit);
    update('inventory', { ...data, [active]: { ...loc, barKg: kg > 0 ? kg : null } });
  };
  const toggle = (size) => update('inventory', { ...data, [active]: { ...loc, plates: inv.togglePlate(owned, size), unit: 'kg' } });
  const addCustom = () => {
    const n = Number(custom);
    if (n > 0 && !owned.includes(n)) toggle(n);
    setCustom('');
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={s.backdrop}>
        <View style={s.sheet}>
          <View style={s.header}>
            <H2>Equipment & plates</H2>
            <PressScale hitSlop={10} onPress={onClose}><Icon name="close" size={24} color={colors.ash} /></PressScale>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: space(6), gap: space(4) }}>
            <Segmented
              options={[{ value: 'gym', label: 'Gym' }, { value: 'home', label: 'Home' }]}
              value={active}
              onChange={setActive}
            />

            <View style={s.row}>
              <Label>Bar weight</Label>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: space(2) }}>
                <TextInput
                  value={String(Math.round(units.toDisplay(bar, unit) * 100) / 100)}
                  onChangeText={setBar}
                  keyboardType="decimal-pad"
                  style={s.barInput}
                />
                <Text style={s.unit}>{units.unitLabel(unit)}</Text>
              </View>
            </View>

            <View>
              <Label>Plates you own (per side)</Label>
              <View style={s.chips}>
                {chips.map((size) => {
                  const on = owned.includes(size);
                  return (
                    <PressScale key={size} sound="tap" onPress={() => toggle(size)} style={[s.chip, on && s.chipOn]}>
                      <Text style={[s.chipText, on && s.chipTextOn]}>{size}</Text>
                    </PressScale>
                  );
                })}
              </View>
              <View style={s.customRow}>
                <TextInput
                  value={custom}
                  onChangeText={setCustom}
                  keyboardType="decimal-pad"
                  placeholder="Add a plate (kg)"
                  placeholderTextColor={colors.ash}
                  style={s.customInput}
                  onSubmitEditing={addCustom}
                />
                <PressScale sound="tap" onPress={addCustom} style={s.addBtn}><Icon name="add" size={20} color={colors.obsidian} /></PressScale>
              </View>
            </View>

            <Body>The plate calculator uses this bar + these plates when you're logging at your {active === 'gym' ? 'gym' : 'home gym'}.</Body>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const makeStyles = (colors) => StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(17,16,16,0.72)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.chalk, borderTopLeftRadius: radius['2xl'], borderTopRightRadius: radius['2xl'], padding: space(5), paddingBottom: space(2), maxHeight: '82%' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: space(4) },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  barInput: { minWidth: 70, backgroundColor: colors.ivory, borderRadius: radius.md, paddingHorizontal: space(4), paddingVertical: space(3), color: colors.textPrimary, fontFamily: fonts.mono, fontSize: 15, textAlign: 'right' },
  unit: { color: colors.ash, fontFamily: fonts.sans, fontSize: 13 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space(2), marginTop: space(3) },
  chip: { minWidth: 46, alignItems: 'center', paddingHorizontal: space(3), paddingVertical: space(2.5), borderRadius: radius.md, backgroundColor: colors.ivory, borderWidth: 1, borderColor: 'transparent' },
  chipOn: { backgroundColor: colors.gold, borderColor: colors.gold },
  chipText: { color: colors.textSecondary, fontFamily: fonts.mono, fontSize: 14 },
  chipTextOn: { color: colors.obsidian },
  customRow: { flexDirection: 'row', alignItems: 'center', gap: space(2), marginTop: space(3) },
  customInput: { flex: 1, backgroundColor: colors.ivory, borderRadius: radius.md, paddingHorizontal: space(4), paddingVertical: space(3), color: colors.textPrimary, fontFamily: fonts.sans, fontSize: 14 },
  addBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.gold, alignItems: 'center', justifyContent: 'center' },
});
