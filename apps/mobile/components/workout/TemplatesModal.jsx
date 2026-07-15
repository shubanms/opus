// Routines/templates — auto-generate a balanced routine (@opus/core
// routineGenerator), see saved routines, start one (pre-fills the logger), or
// delete. Ports the PWA templates/auto-generate. Opened from the Workout screen.
import { useState } from 'react';
import { Modal, View, Text, ScrollView, StyleSheet, Alert } from 'react-native';
import Icon from '../Icon';
import { routineGenerator, routineName } from '@opus/core';
import { H2, Label, Body, Mono } from '../../ui';
import { radius, space, fonts } from '../../theme';
import { useColors, useThemedStyles } from '../../native/ThemeProvider';
import PressScale from '../PressScale';
import { GoldButton } from '../Button';
import { useDbQuery } from '../../native/useDbQuery';
import { getTemplates, createTemplate, deleteTemplate, getExercises } from '../../native/db';
import { playCue } from '../../native/sound';
import { success as hSuccess } from '../../native/haptics';

const LEVELS = [
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
];

let seedCounter = 1;

export default function TemplatesModal({ visible, onClose, onStart }) {
  const colors = useColors();
  const s = useThemedStyles(makeStyles);
  const [level, setLevel] = useState('intermediate');
  const templates = useDbQuery(() => getTemplates(), [], []);

  const generate = () => {
    try {
      const catalog = getExercises().map((e) => ({ ...e, id: e.name }));
      const groups = [...new Set(catalog.map((e) => e.muscleGroup).filter(Boolean))];
      // Date.now() is allowed in app code (not in @opus/core); vary the seed.
      const rng = routineGenerator.makeRng((Date.now() % 100000) + seedCounter++ * 7919);
      const routine = routineGenerator.generateRoutine({ exercises: catalog, groups, level, rng });
      const names = routine.map((r) => r.exerciseId).filter(Boolean);
      if (!names.length) return;
      const counts = {};
      for (const n of names) {
        const mg = catalog.find((e) => e.name === n)?.muscleGroup;
        if (mg) counts[mg] = (counts[mg] || 0) + 1;
      }
      const { name } = routineName.deriveRoutineName(counts);
      createTemplate(name || 'Routine', names);
      hSuccess();
      playCue('success');
    } catch (e) {
      Alert.alert('Error', String(e?.message || e));
    }
  };

  const confirmDelete = (t) => {
    Alert.alert('Delete routine?', `Remove "${t.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => { try { deleteTemplate(t.id); } catch {} } },
    ]);
  };

  const start = (t) => {
    if (t.exercises?.length) onStart?.(t.exercises[0]);
    onClose?.();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={s.backdrop}>
        <View style={s.sheet}>
          <View style={s.header}>
            <H2>Routines</H2>
            <PressScale hitSlop={10} onPress={onClose}><Icon name="close" size={24} color={colors.ash} /></PressScale>
          </View>

          {/* Auto-generate */}
          <Label>Auto-generate</Label>
          <View style={s.seg}>
            {LEVELS.map((l) => (
              <PressScale key={l.value} sound="tap" onPress={() => setLevel(l.value)} style={[s.segItem, level === l.value && s.segActive]}>
                <Text style={[s.segText, level === l.value && s.segTextActive]}>{l.label}</Text>
              </PressScale>
            ))}
          </View>
          <GoldButton label="Generate a routine" icon="sparkles" onPress={generate} style={{ marginTop: space(3) }} />

          {/* Saved routines */}
          <Label style={{ marginTop: space(5) }}>Your routines</Label>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: space(8), gap: space(2), paddingTop: space(2) }}>
            {(!templates || templates.length === 0) ? (
              <Body>No routines yet — generate one above.</Body>
            ) : (
              templates.map((t) => (
                <View key={t.id} style={s.card}>
                  <View style={s.cardTop}>
                    <View style={{ flex: 1 }}>
                      <Text style={s.name}>{t.name}</Text>
                      <Mono style={s.meta}>{t.exercises.length} exercises</Mono>
                    </View>
                    <PressScale onPress={() => start(t)} style={s.startBtn}><Text style={s.startText}>Start</Text></PressScale>
                    <PressScale hitSlop={8} onPress={() => confirmDelete(t)} style={{ marginLeft: space(3) }}>
                      <Icon name="trash" size={16} color={colors.ash} />
                    </PressScale>
                  </View>
                  <Text style={s.exList} numberOfLines={2}>{t.exercises.join(' · ')}</Text>
                </View>
              ))
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const makeStyles = (colors) => StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(17,16,16,0.72)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.chalk, borderTopLeftRadius: radius['2xl'], borderTopRightRadius: radius['2xl'], padding: space(5), paddingBottom: space(2), height: '82%' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: space(3) },
  seg: { flexDirection: 'row', backgroundColor: colors.ivory, borderRadius: radius.lg, padding: 3, marginTop: space(2) },
  segItem: { flex: 1, paddingVertical: space(2.5), borderRadius: radius.md, alignItems: 'center' },
  segActive: { backgroundColor: colors.gold },
  segText: { color: colors.textSecondary, fontFamily: fonts.sansMedium, fontSize: 12 },
  segTextActive: { color: colors.obsidian },
  card: { backgroundColor: colors.ivory, borderRadius: radius.md, padding: space(4), gap: space(2) },
  cardTop: { flexDirection: 'row', alignItems: 'center' },
  name: { color: colors.textPrimary, fontFamily: fonts.sansSemi, fontSize: 15 },
  meta: { color: colors.textSecondary, fontFamily: fonts.mono, fontSize: 12, marginTop: 1 },
  startBtn: { backgroundColor: colors.sage, borderRadius: radius.md, paddingHorizontal: space(4), paddingVertical: space(2) },
  startText: { color: colors.textInverse, fontFamily: fonts.sansSemi, fontSize: 13 },
  exList: { color: colors.textSecondary, fontFamily: fonts.sans, fontSize: 12 },
});
