// The logging screen — a section-based session (one card per exercise) mirroring
// the web WorkoutPage. The in-progress session lives in the workoutSession store
// (in memory + snapshot); nothing is written to SQLite until Finish, which calls
// commitWorkout. Supersets bracket adjacent linked exercises; rest starts after
// each logged set except a non-last superset move.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, TextInput, StyleSheet, ScrollView, Alert } from 'react-native';
import Icon from '../components/Icon';
import { units, supersets, dateKey } from '@opus/core';
import { useSettings } from '../native/settings';
import { Screen, H1, H2, Label, Body } from '../ui';
import { radius, space, fonts } from '../theme';
import { useColors, useThemedStyles } from '../native/ThemeProvider';
import PressScale from '../components/PressScale';
import { GoldButton, SecondaryButton } from '../components/Button';
import Particles from '../components/fx/Particles';
import RestTimer from '../components/workout/RestTimer';
import ExerciseSection from '../components/workout/ExerciseSection';
import EndWorkoutModal from '../components/workout/EndWorkoutModal';
import ExercisePicker from '../components/workout/ExercisePicker';
import TemplatesModal from '../components/workout/TemplatesModal';
import LevelUpScreen from '../components/rpg/LevelUpScreen';
import { getExercises, commitWorkout } from '../native/db';
import * as session from '../native/workoutSession';
import { useWorkoutSession } from '../native/workoutSession';
import { refreshWidgets } from '../native/widgets';
import { playCue } from '../native/sound';
import { success as hSuccess, warning as hWarning } from '../native/haptics';

const ENERGY = [1, 2, 3, 4, 5];

function ElapsedTimer({ startedAt, style }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const secs = Math.max(0, Math.round((now - startedAt) / 1000));
  const m = Math.floor(secs / 60);
  const h = Math.floor(m / 60);
  const label = h > 0 ? `${h}:${String(m % 60).padStart(2, '0')}:${String(secs % 60).padStart(2, '0')}` : `${m}:${String(secs % 60).padStart(2, '0')}`;
  return <Text style={style}>{label}</Text>;
}

