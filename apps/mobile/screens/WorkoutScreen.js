import { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, FlatList } from 'react-native';
import { Screen, H1, Label } from '../ui';
import { colors, radius, space } from '../theme';

export default function WorkoutScreen() {
  const [weight, setWeight] = useState('');
  const [reps, setReps] = useState('');
  const [sets, setSets] = useState([]);

  const log = () => {
    const w = parseFloat(weight) || 0;
    const r = parseInt(reps) || 0;
    if (w <= 0 && r <= 0) return;
    setSets((prev) => [...prev, { w, r, n: prev.length + 1 }]);
    setReps('');
  };

  const volume = sets.reduce((a, s) => a + s.w * s.r, 0);

  return (
    <Screen scroll={false}>
      <View style={{ padding: space(5), gap: space(4), flex: 1 }}>
        <View>
          <H1>Workout</H1>
          <Label style={{ marginTop: 4 }}>{sets.length} sets · {Math.round(volume)} kg volume</Label>
        </View>

        <View style={styles.inputRow}>
          <TextInput value={weight} onChangeText={setWeight} keyboardType="decimal-pad" placeholder="kg" placeholderTextColor={colors.ash} style={styles.input} />
          <Text style={styles.x}>×</Text>
          <TextInput value={reps} onChangeText={setReps} keyboardType="number-pad" placeholder="reps" placeholderTextColor={colors.ash} style={styles.input} />
          <Pressable style={styles.add} onPress={log}><Text style={styles.addText}>+</Text></Pressable>
        </View>

        <FlatList
          data={[...sets].reverse()}
          keyExtractor={(s) => String(s.n)}
          contentContainerStyle={{ gap: space(2) }}
          renderItem={({ item }) => (
            <View style={styles.set}>
              <Text style={styles.setNum}>{item.n}</Text>
              <Text style={styles.setVal}>{item.w > 0 ? `${item.w} kg × ${item.r}` : `${item.r} reps`}</Text>
            </View>
          )}
          ListEmptyComponent={<Text style={styles.empty}>Log your first set above.</Text>}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: space(2) },
  input: { flex: 1, backgroundColor: colors.chalk, borderColor: colors.ivory, borderWidth: 1, borderRadius: radius.lg, paddingHorizontal: space(4), paddingVertical: space(3), color: colors.textPrimary, fontSize: 15, textAlign: 'center' },
  x: { color: colors.ash, fontSize: 16 },
  add: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.gold, alignItems: 'center', justifyContent: 'center' },
  addText: { color: colors.obsidian, fontSize: 24, fontWeight: '700' },
  set: { flexDirection: 'row', alignItems: 'center', gap: space(3), backgroundColor: colors.chalk, borderColor: colors.ivory, borderWidth: 1, borderRadius: radius.md, paddingHorizontal: space(4), paddingVertical: space(3) },
  setNum: { color: colors.ash, fontVariant: ['tabular-nums'], width: 20 },
  setVal: { color: colors.textPrimary, fontVariant: ['tabular-nums'], fontSize: 15 },
  empty: { color: colors.textSecondary, fontSize: 14, textAlign: 'center', marginTop: space(6) },
});
