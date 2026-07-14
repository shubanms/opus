// Exercise picker — a searchable bottom sheet over the seeded catalog. Tapping
// one fills the workout's exercise field with its exact name (so PR / 1RM
// tracking, which keys on the name, stays consistent). Ports the PWA
// ExercisePicker. Live search via getExercises(query).
import { useState } from 'react';
import { Modal, View, Text, TextInput, FlatList, StyleSheet } from 'react-native';
import Icon from '../Icon';
import { H2, Label } from '../../ui';
import { colors, radius, space, fonts } from '../../theme';
import PressScale from '../PressScale';
import { getExercises } from '../../native/db';

export default function ExercisePicker({ visible, onClose, onPick }) {
  const [query, setQuery] = useState('');
  let list = [];
  try { list = getExercises(query); } catch { list = []; }

  const pick = (name) => {
    onPick?.(name);
    setQuery('');
    onClose?.();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={s.backdrop}>
        <View style={s.sheet}>
          <View style={s.header}>
            <H2>Choose exercise</H2>
            <PressScale hitSlop={10} onPress={onClose}><Icon name="close" size={24} color={colors.ash} /></PressScale>
          </View>

          <View style={s.searchRow}>
            <Icon name="search" size={18} color={colors.ash} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search exercises"
              placeholderTextColor={colors.ash}
              autoCorrect={false}
              style={s.search}
            />
          </View>

          <FlatList
            data={list}
            keyExtractor={(e) => e.name}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingBottom: space(8), gap: space(2) }}
            renderItem={({ item }) => (
              <PressScale sound="tap" onPress={() => pick(item.name)} style={s.row}>
                <View style={{ flex: 1 }}>
                  <Text style={s.name}>{item.name}</Text>
                  <Label style={{ marginTop: 2 }}>
                    {[item.muscleGroup, item.equipment].filter(Boolean).join(' · ')}
                  </Label>
                </View>
                <Icon name="add-circle" size={24} color={colors.gold} />
              </PressScale>
            )}
            ListEmptyComponent={<Text style={s.empty}>No matches.</Text>}
          />
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(17,16,16,0.72)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.chalk, borderTopLeftRadius: radius['2xl'], borderTopRightRadius: radius['2xl'], padding: space(5), paddingBottom: space(2), height: '82%' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: space(3) },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: space(2), backgroundColor: colors.ivory, borderRadius: radius.lg, paddingHorizontal: space(4), marginBottom: space(3) },
  search: { flex: 1, paddingVertical: space(3.5), color: colors.textPrimary, fontFamily: fonts.sans, fontSize: 15 },
  row: { flexDirection: 'row', alignItems: 'center', gap: space(3), backgroundColor: colors.ivory, borderRadius: radius.md, paddingHorizontal: space(4), paddingVertical: space(3.5) },
  name: { color: colors.textPrimary, fontFamily: fonts.sansSemi, fontSize: 15 },
  empty: { color: colors.textSecondary, textAlign: 'center', marginTop: space(6), fontFamily: fonts.sans },
});