export default function WorkoutScreen({ navigation }) {
  const colors = useColors();
  const s = useThemedStyles(makeStyles);
  const { settings } = useSettings();
  const unit = settings.unit || 'kg';
  const active = useWorkoutSession();

  const [newExercise, setNewExercise] = useState('');
  const [restKey, setRestKey] = useState(0);
  const [burst, setBurst] = useState(0);
  const [end, setEnd] = useState(null);
  const [levelUp, setLevelUp] = useState(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [templatesOpen, setTemplatesOpen] = useState(false);

  // Catalog lookup (name → {muscleGroup, equipment}) for enriching added exercises.
  const catalog = useMemo(() => {
    try { return new Map(getExercises().map((e) => [e.name, e])); } catch { return new Map(); }
  }, []);
  const resolve = useCallback((name) => {
    const c = catalog.get(name);
    return { name, muscleGroup: c?.muscleGroup ?? null, equipment: c?.equipment ?? null };
  }, [catalog]);

  const runs = useMemo(() => (active ? supersets.supersetRuns(active.exercises) : []), [active]);
  const noRest = useMemo(() => (active ? supersets.noRestIds(active.exercises) : new Set()), [active]);

  const addExercise = (name) => {
    const n = (name || '').trim();
    if (!n) return;
    session.ensureSession();
    session.addExercise(resolve(n));
    setNewExercise('');
    playCue('tap');
  };

  const onSetLogged = (name) => {
    setRestKey((k) => k + 1);
    if (noRest.has(name)) setRestKey(0); // superset internal move → no rest yet
  };

  const startFromTemplate = (t) => {
    session.startFromTemplate({
      name: t.name,
      templateId: t.id,
      exercises: (t.exercises || []).map((n) => resolve(n)),
    });
  };

  const finish = () => {
    if (!active) return;
    const result = commitWorkout(active);
    if (result.discarded) {
      Alert.alert('Nothing to save', 'Log at least one working set first.');
      return;
    }
    session.discardSession();
    refreshWidgets();
    hSuccess();
    playCue(result.prCount ? 'pr' : result.newAchievements.length ? 'achievement' : 'success');
    setBurst((b) => b + 1);

    // Build the shareable-workout payload (top PR = heaviest-weight record).
    const muscles = [...new Set(active.exercises.map((e) => e.muscleGroup).filter(Boolean))];
    const topPr = result.prs.find((p) => p.type === 'weight') || result.prs[0] || null;
    const shareData = {
      name: active.name || 'Workout',
      athlete: settings.name || null,
      date: dateKey.todayKey(),
      duration: result.summary.durationSec,
      totalVolume: result.summary.totalVolume,
      totalSets: result.summary.totalSets,
      xpEarned: result.summary.xpEarned,
      muscles,
      pr: topPr ? { exercise: topPr.exerciseName, value: topPr.value } : null,
      level: result.newLevel,
      unit,
    };

    setEnd({ summary: result.summary, prs: result.prs, achievements: result.newAchievements, shareData });
    if (result.leveledUp) setLevelUp(result.newLevel);
  };

  const closeEnd = () => {
    setEnd(null);
    navigation.navigate('Home');
  };

  const discard = () => {
    if (!active) return;
    Alert.alert('Discard workout?', 'This clears the current session.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Discard', style: 'destructive', onPress: () => { session.discardSession(); hWarning(); playCue('delete'); } },
    ]);
  };

  const totalSets = active ? active.exercises.reduce((a, e) => a + e.sets.filter((x) => !x.isWarmup).length, 0) : 0;
  const totalVol = active ? active.exercises.reduce((a, e) => a + e.sets.filter((x) => !x.isWarmup).reduce((b, x) => b + (x.weight || 0) * (x.reps || 0), 0), 0) : 0;

  // ── Idle (no active session) ────────────────────────────────────────────────
  if (!active) {
    return (
      <Screen>
        <H1>Workout</H1>
        <Body>Start an empty session or run one of your routines.</Body>
        <GoldButton label="Start workout" icon="add" sound="start" onPress={() => session.startSession()} style={{ marginTop: space(2) }} />
        <SecondaryButton label="Routines" icon="layers" onPress={() => setTemplatesOpen(true)} />
        {burst > 0 && <Particles key={burst} origin={{ x: 180, y: 260 }} spread={160} />}
        <EndWorkoutModal visible={!!end} summary={end?.summary} prs={end?.prs || []} achievements={end?.achievements || []} shareData={end?.shareData} onClose={closeEnd} />
        <LevelUpScreen visible={levelUp != null} level={levelUp || 1} onClose={() => setLevelUp(null)} />
        <TemplatesModal visible={templatesOpen} onClose={() => setTemplatesOpen(false)} onStart={startFromTemplate} />
      </Screen>
    );
  }

  // ── Active session ──────────────────────────────────────────────────────────
  return (
    <Screen scroll={false}>
      <View style={{ flex: 1 }}>
        <View style={s.headWrap}>
          <View style={s.head}>
            <TextInput
              value={active.name}
              onChangeText={(v) => session.setName(v)}
              placeholder="Workout"
              placeholderTextColor={colors.ash}
              style={s.nameInput}
            />
            <ElapsedTimer startedAt={active.startedAt} style={s.timer} />
          </View>
          <Label style={{ marginTop: 2 }}>{totalSets} sets · {units.fmtVolume(totalVol, unit)}</Label>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: space(5), paddingTop: space(2), paddingBottom: space(24), gap: space(3) }}>
          {/* Energy check-in */}
          {active.energy == null && (
            <View style={s.energyCard}>
              <Label>How's your energy today?</Label>
              <View style={s.energyRow}>
                {ENERGY.map((n) => (
                  <PressScale key={n} sound="tap" onPress={() => session.setEnergy(n)} style={s.energyBtn}>
                    <Text style={s.energyText}>{n}</Text>
                  </PressScale>
                ))}
              </View>
            </View>
          )}

          {restKey > 0 && <RestTimer key={restKey} onDone={() => setRestKey(0)} />}

          {/* Exercise sections, bracketed by superset runs */}
          {runs.map((run, ri) => {
            const bracket = run.length > 1;
            return (
              <View key={ri} style={bracket ? s.superset : null}>
                {bracket && <Text style={s.supersetLabel}>Superset · {run.length} moves · rest after the last</Text>}
                {run.map((ex) => {
                  const idx = active.exercises.findIndex((e) => e.name === ex.name);
                  const prev = active.exercises[idx - 1];
                  return (
                    <ExerciseSection
                      key={ex.name}
                      exercise={ex}
                      unit={unit}
                      fromTemplate={active.templateId != null}
                      canLink={idx > 0}
                      linked={ex.supersetId != null && prev && ex.supersetId === prev.supersetId}
                      onToggleSuperset={() => session.toggleSuperset(ex.name)}
                      onMoveUp={() => session.moveExercise(ex.name, -1)}
                      onMoveDown={() => session.moveExercise(ex.name, 1)}
                      canMoveUp={idx > 0}
                      canMoveDown={idx < active.exercises.length - 1}
                      onRemove={() => session.removeExercise(ex.name)}
                      onSetLogged={onSetLogged}
                    />
                  );
                })}
              </View>
            );
          })}

          {active.exercises.length === 0 && <H2 style={s.empty}>Add your first exercise.</H2>}

          {/* Add exercise */}
          <View style={s.addRow}>
            <TextInput
              value={newExercise}
              onChangeText={setNewExercise}
              placeholder="Add exercise (e.g. Bench Press)"
              placeholderTextColor={colors.ash}
              style={s.addInput}
              onSubmitEditing={() => addExercise(newExercise)}
              returnKeyType="done"
            />
            <PressScale onPress={() => setPickerOpen(true)} sound="tap" style={s.browse}>
              <Icon name="list" size={22} color={colors.textPrimary} />
            </PressScale>
            <PressScale onPress={() => addExercise(newExercise)} style={s.addBtn}>
              <Icon name="add" size={24} color={colors.obsidian} />
            </PressScale>
          </View>

          {/* Session notes */}
          <View style={s.notesCard}>
            <Label>Session notes</Label>
            <TextInput
              value={active.notes || ''}
              onChangeText={(v) => session.setNotes(v)}
              placeholder="How did it go?"
              placeholderTextColor={colors.ash}
              style={s.notesInput}
              multiline
            />
          </View>

          {/* Finish / discard */}
          <GoldButton label="Finish workout" icon="checkmark" sound="success" onPress={finish} style={{ marginTop: space(2) }} />
          <PressScale onPress={discard}><Text style={s.discard}>Discard workout</Text></PressScale>
        </ScrollView>
      </View>

      {burst > 0 && <Particles key={burst} origin={{ x: 180, y: 260 }} spread={160} />}
      <EndWorkoutModal visible={!!end} summary={end?.summary} prs={end?.prs || []} achievements={end?.achievements || []} shareData={end?.shareData} onClose={closeEnd} />
      <LevelUpScreen visible={levelUp != null} level={levelUp || 1} onClose={() => setLevelUp(null)} />
      <ExercisePicker visible={pickerOpen} onClose={() => setPickerOpen(false)} onPick={(name) => addExercise(name)} />
      <TemplatesModal visible={templatesOpen} onClose={() => setTemplatesOpen(false)} onStart={startFromTemplate} />
    </Screen>
  );
}

