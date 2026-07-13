import { useCallback, useMemo, useState } from 'react';
import { View, Text, TextInput, StyleSheet, FlatList } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { seedExercises } from '@opus/core';
import { H1, Label } from '../ui';
import { colors, radius, space, fonts } from '../theme';
import PressScale from '../components/PressScale';
import { getExercises } from '../native/db';

export default function ExercisesScreen({ navigation }) {
  const [q, setQ] = useState('');
  const [all, setAll] = useState([]);

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
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ paddingHorizontal: space(5), paddingTop: space(14) }}>
        <H1>Exercises</H1>
        <Label style={{ marginTop: 4 }}>{data.length} moves · tap to log</Label>
        <View style={s.search}>
          <Ionicons name="search" size={16} color={colors.ash} />
          <TextInput
            value={q}
            onChangeText={setQ}
            placeholder="Search exercises…"
            placeholderTextColor={colors.ash}
            style={s.searchInput}
          />
        </View>
      </View>
      <FlatList
        data={data}
        keyExtractor={(item, i) => String(item.name ?? i)}
        contentContainerStyle={{ padding: space(5), paddingTop: space(3), gap: space(2) }}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <PressScale sound="tap" onPress={() => pick(item.name)} style={s.row}>
            <View style={{ flex: 1 }}>
              <Text style={s.name}>{item.name}</Text>
              <Text style={s.meta}>
                {(item.muscleGroup || '').replace(/-/g, ' ')}
                {item.equipment ? ` · ${item.equipment}` : ''}
              </Text>
            </View>
            <Ionicons name="add-circle" size={24} color={colors.gold} />
          </PressScale>
        )}
      />
    </View>
  );
}

const s = StyleSheet.create({
  search: { flexDirection: 'row', alignItems: 'center', gap: space(2), marginTop: space(4), backgroundColor: colors.chalk, borderColor: colors.ivory, borderWidth: 1, borderRadius: radius.lg, paddingHorizontal: space(4) },
  searchInput: { flex: 1, paddingVertical: space(3.5), color: colors.textPrimary, fontFamily: fonts.sans, fontSize: 15 },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.chalk, borderColor: colors.ivory, borderWidth: 1, borderRadius: radius.lg, padding: space(3.5) },
  name: { color: colors.textPrimary, fontFamily: fonts.sansSemi, fontSize: 15 },
  meta: { color: colors.textSecondary, fontFamily: fonts.sans, fontSize: 12, marginTop: 3, textTransform: 'capitalize' },
});
