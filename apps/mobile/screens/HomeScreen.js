import { useCallback, useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { dateKey } from '@opus/core';
import { Screen, Card, H1, Label, Body } from '../ui';
import { colors, radius, space } from '../theme';
import { getTotals, getRecentWorkouts, getActiveWorkout } from '../native/db';
import { refreshWidgets } from '../native/widgets';

function relDay(key) {
  const gap = dateKey.daysBetween(key, dateKey.todayKey());
  if (gap === 0) return 'Today';
  if (gap === 1) return 'Yesterday';
  if (gap != null && gap < 7) return `${gap}d ago`;
  return key;
}

export default function HomeScreen({ navigation }) {
  const today = dateKey.todayKey();
  const [totals, setTotals] = useState({ workouts: 0, totalVolume: 0, streak: 0, totalXP: 0 });
  const [recent, setRecent] = useState([]);
  const [active, setActive] = useState(null);

  useFocusEffect(
    useCallback(() => {
      try {
        setTotals(getTotals());
        setRecent(getRecentWorkouts(5));
        setActive(getActiveWorkout());
        refreshWidgets();
      } catch {}
    }, [])
  );

  return (
    <Screen>
      <View>
        <H1>OPUS</H1>
        <Body style={{ marginTop: 4 }}>Build your masterpiece.</Body>
      </View>

      <View style={styles.stats}>
        <Stat label="Streak" value={`${totals.streak}`} suffix={totals.streak === 1 ? 'day' : 'days'} />
        <Stat label="Workouts" value={`${totals.workouts}`} />
        <Stat label="Volume" value={`${Math.round(totals.totalVolume / 1000)}k`} suffix="kg" />
      </View>

      <Card style={{ backgroundColor: colors.obsidian, borderColor: colors.stone }}>
        <Label style={{ color: colors.gold }}>Today · {today}</Label>
        <Text style={styles.cardTitle}>{active ? 'Workout in progress' : 'Ready to train?'}</Text>
        <Pressable style={styles.cta} onPress={() => navigation.navigate('Workout')}>
          <Text style={styles.ctaText}>{active ? 'Resume workout' : 'Start workout'}</Text>
        </Pressable>
      </Card>

      <Card>
        <Label>Recent</Label>
        {recent.length === 0 ? (
          <Body style={{ marginTop: 6 }}>No workouts yet — your finished sessions show up here.</Body>
        ) : (
          <View style={{ marginTop: space(2) }}>
            {recent.map((w) => (
              <View key={w.id} style={styles.recentRow}>
                <Text style={styles.recentDay}>{relDay(w.dateKey)}</Text>
                <Text style={styles.recentMeta}>{w.setCount} sets · {Math.round(w.volume)} kg</Text>
              </View>
            ))}
          </View>
        )}
      </Card>
    </Screen>
  );
}

function Stat({ label, value, suffix }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statVal}>{value}<Text style={styles.statSuffix}>{suffix ? ` ${suffix}` : ''}</Text></Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  stats: { flexDirection: 'row', gap: space(3) },
  stat: { flex: 1, backgroundColor: colors.chalk, borderColor: colors.ivory, borderWidth: 1, borderRadius: radius.lg, paddingVertical: space(4), paddingHorizontal: space(3), alignItems: 'center' },
  statVal: { color: colors.gold, fontSize: 22, fontWeight: '700', fontVariant: ['tabular-nums'] },
  statSuffix: { color: colors.ash, fontSize: 12, fontWeight: '600' },
  statLabel: { color: colors.textSecondary, fontSize: 12, marginTop: 2 },
  cardTitle: { color: '#F5F3EF', fontSize: 20, fontWeight: '600', marginTop: 6, marginBottom: space(3) },
  cta: { backgroundColor: colors.gold, borderRadius: radius.lg, paddingVertical: space(3.5), alignItems: 'center' },
  ctaText: { color: colors.obsidian, fontSize: 16, fontWeight: '700' },
  recentRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: space(2), borderTopColor: colors.ivory, borderTopWidth: StyleSheet.hairlineWidth },
  recentDay: { color: colors.textPrimary, fontSize: 14, fontWeight: '600' },
  recentMeta: { color: colors.textSecondary, fontSize: 13, fontVariant: ['tabular-nums'] },
});
