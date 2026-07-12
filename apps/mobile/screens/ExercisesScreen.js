import { useMemo, useState } from 'react';
import { View, Text, TextInput, StyleSheet, FlatList } from 'react-native';
import seedExercises from '@opus/core/seedExercises';
import { Screen, Label } from '../ui';
import { colors, radius, space } from '../theme';

export default function ExercisesScreen() {
  const [q, setQ] = useState('');
  const data = useMemo(() => {
    const list = Array.isArray(seedExercises) ? seedExercises : [];
    const t = q.trim().toLowerCase();
    return t ? list.filter((e) => (e.name || '').toLowerCase().includes(t)) : list;
  }, [q]);

  return (
    <Screen scroll={false}>
      <View style={{ padding: space(5), paddingBottom: 0 }}>
        <Text style={styles.h1}>Exercises</Text>
        <Label style={{ marginTop: 4 }}>{data.length} moves</Label>
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
        keyExtractor={(item, i) => String(item.id ?? item.name ?? i)}
        contentContainerStyle={{ padding: space(5), paddingTop: space(3), gap: space(2) }}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <Text style={styles.name}>{item.name}</Text>
            <Text style={styles.meta}>
              {(item.muscleGroup || '').replace(/-/g, ' ')}
              {item.equipment ? ` · ${item.equipment}` : ''}
            </Text>
          </View>
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  h1: { color: colors.textPrimary, fontSize: 34, fontWeight: '700' },
  search: { marginTop: space(4), backgroundColor: colors.chalk, borderColor: colors.ivory, borderWidth: 1, borderRadius: radius.lg, paddingHorizontal: space(4), paddingVertical: space(3), color: colors.textPrimary, fontSize: 15 },
  row: { backgroundColor: colors.chalk, borderColor: colors.ivory, borderWidth: 1, borderRadius: radius.lg, padding: space(3.5) },
  name: { color: colors.textPrimary, fontSize: 15, fontWeight: '600' },
  meta: { color: colors.textSecondary, fontSize: 12, marginTop: 3, textTransform: 'capitalize' },
});
