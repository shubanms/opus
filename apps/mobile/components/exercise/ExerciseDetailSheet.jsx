// Exercise detail bottom-sheet — the native counterpart of the web
// ExerciseDetailPage. Favorite star, muscle/equipment/difficulty badges, a
// coaching note, label color, PR card, per-session 1RM + volume charts, a
// "how-to" YouTube link, an add-to-workout action, and (for custom exercises)
// delete. Modal-sheet pattern, mirroring components/profile/HallOfRecordsModal.
import { Modal, View, Text, ScrollView, TextInput, StyleSheet, Alert, Linking, useWindowDimensions } from 'react-native';
import { units, prs as prsCore } from '@opus/core';
import Icon from '../Icon';
import { H2, Label, Body, Mono } from '../../ui';
import { radius, space, fonts } from '../../theme';
import { useColors, useThemedStyles } from '../../native/ThemeProvider';
import { useSettings } from '../../native/settings';
import { useDbQuery } from '../../native/useDbQuery';
import PressScale from '../PressScale';
import LineChart from '../progress/LineChart';
import BarChart from '../progress/BarChart';
import {
  getExercise, getExercisePRs, getExerciseNote, setExerciseNote,
  toggleFavorite, setExerciseColor, deleteCustomExercise,
  getExerciseE1rmSeries, getExerciseVolumeSeries,
} from '../../native/db';

const DIFFICULTY_COLOR = { beginner: '#6B8F71', intermediate: '#C9A84C', advanced: '#D4622A' };
const LABEL_COLORS = ['#C9A84C', '#D4622A', '#6B8F71', '#5B7C99', '#8C6BA6', '#C2557A', '#3E8E8A', '#8A8780'];

