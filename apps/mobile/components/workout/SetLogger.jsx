// Per-exercise set logger — logged sets (warmup toggle, RPE badge, note, delete),
// an input row (weight + plate-calc toggle · reps with ± steppers · log), plus
// RPE chips, a bodyweight toggle, and a live "+XP / PR!" float. Ports the web
// SetLogger; reads the active exercise from the workoutSession store and writes
// through its actions. Reference line = your best PR (following a routine) or the
// ghost of last session.
import { useRef, useState } from 'react';
import { View, Text, TextInput, StyleSheet, Modal, Animated } from 'react-native';
import { units, rpg } from '@opus/core';
import Icon from '../Icon';
import PressScale from '../PressScale';
import { radius, space, fonts } from '../../theme';
import { useColors, useThemedStyles } from '../../native/ThemeProvider';
import { motionOn } from '../../native/settings';
import { useDbQuery } from '../../native/useDbQuery';
import { getExercisePRs, getLastWorkingSets } from '../../native/db';
import { playCue } from '../../native/sound';
import { tapLight, success as hSuccess } from '../../native/haptics';
import * as session from '../../native/workoutSession';
import PlateCalculator from './PlateCalculator';

const RPE_CHIPS = [6, 7, 8, 9, 10];

export default function SetLogger({ exercise, unit = 'kg', fromTemplate = false, onSetLogged }) {
  const colors = useColors();
  const s = useThemedStyles(makeStyles);
  const name = exercise.name;
  const isBodyweight = !!exercise.isBodyweight;

  const prs = useDbQuery(() => getExercisePRs(name), [name], []);
  const lastSets = useDbQuery(() => getLastWorkingSets(name), [name], []);
  const weightPR = prs.find((p) => p.type === 'weight');
  const repsPR = prs.find((p) => p.type === 'reps');
  const volPR = prs.find((p) => p.type === 'volume');
  const showPR = fromTemplate && (weightPR || repsPR);

  const [weight, setWeight] = useState('');
  const [reps, setReps] = useState('');
  const [rpe, setRpe] = useState(null);
  const [showRpe, setShowRpe] = useState(false);
  const [showRpeInfo, setShowRpeInfo] = useState(false);
  const [showPlates, setShowPlates] = useState(false);
  const [addWeight, setAddWeight] = useState(false);
  const [noteFor, setNoteFor] = useState(null); // {setNumber, value}

  // XP float animation
  const floatY = useRef(new Animated.Value(0)).current;
  const floatO = useRef(new Animated.Value(0)).current;
  const [floatData, setFloatData] = useState(null);

  const showWeight = !isBodyweight || addWeight;
  const weightNum = parseFloat(weight);
  const repsNum = parseInt(reps, 10);
  const canLog = showWeight ? weightNum > 0 || repsNum > 0 : repsNum > 0;

  const stepReps = (d) => setReps((r) => String(Math.max(0, (parseInt(r, 10) || 0) + d)));

  const fireFloat = (xp, pr) => {
    if (!motionOn()) return;
    setFloatData({ xp, pr });
    floatY.setValue(0);
    floatO.setValue(1);
    Animated.parallel([
      Animated.timing(floatY, { toValue: -34, duration: 900, useNativeDriver: true }),
      Animated.timing(floatO, { toValue: 0, duration: 900, useNativeDriver: true }),
    ]).start(() => setFloatData(null));
  };

  const handleLog = () => {
    if (!canLog) return;
    const weightKg = showWeight ? units.toKg(weightNum || 0, unit) : 0;
    const r = repsNum || 0;
    const working = exercise.sets.filter((x) => !x.isWarmup);
    const bestWeight = Math.max(weightPR?.value ?? 0, ...working.map((x) => x.weight), 0);
    const bestReps = Math.max(repsPR?.value ?? 0, ...working.map((x) => x.reps), 0);
    const bestVol = Math.max(volPR?.value ?? 0, ...working.map((x) => x.weight * x.reps), 0);
    const isPR = (weightKg > 0 || r > 0) && (weightKg > bestWeight || r > bestReps || weightKg * r > bestVol);

    session.logSet(name, { weight: weightKg, reps: r, rpe: showRpe ? rpe : null, isWarmup: false });
    if (isPR) hSuccess(); else tapLight();
    playCue(isPR ? 'pr' : 'tick');
    fireFloat(rpg.calcSetXP(weightKg, r), isPR);
    onSetLogged?.();
    setReps('');
    setRpe(null);
  };

  const fmt = (x) => (x.weight > 0 ? `${units.toDisplay(x.weight, unit)}${units.unitLabel(unit)} × ${x.reps}` : `${x.reps} reps`);

  return (
    <View style={{ marginTop: space(3) }}>
      {/* Reference line */}
      {showPR ? (
        <View style={s.refRow}>
          <Icon name="trophy" size={12} color={colors.gold} />
          <Text style={s.refGold}>
            {weightPR ? `${units.toDisplay(weightPR.value, unit)}${units.unitLabel(unit)}` : ''}
            {weightPR && repsPR ? ' · ' : ''}
            {repsPR ? `${repsPR.value} reps` : ''}
          </Text>
          <Text style={s.refMuted}>your best</Text>
        </View>
      ) : lastSets.length > 0 ? (
        <View style={s.ghostRow}>
          {lastSets.map((x, i) => (
            <Text key={i} style={s.ghost}>{x.weight > 0 ? `${units.toDisplay(x.weight, unit)}×${x.reps}` : `${x.reps}`}</Text>
          ))}
          <Text style={s.refMuted}>last session</Text>
        </View>
      ) : null}

      {/* Logged sets */}
      {exercise.sets.map((x) => (
        <View key={x.setNumber} style={s.setRow}>
          <View style={s.setLine}>
            <Text
              onPress={() => session.toggleWarmup(name, x.setNumber)}
              style={[s.setBadge, x.isWarmup && { backgroundColor: '#D4622A22' }]}
            >
              {x.isWarmup ? '🔥' : x.setNumber}
            </Text>
            <Text style={s.setText}>{fmt(x)}</Text>
            {x.rpe ? <Text style={s.rpeBadge}>RPE {x.rpe}</Text> : null}
            <PressScale hitSlop={8} onPress={() => setNoteFor({ setNumber: x.setNumber, value: x.note || '' })}>
              <Icon name="list" size={15} color={x.note ? colors.gold : colors.ash} />
            </PressScale>
            <PressScale hitSlop={8} onPress={() => session.removeSet(name, x.setNumber)}>
              <Icon name="close" size={15} color={colors.ash} />
            </PressScale>
          </View>
          {x.note ? <Text style={s.noteText}>{x.note}</Text> : null}
        </View>
      ))}

      {/* Input row */}
      <View style={s.inputRow}>
        {floatData && (floatData.xp > 0 || floatData.pr) && (
          <Animated.Text style={[s.xpFloat, { opacity: floatO, transform: [{ translateY: floatY }] }]}>
            {floatData.pr ? '🏆 PR! ' : ''}{floatData.xp > 0 ? `+${floatData.xp} XP` : ''}
          </Animated.Text>
        )}
        {showWeight && (
          <>
            <View style={s.field}>
              <TextInput
                value={weight}
                onChangeText={(v) => { setWeight(v); setShowPlates(false); }}
                placeholder={units.unitLabel(unit)}
                placeholderTextColor={colors.ash}
                keyboardType="decimal-pad"
                style={s.input}
              />
              {weightNum > 0 && (
                <PressScale hitSlop={8} onPress={() => setShowPlates((v) => !v)}>
                  <Icon name="barbell" size={15} color={showPlates ? colors.gold : colors.ash} />
                </PressScale>
              )}
            </View>
            <Text style={s.times}>×</Text>
          </>
        )}
        <View style={s.field}>
          <Text onPress={() => stepReps(-1)} style={s.stepBtn}>−</Text>
          <TextInput
            value={reps}
            onChangeText={setReps}
            placeholder="reps"
            placeholderTextColor={colors.ash}
            keyboardType="number-pad"
            style={[s.input, { textAlign: 'center' }]}
          />
          <Text onPress={() => stepReps(1)} style={s.stepBtn}>+</Text>
        </View>
        <Text
          onPress={handleLog}
          style={[s.logBtn, !canLog && { opacity: 0.35 }]}
        >＋</Text>
      </View>

      {/* Toggles */}
      <View style={s.toggles}>
        <Text style={s.toggleLink} onPress={() => setShowRpe((v) => !v)}>{showRpe ? 'Hide effort' : '+ Add effort (RPE)'}</Text>
        <PressScale hitSlop={8} onPress={() => setShowRpeInfo((v) => !v)}>
          <Icon name="shield-checkmark" size={14} color={colors.ash} />
        </PressScale>
        {isBodyweight && (
          <Text style={[s.toggleLink, { marginLeft: 'auto' }]} onPress={() => { setAddWeight((v) => !v); setWeight(''); setShowPlates(false); }}>
            {addWeight ? 'Bodyweight only' : '+ Add weight'}
          </Text>
        )}
      </View>

      {showRpeInfo && (
        <Text style={s.rpeInfo}>
          <Text style={{ color: colors.textPrimary, fontFamily: fonts.sansSemi }}>RPE</Text> = how hard the set felt, 1–10. Think "reps left in the tank": 10 = all-out, 9 ≈ 1 left, 8 ≈ 2 left. Optional — it tracks intensity over time.
        </Text>
      )}

      {showRpe && (
        <View style={s.rpeChips}>
          {RPE_CHIPS.map((n) => (
            <Text key={n} onPress={() => setRpe(rpe === n ? null : n)} style={[s.rpeChip, rpe === n && s.rpeChipActive]}>{n}</Text>
          ))}
        </View>
      )}

      {showPlates && weightNum > 0 && (
        <View style={{ marginTop: space(2) }}>
          <PlateCalculator weight={units.toKg(weightNum, unit)} />
        </View>
      )}

      {/* Note editor */}
      <Modal visible={!!noteFor} transparent animationType="fade" onRequestClose={() => setNoteFor(null)}>
        <View style={s.noteBackdrop}>
          <View style={s.noteCard}>
            <Text style={s.noteTitle}>Set note</Text>
            <TextInput
              value={noteFor?.value ?? ''}
              onChangeText={(v) => setNoteFor((n) => ({ ...n, value: v }))}
              placeholder="e.g. last rep was a grind"
              placeholderTextColor={colors.ash}
              style={s.noteInput}
              multiline
            />
            <View style={{ flexDirection: 'row', gap: space(3), marginTop: space(3) }}>
              <Text style={s.noteCancel} onPress={() => setNoteFor(null)}>Cancel</Text>
              <Text style={s.noteSave} onPress={() => { session.setSetNote(name, noteFor.setNumber, noteFor.value.trim()); setNoteFor(null); }}>Save</Text>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const makeStyles = (colors) => StyleSheet.create({
  refRow: { flexDirection: 'row', alignItems: 'center', gap: space(1.5), marginBottom: space(2) },
  refGold: { color: colors.gold, fontFamily: fonts.monoMedium, fontSize: 12 },
  refMuted: { color: colors.textSecondary, fontFamily: fonts.sans, fontSize: 12, opacity: 0.7 },
  ghostRow: { flexDirection: 'row', flexWrap: 'wrap', gap: space(3), marginBottom: space(2), alignItems: 'center' },
  ghost: { color: colors.textSecondary, fontFamily: fonts.mono, fontSize: 12 },
  setRow: { backgroundColor: colors.ivory, borderRadius: radius.md, paddingHorizontal: space(3), paddingVertical: space(2), marginBottom: space(1) },
  setLine: { flexDirection: 'row', alignItems: 'center', gap: space(2) },
  setBadge: { width: 24, height: 24, borderRadius: 12, textAlign: 'center', lineHeight: 24, color: colors.ash, fontFamily: fonts.mono, fontSize: 12, overflow: 'hidden' },
  setText: { flex: 1, color: colors.textPrimary, fontFamily: fonts.mono, fontSize: 14 },
  rpeBadge: { color: colors.ash, fontFamily: fonts.mono, fontSize: 11 },
  noteText: { marginTop: 2, paddingLeft: 32, color: colors.textSecondary, fontFamily: fonts.sans, fontSize: 12, fontStyle: 'italic' },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: space(1.5), marginTop: space(2) },
  field: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: colors.ivory, borderRadius: radius.md, paddingHorizontal: space(2) },
  input: { flex: 1, color: colors.textPrimary, fontFamily: fonts.mono, fontSize: 14, paddingVertical: space(2.5) },
  stepBtn: { paddingHorizontal: space(2), color: colors.ash, fontSize: 20, fontFamily: fonts.sans },
  times: { color: colors.ash, fontFamily: fonts.sans, fontSize: 14 },
  logBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.gold, color: colors.obsidian, textAlign: 'center', lineHeight: 40, fontSize: 20, overflow: 'hidden' },
  xpFloat: { position: 'absolute', right: 4, top: -2, color: colors.gold, fontFamily: fonts.monoMedium, fontSize: 14, zIndex: 10 },
  toggles: { flexDirection: 'row', alignItems: 'center', gap: space(4), marginTop: space(1.5) },
  toggleLink: { color: colors.textSecondary, fontFamily: fonts.sans, fontSize: 12 },
  rpeInfo: { marginTop: space(2), backgroundColor: colors.ivory, borderRadius: radius.md, paddingHorizontal: space(3), paddingVertical: space(2), color: colors.textSecondary, fontFamily: fonts.sans, fontSize: 12, lineHeight: 17 },
  rpeChips: { flexDirection: 'row', gap: space(1.5), marginTop: space(2) },
  rpeChip: { flex: 1, textAlign: 'center', paddingVertical: space(2.5), borderRadius: radius.sm, backgroundColor: colors.ivory, color: colors.textPrimary, fontFamily: fonts.mono, fontSize: 14, overflow: 'hidden' },
  rpeChipActive: { backgroundColor: colors.gold, color: colors.obsidian },
  noteBackdrop: { flex: 1, backgroundColor: 'rgba(17,16,16,0.72)', alignItems: 'center', justifyContent: 'center', padding: space(6) },
  noteCard: { backgroundColor: colors.chalk, borderRadius: radius.xl, padding: space(5), width: '100%' },
  noteTitle: { color: colors.textPrimary, fontFamily: fonts.displaySemi, fontSize: 20 },
  noteInput: { backgroundColor: colors.ivory, borderRadius: radius.md, paddingHorizontal: space(4), paddingVertical: space(3), marginTop: space(3), color: colors.textPrimary, fontFamily: fonts.sans, fontSize: 14, minHeight: 60 },
  noteCancel: { flex: 1, textAlign: 'center', paddingVertical: space(3), color: colors.textSecondary, fontFamily: fonts.sansSemi, fontSize: 15, backgroundColor: colors.ivory, borderRadius: radius.lg, overflow: 'hidden' },
  noteSave: { flex: 1, textAlign: 'center', paddingVertical: space(3), color: colors.obsidian, fontFamily: fonts.sansSemi, fontSize: 15, backgroundColor: colors.gold, borderRadius: radius.lg, overflow: 'hidden' },
});
