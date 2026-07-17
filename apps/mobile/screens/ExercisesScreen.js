import { useMemo, useState } from 'react';
import { View, Text, TextInput, StyleSheet, FlatList, ScrollView } from 'react-native';
import Icon from '../components/Icon';
import { seedExercises } from '@opus/core';
import { H1, Label } from '../ui';
import { radius, space, fonts } from '../theme';
import { useColors, useThemedStyles } from '../native/ThemeProvider';
import PressScale from '../components/PressScale';
import { useDbQuery } from '../native/useDbQuery';
import { getExercises } from '../native/db';
import * as session from '../native/workoutSession';
import ExerciseDetailSheet from '../components/exercise/ExerciseDetailSheet';
import ExerciseFormSheet from '../components/exercise/ExerciseFormSheet';

const DIFFICULTY_COLOR = { beginner: '#6B8F71', intermediate: '#C9A84C', advanced: '#D4622A' };

export default function ExercisesScreen({ navigation }) {
  const colors = useColors();
  const s = useThemedStyles(makeStyles);
  const [q, setQ] = useState('');
  const [group, setGroup] = useState(null); // muscle-group filter (null = all)
  const [equip, setEquip] = useState(null); // equipment filter (null = all)
  const [favOnly, setFavOnly] = useState(false);
  const [detailName, setDetailName] = useState(null);
  const [formOpen, setFormOpen] = useState(false);

  const rows = useDbQuery(() => getExercises(), [], null);
  const all = rows && rows.length ? rows : Array.isArray(seedExercises) ? seedExercises : [];

  const groups = useMemo(() => {
    const set = new Set();
    for (const e of all) if (e.muscleGroup) set.add(e.muscleGroup);
    return [...set].sort();
  }, [all]);
  const equipment = useMemo(() => {
    const set = new Set();
    for (const e of all) if (e.equipment) set.add(e.equipment);
    return [...set].sort();
  }, [all]);

  const data = useMemo(() => {
    const t = q.trim().toLowerCase();
    return all.filter(
      (e) =>
        (!group || e.muscleGroup === group) &&
        (!equip || e.equipment === equip) &&
        (!favOnly || e.favorite) &&
        (!t || (e.name || '').toLowerCase().includes(t))
    );
  }, [q, group, equip, favOnly, all]);

  // Quick-add to the active session + jump to the Workout tab.
  const quickAdd = (item) => {
    session.addExercise({ name: item.name, muscleGroup: item.muscleGroup, equipment: item.equipment });
    navigation.navigate('Workout');
  };
  const addByName = (name) => {
    const item = all.find((e) => e.name === name) || { name };
    quickAdd(item);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ paddingHorizontal: space(5), paddingTop: space(14) }}>
        <View style={s.headRow}>
          <View style={{ flex: 1 }}>
            <H1>Exercises</H1>
            <Label style={{ marginTop: 4 }}>{data.length} moves · tap for detail</Label>
          </View>
          <PressScale sound="tap" onPress={() => setFormOpen(true)} style={s.addBtn}>
            <Icon name="add" size={24} color={colors.obsidian} />
          </PressScale>
        </View>
        <View style={s.search}>
          <Icon name="search" size={16} color={colors.ash} />
          <TextInput
            value={q}
            onChangeText={setQ}
            placeholder="Search exercises…"
            placeholderTextColor={colors.ash}
            style={s.searchInput}
          />
          <PressScale hitSlop={8} onPress={() => setFavOnly((v) => !v)}>
            <Text style={{ fontSize: 18, color: favOnly ? colors.gold : colors.ash }}>{favOnly ? '★' : '☆'}</Text>
          </PressScale>
        </View>
      </View>

      {/* Muscle-group filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chips} style={{ flexGrow: 0 }}>
        {[null, ...groups].map((g) => {
          const active = group === g;
          return (
            <PressScale key={g || 'all'} sound="tap" onPress={() => setGroup(g)} style={[s.chip, active && s.chipActive]}>
              <Text style={[s.chipText, active && s.chipTextActive]}>{g ? g.replace(/-/g, ' ') : 'All'}</Text>
            </PressScale>
          );
        })}
      </ScrollView>

      {/* Equipment filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[s.chips, { paddingTop: space(2) }]} style={{ flexGrow: 0 }}>
        {[null, ...equipment].map((eq) => {
          const active = equip === eq;
          return (
            <PressScale key={eq || 'allequip'} sound="tap" onPress={() => setEquip(eq)} style={[s.chipSm, active && s.chipActive]}>
              <Text style={[s.chipText, active && s.chipTextActive]}>{eq || 'Any gear'}</Text>
            </PressScale>
          );
        })}
      </ScrollView>

      <FlatList
        data={data}
        keyExtractor={(item, i) => String(item.name ?? i)}
        contentContainerStyle={{ padding: space(5), paddingTop: space(3), gap: space(2) }}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <PressScale sound="tap" onPress={() => setDetailName(item.name)} style={s.row}>
            {!!item.color && <View style={[s.dot, { backgroundColor: item.color }]} />}
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: space(1.5) }}>
                {!!item.favorite && <Text style={{ color: colors.gold, fontSize: 13 }}>★</Text>}
                <Text style={s.name}>{item.name}</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: space(2), marginTop: 3 }}>
                <Text style={s.meta}>
                  {(item.muscleGroup || '').replace(/-/g, ' ')}
                  {item.equipment ? ` · ${item.equipment}` : ''}
                </Text>
                {!!item.difficulty && (
                  <Text style={[s.diff, { color: DIFFICULTY_COLOR[item.difficulty] || colors.ash }]}>{item.difficulty}</Text>
                )}
              </View>
            </View>
            <PressScale hitSlop={8} sound="tap" onPress={() => quickAdd(item)}>
              <Icon name="add-circle" size={24} color={colors.gold} />
            </PressScale>
          </PressScale>
        )}
      />

      <ExerciseDetailSheet
        visible={detailName != null}
        exerciseName={detailName}
        onClose={() => setDetailName(null)}
        onAddToWorkout={addByName}
      />
      <ExerciseFormSheet visible={formOpen} onClose={() => setFormOpen(false)} onCreated={(name) => setDetailName(name)} />
    </View>
  );
}

const makeStyles = (colors) => StyleSheet.create({
  headRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  addBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.gold, alignItems: 'center', justifyContent: 'center', marginTop: space(2) },
  search: { flexDirection: 'row', alignItems: 'center', gap: space(2), marginTop: space(4), backgroundColor: colors.chalk, borderColor: colors.ivory, borderWidth: 1, borderRadius: radius.lg, paddingHorizontal: space(4) },
  searchInput: { flex: 1, paddingVertical: space(3.5), color: colors.textPrimary, fontFamily: fonts.sans, fontSize: 15 },
  row: { flexDirection: 'row', alignItems: 'center', gap: space(2), backgroundColor: colors.chalk, borderColor: colors.ivory, borderWidth: 1, borderRadius: radius.lg, padding: space(3.5) },
  dot: { width: 10, height: 10, borderRadius: 5 },
  name: { color: colors.textPrimary, fontFamily: fonts.sansSemi, fontSize: 15 },
  meta: { color: colors.textSecondary, fontFamily: fonts.sans, fontSize: 12, textTransform: 'capitalize' },
  diff: { fontFamily: fonts.sansMedium, fontSize: 11, textTransform: 'capitalize' },
  chips: { paddingHorizontal: space(5), paddingTop: space(3), gap: space(2) },
  // This screen sits on the constant-obsidian canvas, so unselected chips need a
  // visible outline (a chalk/ivory fill goes near-invisible in the dark palette).
  chip: { paddingHorizontal: space(4), paddingVertical: space(2), borderRadius: radius.full, backgroundColor: 'rgba(255,255,255,0.06)', borderColor: colors.ash, borderWidth: 1 },
  chipSm: { paddingHorizontal: space(3.5), paddingVertical: space(1.5), borderRadius: radius.full, backgroundColor: 'rgba(255,255,255,0.06)', borderColor: colors.ash, borderWidth: 1 },
  chipActive: { backgroundColor: colors.gold, borderColor: colors.gold },
  chipText: { color: colors.textInverse, fontFamily: fonts.sansMedium, fontSize: 13, textTransform: 'capitalize' },
  chipTextActive: { color: colors.obsidian },
});