export default function ExerciseDetailSheet({ visible, exerciseName, onClose, onAddToWorkout }) {
  const colors = useColors();
  const s = useThemedStyles(makeStyles);
  const { settings } = useSettings();
  const unit = settings.unit || 'kg';
  const win = useWindowDimensions();
  const chartW = Math.round(win.width - 2 * space(5) - 2 * space(4));

  const ex = useDbQuery(() => (exerciseName ? getExercise(exerciseName) : null), [exerciseName], null);
  const note = useDbQuery(() => (exerciseName ? getExerciseNote(exerciseName) : ''), [exerciseName], '');
  const prs = useDbQuery(() => (exerciseName ? getExercisePRs(exerciseName) : []), [exerciseName], []);
  const e1rm = useDbQuery(() => (exerciseName ? getExerciseE1rmSeries(exerciseName) : []), [exerciseName], []);
  const vol = useDbQuery(() => (exerciseName ? getExerciseVolumeSeries(exerciseName) : []), [exerciseName], []);

  const bestE1rm = e1rm.length ? Math.max(...e1rm.map((p) => p.value)) : 0;
  const fmtPr = (p) => (p.type === 'reps' ? `${Math.round(p.value)} reps` : `${units.toDisplay(p.value, unit)} ${units.unitLabel(unit)}`);
  const difficulty = ex?.difficulty;

  const openHowTo = () => {
    const q = encodeURIComponent(`${exerciseName} proper form tutorial`);
    Linking.openURL(`https://www.youtube.com/results?search_query=${q}`).catch(() => {});
  };

  const confirmDelete = () => {
    Alert.alert('Delete exercise?', `Remove "${exerciseName}" and all its sets, records and template references. This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => { deleteCustomExercise(exerciseName); onClose?.(); } },
    ]);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={s.backdrop}>
        <View style={s.sheet}>
          <View style={s.header}>
            <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: space(2) }}>
              <PressScale hitSlop={8} onPress={() => exerciseName && toggleFavorite(exerciseName)}>
                <Text style={{ fontSize: 20 }}>{ex?.favorite ? '★' : '☆'}</Text>
              </PressScale>
              <H2 numberOfLines={1} style={{ flex: 1 }}>{exerciseName}</H2>
            </View>
            <PressScale hitSlop={10} onPress={onClose}><Icon name="close" size={24} color={colors.ash} /></PressScale>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: space(8), gap: space(4) }}>
            {/* Badges */}
            <View style={s.badges}>
              {!!ex?.muscleGroup && <Text style={s.badge}>{String(ex.muscleGroup).replace(/-/g, ' ')}</Text>}
              {!!ex?.equipment && <Text style={s.badge}>{ex.equipment}</Text>}
              {!!difficulty && <Text style={[s.badge, { color: DIFFICULTY_COLOR[difficulty] || colors.ash, backgroundColor: (DIFFICULTY_COLOR[difficulty] || colors.ash) + '22' }]}>{difficulty}</Text>}
              {!!ex?.isCustom && <Text style={[s.badge, { color: colors.gold, backgroundColor: colors.gold + '22' }]}>Custom</Text>}
            </View>

            {/* Coaching note + color */}
            <View style={s.card}>
              <Label>Coaching note</Label>
              <TextInput
                defaultValue={note}
                key={note}
                onEndEditing={(e) => exerciseName && setExerciseNote(exerciseName, e.nativeEvent.text)}
                placeholder="Cues you want to remember every session…"
                placeholderTextColor={colors.ash}
                style={s.noteInput}
                multiline
              />
              <View style={s.colorRow}>
                <PressScale hitSlop={6} onPress={() => exerciseName && setExerciseColor(exerciseName, null)} style={[s.swatch, { borderColor: colors.ivory }]}>
                  <Icon name="close" size={12} color={colors.ash} />
                </PressScale>
                {LABEL_COLORS.map((c) => (
                  <PressScale key={c} hitSlop={4} onPress={() => exerciseName && setExerciseColor(exerciseName, c)} style={[s.swatch, { backgroundColor: c }]}>
                    {ex?.color === c && <Icon name="checkmark" size={12} color="#111010" />}
                  </PressScale>
                ))}
              </View>
            </View>

            {/* How to */}
            <PressScale sound="tap" onPress={openHowTo} style={s.howto}>
              <Icon name="play" size={16} color={colors.gold} />
              <Text style={s.howtoText}>Watch how-to on YouTube</Text>
              <Icon name="chevron-forward" size={16} color={colors.ash} />
            </PressScale>

            {/* PRs */}
            <View style={s.card}>
              <Label>Records</Label>
              {prs.length === 0 ? (
                <Body style={{ marginTop: space(2) }}>No records yet — log a few sets to set your first.</Body>
              ) : (
                <View style={{ marginTop: space(2), gap: space(2) }}>
                  {prs.map((p) => (
                    <View key={p.type} style={s.prRow}>
                      <Text style={s.prLabel}>{prsCore.prTypeLabel(p.type)}</Text>
                      <Mono style={s.prVal}>{fmtPr(p)}</Mono>
                    </View>
                  ))}
                </View>
              )}
            </View>

            {/* Estimated 1RM */}
            {e1rm.length >= 2 && (
              <View style={s.card}>
                <View style={s.cardHead}>
                  <Label>Estimated 1RM</Label>
                  <Mono style={{ color: colors.gold }}>{units.toDisplay(bestE1rm, unit)} {units.unitLabel(unit)}</Mono>
                </View>
                <View style={{ marginTop: space(3) }}>
                  <LineChart data={e1rm.map((p) => ({ value: Math.round(units.toDisplay(p.value, unit)) }))} width={chartW} height={120} />
                </View>
              </View>
            )}

            {/* Volume history */}
            {vol.length >= 2 && (
              <View style={s.card}>
                <Label>Volume per session ({units.unitLabel(unit)})</Label>
                <View style={{ marginTop: space(3) }}>
                  <BarChart data={vol.map((p) => ({ value: Math.round(units.toDisplay(p.value, unit)) }))} width={chartW} height={120} />
                </View>
              </View>
            )}

            {/* Actions */}
            <PressScale sound="start" onPress={() => { onAddToWorkout?.(exerciseName); onClose?.(); }} style={s.addBtn}>
              <Icon name="add" size={18} color={colors.obsidian} />
              <Text style={s.addText}>Add to workout</Text>
            </PressScale>

            {!!ex?.isCustom && (
              <PressScale onPress={confirmDelete} style={s.deleteBtn}>
                <Icon name="trash" size={16} color={colors.ember} />
                <Text style={s.deleteText}>Delete exercise</Text>
              </PressScale>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const makeStyles = (colors) => StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(17,16,16,0.72)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.chalk, borderTopLeftRadius: radius['2xl'], borderTopRightRadius: radius['2xl'], padding: space(5), paddingBottom: space(2), height: '90%' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: space(3), gap: space(2) },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: space(2) },
  badge: { color: colors.textSecondary, backgroundColor: colors.ivory, borderRadius: radius.full, paddingHorizontal: space(3), paddingVertical: space(1), fontFamily: fonts.sansMedium, fontSize: 12, textTransform: 'capitalize' },
  card: { backgroundColor: colors.chalk, borderColor: colors.ivory, borderWidth: 1, borderRadius: radius.xl, padding: space(4) },
  cardHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  noteInput: { marginTop: space(2), color: colors.textPrimary, fontFamily: fonts.sans, fontSize: 14, minHeight: 44, textAlignVertical: 'top' },
  colorRow: { flexDirection: 'row', flexWrap: 'wrap', gap: space(2), marginTop: space(3) },
  swatch: { width: 30, height: 30, borderRadius: 15, borderWidth: 1, borderColor: 'transparent', alignItems: 'center', justifyContent: 'center' },
  howto: { flexDirection: 'row', alignItems: 'center', gap: space(3), backgroundColor: colors.ivory, borderRadius: radius.lg, paddingHorizontal: space(4), paddingVertical: space(3.5) },
  howtoText: { flex: 1, color: colors.textPrimary, fontFamily: fonts.sansMedium, fontSize: 14 },
  prRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.ivory, borderRadius: radius.md, paddingHorizontal: space(4), paddingVertical: space(3) },
  prLabel: { color: colors.textSecondary, fontFamily: fonts.sans, fontSize: 13 },
  prVal: { color: colors.gold, fontFamily: fonts.monoMedium, fontSize: 14 },
  addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space(2), backgroundColor: colors.gold, borderRadius: radius.lg, paddingVertical: space(3.5) },
  addText: { color: colors.obsidian, fontFamily: fonts.sansSemi, fontSize: 15 },
  deleteBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space(2), paddingVertical: space(3) },
  deleteText: { color: colors.ember, fontFamily: fonts.sansMedium, fontSize: 14 },
});
