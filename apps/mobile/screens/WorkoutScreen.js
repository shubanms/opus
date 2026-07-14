import { useCallback, useState } from 'react';
import { View, Text, TextInput, StyleSheet, FlatList, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { oneRepMax } from '@opus/core';
import { Screen, H1, H2, Label, Mono } from '../ui';
import { colors, radius, space, fonts } from '../theme';
import PressScale from '../components/PressScale';
import { GoldButton } from '../components/Button';
import Particles from '../components/fx/Particles';
import RestTimer from '../components/workout/RestTimer';
import EndWorkoutModal from '../components/workout/EndWorkoutModal';
import ExercisePicker from '../components/workout/ExercisePicker';
import PlateCalculator from '../components/workout/PlateCalculator';
import {
  getActiveWorkout,
  getOrCreateActiveWorkout,
  addSet as dbAddSet,
  deleteSet as dbDeleteSet,
  getSets,
  finishWorkout,
  discardWorkout,
  priorBestE1rm,
  addPR,
  getWorkoutSummary,
  syncAchievements,
} from '../native/db';
import { refreshWidgets } from '../native/widgets';
import { playCue } from '../native/sound';
import { success as hSuccess, warning as hWarning } from '../native/haptics';

export default function WorkoutScreen({ navigation, route }) {
  const [workout, setWorkout] = useState(null);
  const [sets, setSets] = useState([]);
  const [exercise, setExercise] = useState('');
  const [weight, setWeight] = useState('');
  const [reps, setReps] = useState('');
  const [burst, setBurst] = useState(0); // increment to fire a particle burst
  const [restKey, setRestKey] = useState(0); // >0 shows the rest timer (remounts per rest)
  const [end, setEnd] = useState(null); // { summary, prs } → end-of-workout modal
  const [pickerOpen, setPickerOpen] = useState(false);

  useFocusEffect(
    useCallback(() => {
      try {
        const active = getActiveWorkout();
        setWorkout(active);
        setSets(active ? getSets(active.id) : []);
      } catch {
        setWorkout(null);
        setSets([]);
      }
      const picked = route?.params?.exercise;
      if (picked) {
        setExercise(picked);
        navigation.setParams({ exercise: undefined });
      }
    }, [route?.params?.exercise])
  );

  const log = () => {
    const w = parseFloat(weight) || 0;
    const r = parseInt(reps, 10) || 0;
    if (w <= 0 && r <= 0) return;
    try {
      const wk = workout || getOrCreateActiveWorkout();
      if (!workout) setWorkout(wk);
      dbAddSet(wk.id, { exerciseName: exercise.trim(), weight: w, reps: r });
      setSets(getSets(wk.id));
      setReps('');
      playCue('tick');
      setRestKey((k) => k + 1); // start/restart the rest timer
    } catch (e) {
      Alert.alert('Error', String(e?.message || e));
    }
  };

  const removeSet = (id) => {
    try {
      dbDeleteSet(id);
      setSets(workout ? getSets(workout.id) : []);
      playCue('delete');
    } catch {}
  };

  const finish = () => {
    if (!workout) return;
    const workoutId = workout.id;
    // PR check: best e1rm per exercise this session vs its prior best. Compute
    // from the in-memory sets BEFORE finishing (priorBestE1rm excludes this id).
    const prs = [];
    try {
      const byEx = {};
      for (const st of sets) {
        if (!st.exerciseName || !st.weight) continue;
        const e = oneRepMax.epley1RM(st.weight, st.reps);
        byEx[st.exerciseName] = Math.max(byEx[st.exerciseName] || 0, e);
      }
      for (const [name, e] of Object.entries(byEx)) {
        if (e > priorBestE1rm(name, workoutId) + 0.01) prs.push({ exerciseName: name, value: e });
      }
    } catch {}

    const kept = finishWorkout(workoutId);
    setWorkout(null);
    setSets([]);
    setExercise('');
    setRestKey(0);
    refreshWidgets();

    if (!kept) {
      Alert.alert('Nothing to save', 'No sets were logged.');
      return;
    }

    // Persist each PR (so Hall of Records / Progress show them), then detect any
    // newly-earned achievements (persist + award XP), then celebrate.
    let newAchievements = [];
    try {
      for (const p of prs) addPR({ exerciseName: p.exerciseName, type: 'e1rm', value: p.value, workoutId });
      newAchievements = syncAchievements();
    } catch {}
    hSuccess();
    playCue(prs.length || newAchievements.length ? 'chime' : 'success');
    setBurst((b) => b + 1);
    setEnd({ summary: getWorkoutSummary(workoutId), prs, achievements: newAchievements });
  };

  const closeEnd = () => {
    setEnd(null);
    navigation.navigate('Home');
  };

  const discard = () => {
    if (!workout) return;
    Alert.alert('Discard workout?', 'This deletes the logged sets.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Discard',
        style: 'destructive',
        onPress: () => {
          discardWorkout(workout.id);
          setWorkout(null);
          setSets([]);
          hWarning();
          playCue('delete');
        },
      },
    ]);
  };

  const volume = sets.reduce((a, st) => a + (st.weight || 0) * (st.reps || 0), 0);

  return (
    <Screen scroll={false}>
      <View style={{ padding: space(5), gap: space(4), flex: 1 }}>
        <View style={s.head}>
          <View>
            <H1>Workout</H1>
            <Label style={{ marginTop: 4 }}>{sets.length} sets · {Math.round(volume)} kg volume</Label>
          </View>
          {sets.length > 0 && (
            <PressScale sound="success" onPress={finish} style={s.finish}>
              <Text style={s.finishText}>Finish</Text>
            </PressScale>
          )}
        </View>

        <View style={s.exerciseRow}>
          <TextInput
            value={exercise}
            onChangeText={setExercise}
            placeholder="Exercise (e.g. Bench Press)"
            placeholderTextColor={colors.ash}
            style={[s.exercise, { flex: 1 }]}
          />
          <PressScale onPress={() => setPickerOpen(true)} sound="tap" style={s.browse}>
            <Ionicons name="list" size={22} color={colors.textPrimary} />
          </PressScale>
        </View>

        <View style={s.inputRow}>
          <TextInput value={weight} onChangeText={setWeight} keyboardType="decimal-pad" placeholder="kg" placeholderTextColor={colors.ash} style={s.input} />
          <Text style={s.x}>×</Text>
          <TextInput value={reps} onChangeText={setReps} keyboardType="number-pad" placeholder="reps" placeholderTextColor={colors.ash} style={s.input} />
          <PressScale onPress={log} style={s.add}><Ionicons name="add" size={26} color={colors.obsidian} /></PressScale>
        </View>

        {parseFloat(weight) > 0 && <PlateCalculator weight={parseFloat(weight)} />}

        {restKey > 0 && <RestTimer key={restKey} onDone={() => setRestKey(0)} />}

        <FlatList
          data={[...sets].reverse()}
          keyExtractor={(st) => String(st.id)}
          contentContainerStyle={{ gap: space(2), paddingBottom: space(4) }}
          renderItem={({ item, index }) => (
            <View style={s.set}>
              <Mono style={s.setNum}>{sets.length - index}</Mono>
              <View style={{ flex: 1 }}>
                {!!item.exerciseName && <Text style={s.setName}>{item.exerciseName}</Text>}
                <Mono style={s.setVal}>{item.weight > 0 ? `${item.weight} kg × ${item.reps}` : `${item.reps} reps`}</Mono>
              </View>
              <PressScale hitSlop={10} onPress={() => removeSet(item.id)}>
                <Ionicons name="close" size={18} color={colors.ash} />
              </PressScale>
            </View>
          )}
          ListEmptyComponent={<H2 style={s.empty}>Log your first set.</H2>}
        />

        {sets.length > 0 && (
          <>
            <GoldButton label="Finish workout" icon="checkmark" sound="success" onPress={finish} />
            <PressScale onPress={discard}><Text style={s.discard}>Discard workout</Text></PressScale>
          </>
        )}
      </View>
      {burst > 0 && <Particles key={burst} origin={{ x: 180, y: 260 }} spread={160} />}
      <EndWorkoutModal visible={!!end} summary={end?.summary} prs={end?.prs || []} achievements={end?.achievements || []} onClose={closeEnd} />
      <ExercisePicker visible={pickerOpen} onClose={() => setPickerOpen(false)} onPick={setExercise} />
    </Screen>
  );
}

