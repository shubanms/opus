// Full routine editor (native) — rename, assign a weekday, add/remove/reorder
// exercises, and tune sets × reps × rest per exercise. Loads a template with
// getTemplate() and saves via updateTemplate(). Mirrors the web TemplateBuilder.
import { useEffect, useState } from 'react';
import { Modal, View, Text, TextInput, ScrollView, StyleSheet, Alert } from 'react-native';
import Icon from '../Icon';
import { H2, Label, Body, Mono } from '../../ui';
import { radius, space, fonts } from '../../theme';
import { useColors, useThemedStyles } from '../../native/ThemeProvider';
import PressScale from '../PressScale';
import { GoldButton, SecondaryButton } from '../Button';
import ExercisePicker from './ExercisePicker';
import { getTemplate, updateTemplate, deleteTemplate } from '../../native/db';
import { playCue } from '../../native/sound';
import { success as hSuccess } from '../../native/haptics';

const DOW = [{ v: null, l: 'Any' }, { v: 1, l: 'Mon' }, { v: 2, l: 'Tue' }, { v: 3, l: 'Wed' }, { v: 4, l: 'Thu' }, { v: 5, l: 'Fri' }, { v: 6, l: 'Sat' }, { v: 0, l: 'Sun' }];

export default function TemplateEditor({ visible, templateId, onClose }) {
  const colors = useColors();
  const s = useThemedStyles(makeStyles);
  const [name, setName] = useState('');
  const [dayOfWeek, setDayOfWeek] = useState(null);
  const [rows, setRows] = useState([]);
  const [pickerOpen, setPickerOpen] = useState(false);

  useEffect(() => {
    if (!visible || templateId == null) return;
    try {
      const t = getTemplate(templateId);
      if (t) {
        setName(t.name || '');
        setDayOfWeek(t.dayOfWeek ?? null);
        setRows((t.exercises || []).map((e) => ({
          exerciseName: e.exerciseName,
          targetSets: e.targetSets ?? 3,
          targetReps: e.targetReps ?? 8,
          targetRest: e.targetRest ?? 90,
        })));
      }
    } catch {}
  }, [visible, templateId]);

  const patch = (i, key, delta, min, max) => setRows((rs) => rs.map((r, j) => (j === i ? { ...r, [key]: Math.max(min, Math.min(max, (Number(r[key]) || 0) + delta)) } : r)));
  const move = (i, dir) => setRows((rs) => {
    const j = i + dir;
    if (j < 0 || j >= rs.length) return rs;
    const next = rs.slice();
    [next[i], next[j]] = [next[j], next[i]];
    return next;
  });
  const remove = (i) => setRows((rs) => rs.filter((_, j) => j !== i));
  const add = (n) => setRows((rs) => (rs.some((r) => r.exerciseName === n) ? rs : [...rs, { exerciseName: n, targetSets: 3, targetReps: 8, targetRest: 90 }]));

  const save = () => {
    try {
      updateTemplate(templateId, { name, dayOfWeek, color: null, exercises: rows });
      hSuccess();
      playCue('success');
      onClose?.();
    } catch (e) { Alert.alert('Error', String(e?.message || e)); }
  };

  const confirmDelete = () => {
    Alert.alert('Delete routine?', `Remove "${name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => { try { deleteTemplate(templateId); } catch {} onClose?.(); } },
    ]);
  };

  const Stepper = ({ label, value, onMinus, onPlus, suffix }) => (
    <View style={s.stepper}>
      <Text style={s.stepLabel}>{label}</Text>
      <View style={s.stepRow}>
        <PressScale hitSlop={6} onPress={onMinus} style={s.stepBtn}><Icon name="chevron-down" size={16} color={colors.textPrimary} /></PressScale>
        <Mono style={s.stepVal}>{value}{suffix || ''}</Mono>
        <PressScale hitSlop={6} onPress={onPlus} style={s.stepBtn}><Icon name="chevron-up" size={16} color={colors.textPrimary} /></PressScale>
      </View>
    </View>
  );

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={s.backdrop}>
        <View style={s.sheet}>
          <View style={s.header}>
            <H2>Edit routine</H2>
            <PressScale hitSlop={10} onPress={onClose}><Icon name="close" size={24} color={colors.ash} /></PressScale>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: space(8) }}>
            <Label>Name</Label>
            <TextInput value={name} onChangeText={setName} placeholder="Routine name" placeholderTextColor={colors.ash} style={s.input} />

            <Label style={{ marginTop: space(4) }}>Day</Label>
            <View style={s.dayRow}>
              {DOW.map((d) => (
                <PressScale key={String(d.v)} sound="tap" onPress={() => setDayOfWeek(d.v)} style={[s.dayChip, dayOfWeek === d.v && s.dayChipOn]}>
                  <Text style={[s.dayText, dayOfWeek === d.v && s.dayTextOn]}>{d.l}</Text>
                </PressScale>
              ))}
            </View>

            <Label style={{ marginTop: space(4) }}>Exercises</Label>
            <View style={{ gap: space(2), marginTop: space(2) }}>
              {rows.length === 0 ? <Body>No exercises — add some below.</Body> : rows.map((r, i) => (
                <View key={r.exerciseName} style={s.exCard}>
                  <View style={s.exTop}>
                    <Text style={s.exName} numberOfLines={1}>{r.exerciseName}</Text>
                    <PressScale hitSlop={6} onPress={() => move(i, -1)} style={s.iconBtn}><Icon name="chevron-up" size={16} color={colors.ash} /></PressScale>
                    <PressScale hitSlop={6} onPress={() => move(i, 1)} style={s.iconBtn}><Icon name="chevron-down" size={16} color={colors.ash} /></PressScale>
                    <PressScale hitSlop={6} onPress={() => remove(i)} style={s.iconBtn}><Icon name="trash" size={15} color={colors.ash} /></PressScale>
                  </View>
                  <View style={s.stepGroup}>
                    <Stepper label="Sets" value={r.targetSets} onMinus={() => patch(i, 'targetSets', -1, 1, 10)} onPlus={() => patch(i, 'targetSets', 1, 1, 10)} />
                    <Stepper label="Reps" value={r.targetReps} onMinus={() => patch(i, 'targetReps', -1, 1, 50)} onPlus={() => patch(i, 'targetReps', 1, 1, 50)} />
                    <Stepper label="Rest" value={r.targetRest} suffix="s" onMinus={() => patch(i, 'targetRest', -15, 0, 600)} onPlus={() => patch(i, 'targetRest', 15, 0, 600)} />
                  </View>
                </View>
              ))}
            </View>

            <SecondaryButton label="Add exercise" icon="add" onPress={() => setPickerOpen(true)} style={{ marginTop: space(3) }} />
            <GoldButton label="Save routine" icon="checkmark" onPress={save} style={{ marginTop: space(3) }} />
            <PressScale onPress={confirmDelete} style={s.deleteBtn}><Text style={s.deleteText}>Delete routine</Text></PressScale>
          </ScrollView>
        </View>
      </View>

      <ExercisePicker visible={pickerOpen} onClose={() => setPickerOpen(false)} onPick={add} />
    </Modal>
  );
}

const makeStyles = (colors) => StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(17,16,16,0.72)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.chalk, borderTopLeftRadius: radius['2xl'], borderTopRightRadius: radius['2xl'], padding: space(5), paddingBottom: space(2), height: '88%' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: space(3) },
  input: { backgroundColor: colors.ivory, borderRadius: radius.lg, paddingHorizontal: space(4), paddingVertical: space(3.5), color: colors.textPrimary, fontFamily: fonts.sans, fontSize: 15, marginTop: space(2) },
  dayRow: { flexDirection: 'row', flexWrap: 'wrap', gap: space(2), marginTop: space(2) },
  dayChip: { paddingHorizontal: space(3.5), paddingVertical: space(2), borderRadius: radius.full, backgroundColor: colors.ivory },
  dayChipOn: { backgroundColor: colors.gold },
  dayText: { color: colors.textSecondary, fontFamily: fonts.sansMedium, fontSize: 13 },
  dayTextOn: { color: colors.obsidian },
  exCard: { backgroundColor: colors.ivory, borderRadius: radius.md, padding: space(3) },
  exTop: { flexDirection: 'row', alignItems: 'center', gap: space(2) },
  exName: { flex: 1, color: colors.textPrimary, fontFamily: fonts.sansSemi, fontSize: 14 },
  iconBtn: { padding: space(1) },
  stepGroup: { flexDirection: 'row', gap: space(2), marginTop: space(3) },
  stepper: { flex: 1, alignItems: 'center' },
  stepLabel: { color: colors.textSecondary, fontFamily: fonts.sansMedium, fontSize: 11, marginBottom: space(1) },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: space(2) },
  stepBtn: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.chalk, alignItems: 'center', justifyContent: 'center' },
  stepVal: { color: colors.textPrimary, fontFamily: fonts.monoMedium, fontSize: 14, minWidth: 34, textAlign: 'center' },
  deleteBtn: { alignItems: 'center', paddingVertical: space(3), marginTop: space(2) },
  deleteText: { color: colors.ember, fontFamily: fonts.sansMedium, fontSize: 14 },
});