const makeStyles = (colors) => StyleSheet.create({
  headWrap: { paddingHorizontal: space(5), paddingTop: space(2) },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  nameInput: { flex: 1, color: colors.textPrimary, fontFamily: fonts.display, fontSize: 30, paddingVertical: 2 },
  timer: { color: colors.gold, fontFamily: fonts.mono, fontSize: 18, marginLeft: space(3) },
  energyCard: { backgroundColor: colors.chalk, borderColor: colors.ivory, borderWidth: 1, borderRadius: radius.xl, padding: space(4) },
  energyRow: { flexDirection: 'row', gap: space(2), marginTop: space(3) },
  energyBtn: { flex: 1, alignItems: 'center', paddingVertical: space(3), borderRadius: radius.md, backgroundColor: colors.ivory },
  energyText: { color: colors.textPrimary, fontFamily: fonts.mono, fontSize: 16 },
  superset: { borderLeftColor: colors.gold, borderLeftWidth: 3, paddingLeft: space(3), marginLeft: space(1) },
  supersetLabel: { color: colors.gold, fontFamily: fonts.sansSemi, fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, marginBottom: space(2) },
  empty: { textAlign: 'center', color: colors.textSecondary, marginVertical: space(6) },
  addRow: { flexDirection: 'row', alignItems: 'center', gap: space(2) },
  addInput: { flex: 1, backgroundColor: colors.chalk, borderColor: colors.ivory, borderWidth: 1, borderRadius: radius.lg, paddingHorizontal: space(4), paddingVertical: space(3.5), color: colors.textPrimary, fontFamily: fonts.sans, fontSize: 15 },
  browse: { width: 50, height: 50, borderRadius: radius.lg, backgroundColor: colors.ivory, alignItems: 'center', justifyContent: 'center' },
  addBtn: { width: 50, height: 50, borderRadius: 25, backgroundColor: colors.gold, alignItems: 'center', justifyContent: 'center' },
  notesCard: { backgroundColor: colors.chalk, borderColor: colors.ivory, borderWidth: 1, borderRadius: radius.xl, padding: space(4) },
  notesInput: { marginTop: space(2), color: colors.textPrimary, fontFamily: fonts.sans, fontSize: 14, minHeight: 44, textAlignVertical: 'top' },
  discard: { textAlign: 'center', color: colors.ember, fontFamily: fonts.sansMedium, fontSize: 14, paddingVertical: space(3) },
});
