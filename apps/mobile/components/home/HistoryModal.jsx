// Workout history — every finished session, tap to expand its sets, swipe-free
// delete (with a confirm) that reverts all derived data (deleteWorkout). Ports
// the PWA history list. Opened as a sheet from Home's Recent card.
import { useState } from 'react';
import { Modal, View, Text, ScrollView, StyleSheet, Alert } from 'react-native';
import Icon from '../Icon';
import { dateKey, units } from '@opus/core';
import { H2, Label, Body, Mono } from '../../ui';
import { radius, space, fonts } from '../../theme';
import { useColors, useThemedStyles } from '../../native/ThemeProvider';
import PressScale from '../PressScale';
import Segmented from '../Segmented';
import MonthCalendar from '../progress/MonthCalendar';
import { useDbQuery } from '../../native/useDbQuery';
import { getRecentWorkouts, getSets, deleteWorkout } from '../../native/db';
import { useSettings } from '../../native/settings';

function label(key) {
  try {
    const gap = dateKey.daysBetween(key, dateKey.todayKey());
    if (gap === 0) return 'Today';
    if (gap === 1) return 'Yesterday';
    const d = dateKey.parseKey(key);
    return d ? d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }) : key;
  } catch { return key; }
}

export default function HistoryModal({ visible, onClose }) {
  const colors = useColors();
  const s = useThemedStyles(makeStyles);
  const { settings } = useSettings();
  const unit = settings.unit || 'kg';
  const workouts = useDbQuery(() => getRecentWorkouts(100), [], []);
  const [expanded, setExpanded] = useState(null);
  const [view, setView] = useState('list');
  const [selDay, setSelDay] = useState(null);
  const days = new Set((workouts || []).map((w) => w.dateKey));

  const confirmDelete = (w) => {
    Alert.alert('Delete workout?', 'This removes the session and reverts its XP, PRs and stats.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => { try { deleteWorkout(w.id); } catch {} if (expanded === w.id) setExpanded(null); } },
    ]);
  };

  const renderCard = (w) => {
    const open = expanded === w.id;
    const sets = open ? (() => { try { return getSets(w.id); } catch { return []; } })() : [];
    return (
      <View key={w.id} style={s.card}>
        <PressScale onPress={() => setExpanded(open ? null : w.id)} style={s.rowTop}>
          <View style={{ flex: 1 }}>
            <Text style={s.day}>{label(w.dateKey)}</Text>
            <Mono style={s.meta}>{w.setCount} sets · {units.fmtVolume(w.volume || 0, unit)}</Mono>
          </View>
          <Icon name={open ? 'chevron-up' : 'chevron-down'} size={18} color={colors.ash} />
        </PressScale>
        {open && (
          <View style={s.detail}>
            {sets.map((st) => (
              <View key={st.id} style={s.setRow}>
                <Text style={s.setName} numberOfLines={1}>{st.exerciseName || 'Set'}</Text>
                <Mono style={s.setVal}>{st.weight > 0 ? `${units.toDisplay(st.weight, unit)} ${units.unitLabel(unit)} × ${st.reps}` : `${st.reps} reps`}</Mono>
              </View>
            ))}
            <PressScale onPress={() => confirmDelete(w)} style={s.delRow}>
              <Icon name="trash" size={15} color={colors.ember} />
              <Text style={s.delText}> Delete workout</Text>
            </PressScale>
          </View>
        )}
      </View>
    );
  };

  const dayWorkouts = selDay ? (workouts || []).filter((w) => w.dateKey === selDay) : [];

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={s.backdrop}>
        <View style={s.sheet}>
          <View style={s.header}>
            <H2>History</H2>
            <PressScale hitSlop={10} onPress={onClose}><Icon name="close" size={24} color={colors.ash} /></PressScale>
          </View>

          {(!workouts || workouts.length === 0) ? (
            <Body style={{ marginTop: space(4) }}>No finished workouts yet.</Body>
          ) : (
            <>
              <Segmented
                options={[{ value: 'list', label: 'List' }, { value: 'calendar', label: 'Calendar' }]}
                value={view}
                onChange={(v) => { setView(v); setSelDay(null); }}
                style={{ marginBottom: space(3) }}
              />
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: space(8), gap: space(2) }}>
                {view === 'calendar' && <MonthCalendar days={days} selected={selDay} onSelect={setSelDay} />}
                {view === 'list'
                  ? workouts.map(renderCard)
                  : selDay
                    ? (dayWorkouts.length > 0
                        ? dayWorkouts.map(renderCard)
                        : <Body style={{ marginTop: space(3), textAlign: 'center' }}>No workout logged on this day</Body>)
                    : null}
              </ScrollView>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const makeStyles = (colors) => StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(17,16,16,0.72)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.chalk, borderTopLeftRadius: radius['2xl'], borderTopRightRadius: radius['2xl'], padding: space(5), paddingBottom: space(2), height: '82%' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: space(3) },
  card: { backgroundColor: colors.ivory, borderRadius: radius.md, overflow: 'hidden' },
  rowTop: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: space(4), paddingVertical: space(3.5) },
  day: { color: colors.textPrimary, fontFamily: fonts.sansSemi, fontSize: 15 },
  meta: { color: colors.textSecondary, fontFamily: fonts.mono, fontSize: 13, marginTop: 2 },
  detail: { paddingHorizontal: space(4), paddingBottom: space(3), gap: space(2), borderTopColor: colors.chalk, borderTopWidth: StyleSheet.hairlineWidth, paddingTop: space(2) },
  setRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  setName: { flex: 1, color: colors.textPrimary, fontFamily: fonts.sans, fontSize: 13 },
  setVal: { color: colors.textSecondary, fontFamily: fonts.mono, fontSize: 13 },
  delRow: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', marginTop: space(2) },
  delText: { color: colors.ember, fontFamily: fonts.sansMedium, fontSize: 13 },
});
