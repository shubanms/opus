import { useCallback, useMemo, useState } from 'react';
import { View, Text, TextInput, StyleSheet, FlatList, Pressable } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import seedExercises from '@opus/core/seedExercises';
import { Screen, Label } from '../ui';
import { colors, radius, space } from '../theme';
import { getExercises } from '../native/db';

export default function ExercisesScreen({ navigation }) {
  const [q, setQ] = useState('');
  const [all, setAll] = useState([]);

  // Prefer the seeded DB catalog; fall back to the bundled seed list if the DB
  // isn't ready yet (first frame before init completes).
  useFocusEffect(
    useCallback(() => {
      try {
        const rows = getExercises();
        setAll(rows && rows.length ? rows : Array.isArray(seedExercises) ? seedExercises : []);
      } catch {
        setAll(Array.isArray(seedExercises) ? seedExercises : []);
      }
    }, [])
  );

  const data = useMemo(() => {
    const t = q.trim().toLowerCase();
    return t ? all.filter((e) => (e.name || '').toLowerCase().includes(t)) : all;
  }, [q, all]);

  const pick = (name) => navigation.navigate('Workout', { exercise: name });

  return (
    <Screen scroll={false}>
      <View style={{ padding: space(5), paddingBottom: 0 }}>
        <Text style={styles.h1}>Exercises</Text>
        <Label style={{ marginTop: 4 }}>{data.length} moves · tap to log</Label>
        <TextInput
          value={q}
          onChangeText={setQ}
          placeholder="Search exercises…"
          placeholderTextColor={colors.ash}
          style={styles.search}
        />
      </View>
      <FlatList
        data={data}
        keyExtractor={(item, i) => String(item.name ?? i)}
        contentContainerStyle={{ padding: space(5), paddingTop: space(3), gap: space(2) }}
        renderItem={({ item }) => (
          <Pressable style={styles.row} onPress={() => pick(item.name)}>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.meta}>
                {(item.muscleGroup || '').replace(/-/g, ' ')}
                {item.equipment ? ` · ${item.equipment}` : ''}
              </Text>
            </View>
            <Text style={styles.plus}>＋</Text>
          </Pressable>
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  h1: { color: colors.textPrimary, fontSize: 34, fontWeight: '700' },
  search: { marginTop: space(4), backgroundColor: colors.chalk, borderColor: colors.ivory, borderWidth: 1, borderRadius: radius.lg, paddingHorizontal: space(4), paddingVertical: space(3), color: colors.textPrimary, fontSize: 15 },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.chalk, borderColor: colors.ivory, borderWidth: 1, borderRadius: radius.lg, padding: space(3.5) },
  name: { color: colors.textPrimary, fontSize: 15, fontWeight: '600' },
  meta: { color: colors.textSecondary, fontSize: 12, marginTop: 3, textTransform: 'capitalize' },
  plus: { color: colors.gold, fontSize: 22, fontWeight: '700', paddingHorizontal: space(2) },
});