const s = StyleSheet.create({
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  finish: { backgroundColor: colors.sage, borderRadius: radius.lg, paddingHorizontal: space(5), paddingVertical: space(3) },
  finishText: { color: colors.textInverse, fontFamily: fonts.sansSemi, fontSize: 14 },
  exerciseRow: { flexDirection: 'row', alignItems: 'center', gap: space(2) },
  exercise: { backgroundColor: colors.chalk, borderColor: colors.ivory, borderWidth: 1, borderRadius: radius.lg, paddingHorizontal: space(4), paddingVertical: space(3.5), color: colors.textPrimary, fontFamily: fonts.sans, fontSize: 15 },
  browse: { width: 50, height: 50, borderRadius: radius.lg, backgroundColor: colors.ivory, alignItems: 'center', justifyContent: 'center' },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: space(2) },
  input: { flex: 1, backgroundColor: colors.chalk, borderColor: colors.ivory, borderWidth: 1, borderRadius: radius.lg, paddingHorizontal: space(4), paddingVertical: space(3.5), color: colors.textPrimary, fontFamily: fonts.mono, fontSize: 15, textAlign: 'center' },
  x: { color: colors.ash, fontSize: 16 },
  add: { width: 50, height: 50, borderRadius: 25, backgroundColor: colors.gold, alignItems: 'center', justifyContent: 'center' },
  set: { flexDirection: 'row', alignItems: 'center', gap: space(3), backgroundColor: colors.chalk, borderColor: colors.ivory, borderWidth: 1, borderRadius: radius.md, paddingHorizontal: space(4), paddingVertical: space(3) },
  setNum: { color: colors.ash, width: 20, fontSize: 14 },
  setName: { color: colors.textPrimary, fontFamily: fonts.sansSemi, fontSize: 14 },
  setVal: { color: colors.textSecondary, fontSize: 14, marginTop: 1 },
  empty: { color: colors.textSecondary, textAlign: 'center', marginTop: space(6) },
  discard: { color: colors.ember, fontFamily: fonts.sansMedium, fontSize: 13, textAlign: 'center', paddingVertical: space(2) },
});
