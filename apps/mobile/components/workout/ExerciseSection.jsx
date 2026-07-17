// One exercise inside the active session: header (name, muscle chip, targets,
// reorder, superset link, remove), a live tally + target progress bar, the
// overload nudge, and the SetLogger. Ports the web ExerciseSection.
import { View, Text, StyleSheet } from 'react-native';
import { units } from '@opus/core';
import Icon from '../Icon';
import PressScale from '../PressScale';
import { radius, space, fonts } from '../../theme';
import { useColors, useThemedStyles } from '../../native/ThemeProvider';
import SetLogger from './SetLogger';
import OverloadNudge from './OverloadNudge';

const MUSCLE_HUE = {
  chest: '#D4622A', triceps: '#D4622A', 'front-deltoids': '#D4622A',
  biceps: '#C9A84C', forearm: '#C9A84C',
  'upper-back': '#6B8F71', 'lower-back': '#6B8F71', trapezius: '#6B8F71', 'back-deltoids': '#6B8F71',
  quadriceps: '#8A8780', hamstring: '#8A8780', gluteal: '#8A8780', calves: '#8A8780',
  abs: '#C9A84C', obliques: '#C9A84C',
};

export default function ExerciseSection({
  exercise, unit = 'kg', fromTemplate = false,
  canLink, linked, onToggleSuperset, onMoveUp, onMoveDown, canMoveUp, canMoveDown, onRemove, onSetLogged,
}) {
  const colors = useColors();
  const s = useThemedStyles(makeStyles);
  const hue = MUSCLE_HUE[exercise.muscleGroup] ?? '#8A8780';

  const working = exercise.sets.filter((x) => !x.isWarmup);
  const setCount = working.length;
  const totalReps = working.reduce((a, x) => a + (x.reps || 0), 0);
  const volKg = working.reduce((a, x) => a + (x.weight || 0) * (x.reps || 0), 0);
  const targetSets = exercise.targetSets || null;
  const progress = targetSets ? Math.min(setCount / targetSets, 1) : null;
  const hasTargets = exercise.targetSets || exercise.targetReps || exercise.targetWeight;

  return (
    <View style={s.card}>
      <View style={s.header}>
        <View style={{ flex: 1 }}>
          <Text style={s.name}>{exercise.name}</Text>
          {!!exercise.muscleGroup && (
            <View style={[s.hueChip, { backgroundColor: hue + '22' }]}>
              <Text style={[s.hueText, { color: hue }]}>{String(exercise.muscleGroup).replace(/-/g, ' ')}</Text>
            </View>
          )}
          {hasTargets && (
            <Text style={s.target}>
              Target: {exercise.targetSets ?? '—'}×{exercise.targetReps ?? '—'}
              {exercise.targetWeight ? ` @ ${units.toDisplay(exercise.targetWeight, unit)}${units.unitLabel(unit)}` : ''}
            </Text>
          )}
        </View>
        <View style={s.actions}>
          <View>
            <PressScale hitSlop={6} onPress={onMoveUp} disabled={!canMoveUp} style={{ opacity: canMoveUp ? 1 : 0.25 }}>
              <Icon name="chevron-up" size={16} color={colors.ash} />
            </PressScale>
            <PressScale hitSlop={6} onPress={onMoveDown} disabled={!canMoveDown} style={{ opacity: canMoveDown ? 1 : 0.25 }}>
              <Icon name="chevron-down" size={16} color={colors.ash} />
            </PressScale>
          </View>
          {canLink && (
            <PressScale sound="tap" onPress={onToggleSuperset} style={[s.linkBtn, linked && { backgroundColor: colors.gold }]}>
              <Text style={[s.linkText, linked && { color: colors.obsidian }]}>{linked ? 'Superset' : 'Link'}</Text>
            </PressScale>
          )}
          <PressScale hitSlop={6} onPress={onRemove} style={s.removeBtn}>
            <Icon name="close" size={14} color={colors.ash} />
          </PressScale>
        </View>
      </View>

      {(setCount > 0 || targetSets) && (
        <View style={{ marginTop: space(3) }}>
          <Text style={s.tally}>
            {setCount} set{setCount === 1 ? '' : 's'}{targetSets ? ` / ${targetSets}` : ''}
            {totalReps > 0 ? ` · ${totalReps} reps` : ''}
            {volKg > 0 ? ` · ${units.fmtVolume(volKg, unit)}` : ''}
          </Text>
          {progress != null && (
            <View style={s.progTrack}>
              <View style={[s.progFill, { width: `${progress * 100}%`, backgroundColor: progress >= 1 ? colors.sage : colors.gold }]} />
            </View>
          )}
        </View>
      )}

      <View style={{ marginTop: space(3) }}>
        <OverloadNudge exerciseName={exercise.name} />
      </View>

      <SetLogger exercise={exercise} unit={unit} fromTemplate={fromTemplate} onSetLogged={() => onSetLogged?.(exercise.name)} />
    </View>
  );
}

const makeStyles = (colors) => StyleSheet.create({
  card: { backgroundColor: colors.chalk, borderColor: colors.ivory, borderWidth: 1, borderRadius: radius.xl, paddingHorizontal: space(4), paddingTop: space(3), paddingBottom: space(4), marginBottom: space(4) },
  header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  name: { color: colors.textPrimary, fontFamily: fonts.sansSemi, fontSize: 16 },
  hueChip: { alignSelf: 'flex-start', borderRadius: radius.full, paddingHorizontal: space(2), paddingVertical: 2, marginTop: 3 },
  hueText: { fontFamily: fonts.sans, fontSize: 12, textTransform: 'capitalize' },
  target: { color: colors.textSecondary, fontFamily: fonts.mono, fontSize: 12, marginTop: 4 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: space(2), marginLeft: space(2) },
  linkBtn: { flexDirection: 'row', alignItems: 'center', borderRadius: radius.full, paddingHorizontal: space(2), paddingVertical: space(1), backgroundColor: colors.ivory },
  linkText: { color: colors.textSecondary, fontFamily: fonts.sansMedium, fontSize: 11 },
  removeBtn: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.ivory, alignItems: 'center', justifyContent: 'center' },
  tally: { color: colors.textSecondary, fontFamily: fonts.mono, fontSize: 12 },
  progTrack: { marginTop: space(1.5), height: 6, borderRadius: radius.full, backgroundColor: colors.ivory, overflow: 'hidden' },
  progFill: { height: '100%', borderRadius: radius.full },
});
