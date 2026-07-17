// Create a custom exercise — name + muscle group + equipment. Ports the web
// ExerciseForm. Modal-sheet; on save writes via addCustomExercise (isCustom=1).
import { useState } from 'react';
import { Modal, View, Text, TextInput, ScrollView, StyleSheet } from 'react-native';
import Icon from '../Icon';
import { H2, Label } from '../../ui';
import { radius, space, fonts } from '../../theme';
import { useColors, useThemedStyles } from '../../native/ThemeProvider';
import PressScale from '../PressScale';
import { GoldButton } from '../Button';
import { addCustomExercise } from '../../native/db';

const MUSCLE_GROUPS = ['chest', 'triceps', 'biceps', 'front-deltoids', 'back-deltoids', 'upper-back', 'lower-back', 'trapezius', 'abs', 'obliques', 'quadriceps', 'hamstring', 'gluteal', 'calves', 'forearm'];
const EQUIPMENT = ['barbell', 'dumbbell', 'bodyweight', 'cable', 'machine'];

export default function ExerciseFormSheet({ visible, onClose, onCreated }) {
  const colors = useColors();
  const s = useThemedStyles(makeStyles);
  const [name, setName] = useState('');
  const [muscleGroup, setMuscleGroup] = useState('chest');
  const [equipment, setEquipment] = useState('barbell');
  const [error, setError] = useState('');

  const reset = () => { setName(''); setMuscleGroup('chest'); setEquipment('barbell'); setError(''); };
  const close = () => { reset(); onClose?.(); };

  const save = () => {
    const n = name.trim();
    if (!n) { setError('Name is required.'); return; }
    const ok = addCustomExercise({ name: n, muscleGroup, equipment });
    if (!ok) { setError('That exercise already exists.'); return; }
    onCreated?.(n);
    close();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={close}>
      <View style={s.backdrop}>
        <View style={s.sheet}>
          <View style={s.header}>
            <H2>New exercise</H2>
            <PressScale hitSlop={10} onPress={close}><Icon name="close" size={24} color={colors.ash} /></PressScale>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: space(6), gap: space(4) }}>
            <View>
              <Label>Name</Label>
              <TextInput
                value={name}
                onChangeText={(v) => { setName(v); setError(''); }}
                placeholder="e.g. Cable Fly"
                placeholderTextColor={colors.ash}
                autoFocus
                style={s.input}
              />
              {!!error && <Text style={s.error}>{error}</Text>}
            </View>

            <View>
              <Label>Muscle group</Label>
              <View style={s.chips}>
                {MUSCLE_GROUPS.map((m) => (
                  <PressScale key={m} sound="tap" onPress={() => setMuscleGroup(m)} style={[s.chip, muscleGroup === m && s.chipActive]}>
                    <Text style={[s.chipText, muscleGroup === m && s.chipTextActive]}>{m.replace(/-/g, ' ')}</Text>
                  </PressScale>
                ))}
              </View>
            </View>

            <View>
              <Label>Equipment</Label>
              <View style={s.chips}>
                {EQUIPMENT.map((e) => (
                  <PressScale key={e} sound="tap" onPress={() => setEquipment(e)} style={[s.chip, equipment === e && s.chipActive]}>
                    <Text style={[s.chipText, equipment === e && s.chipTextActive]}>{e}</Text>
                  </PressScale>
                ))}
              </View>
            </View>

            <GoldButton label="Create exercise" icon="checkmark" sound="success" onPress={save} style={{ marginTop: space(2) }} />
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
  input: { marginTop: space(2), backgroundColor: colors.ivory, borderRadius: radius.lg, paddingHorizontal: space(4), paddingVertical: space(3.5), color: colors.textPrimary, fontFamily: fonts.sans, fontSize: 15 },
  error: { marginTop: space(2), color: colors.ember, fontFamily: fonts.sans, fontSize: 13 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space(2), marginTop: space(2) },
  chip: { backgroundColor: colors.ivory, borderRadius: radius.full, paddingHorizontal: space(3.5), paddingVertical: space(2) },
  chipActive: { backgroundColor: colors.gold },
  chipText: { color: colors.textSecondary, fontFamily: fonts.sansMedium, fontSize: 13, textTransform: 'capitalize' },
  chipTextActive: { color: colors.obsidian },
});
