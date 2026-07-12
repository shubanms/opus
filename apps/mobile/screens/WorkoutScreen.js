import { useCallback, useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, FlatList, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Screen, H1, Label } from '../ui';
import { colors, radius, space } from '../theme';
import {
  getActiveWorkout,
  getOrCreateActiveWorkout,
  addSet as dbAddSet,
  deleteSet as dbDeleteSet,
  getSets,
  finishWorkout,
  discardWorkout,
} from '../native/db';
import { refreshWidgets } from '../native/widgets';

export default function WorkoutScreen({ navigation, route }) {
  const [workout, setWorkout] = useState(null);
  const [sets, setSets] = useState([]);
  const [exercise, setExercise] = useState('');
  const [weight, setWeight] = useState('');
  const [reps, setReps] = useState('');

  // Re-read the active workout (if any) each time the tab gains focus, and
  // pick up an exercise passed from the Exercises tab.
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
    } catch (e) {
      Alert.alert('Error', String(e?.message || e));
    }
  };

  const removeSet = (id) => {
    try {
      dbDeleteSet(id);
      setSets(workout ? getSets(workout.id) : []);
    } catch {}
  };

  const finish = () => {
    if (!workout) return;
    const kept = finishWorkout(workout.id);
    setWorkout(null);
    setSets([]);
    setExercise('');
    refreshWidgets();
    Alert.alert(
      kept ? 'Workout saved' : 'Nothing to save',
      kept ? 'Great work — your stats updated.' : 'No sets were logged.'
    );
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
        },
      },
    ]);
  };

  const volume = sets.reduce((a, s) => a + (s.weight || 0) * (s.reps || 0), 0);

  return (
    <Screen scroll={false}>
      <View style={{ padding: space(5), gap: space(4), flex: 1 }}>
        <View style={styles.head}>
          <View>
            <H1>Workout</H1>
            <Label style={{ marginTop: 4 }}>{sets.length} sets · {Math.round(volume)} kg volume</Label>
          </View>
          {sets.length > 0 && (
            <Pressable style={styles.finish} onPress={finish}>
              <Text style={styles.finishText}>Finish</Text>
            </Pressable>
          )}
        </View>

        <TextInput
          value={exercise}
          onChangeText={setExercise}
          placeholder="Exercise (e.g. Bench Press)"
          placeholderTextColor={colors.ash}
          style={styles.exercise}
        />

        <View style={styles.inputRow}>
          <TextInput value={weight} onChangeText={setWeight} keyboardType="decimal-pad" placeholder="kg" placeholderTextColor={colors.ash} style={styles.input} />
          <Text style={styles.x}>×</Text>
          <TextInput value={reps} onChangeText={setReps} keyboardType="number-pad" placeholder="reps" placeholderTextColor={colors.ash} style={styles.input} />
          <Pressable style={styles.add} onPress={log}><Text style={styles.addText}>+</Text></Pressable>
        </View>

        <FlatList
          data={[...sets].reverse()}
          keyExtractor={(s) => String(s.id)}
          contentContainerStyle={{ gap: space(2), paddingBottom: space(4) }}
          renderItem={({ item, index }) => (
            <View style={styles.set}>
              <Text style={styles.setNum}>{sets.length - index}</Text>
              <View style={{ flex: 1 }}>
                {!!item.exerciseName && <Text style={styles.setName}>{item.exerciseName}</Text>}
                <Text style={styles.setVal}>{item.weight > 0 ? `${item.weight} kg × ${item.reps}` : `${item.reps} reps`}</Text>
              </View>
              <Pressable hitSlop={10} onPress={() => removeSet(item.id)}>
                <Text style={styles.del}>✕</Text>
              </Pressable>
            </View>
          )}
          ListEmptyComponent={<Text style={styles.empty}>Log your first set above.</Text>}
        />

        {sets.length > 0 && (
          <Pressable onPress={discard}><Text style={styles.discard}>Discard workout</Text></Pressable>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  finish: { backgroundColor: colors.sage, borderRadius: radius.lg, paddingHorizontal: space(5), paddingVertical: space(3) },
  finishText: { color: colors.obsidian, fontWeight: '700', fontSize: 14 },
  exercise: { backgroundColor: colors.chalk, borderColor: colors.ivory, borderWidth: 1, borderRadius: radius.lg, paddingHorizontal: space(4), paddingVertical: space(3), color: colors.textPrimary, fontSize: 15 },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: space(2) },
  input: { flex: 1, backgroundColor: colors.chalk, borderColor: colors.ivory, borderWidth: 1, borderRadius: radius.lg, paddingHorizontal: space(4), paddingVertical: space(3), color: colors.textPrimary, fontSize: 15, textAlign: 'center' },
  x: { color: colors.ash, fontSize: 16 },
  add: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.gold, alignItems: 'center', justifyContent: 'center' },
  addText: { color: colors.obsidian, fontSize: 24, fontWeight: '700' },
  set: { flexDirection: 'row', alignItems: 'center', gap: space(3), backgroundColor: colors.chalk, borderColor: colors.ivory, borderWidth: 1, borderRadius: radius.md, paddingHorizontal: space(4), paddingVertical: space(3) },
  setNum: { color: colors.ash, fontVariant: ['tabular-nums'], width: 20 },
  setName: { color: colors.textPrimary, fontSize: 14, fontWeight: '600' },
  setVal: { color: colors.textSecondary, fontVariant: ['tabular-nums'], fontSize: 14, marginTop: 1 },
  del: { color: colors.ash, fontSize: 16, paddingHorizontal: space(1) },
  empty: { color: colors.textSecondary, fontSize: 14, textAlign: 'center', marginTop: space(6) },
  discard: { color: colors.ember, fontSize: 13, textAlign: 'center', paddingVertical: space(2) },
});
