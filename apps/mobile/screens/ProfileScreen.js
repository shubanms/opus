import { useCallback, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { rpg } from '@opus/core';
import { Screen, H1, Card, Label, Body } from '../ui';
import { colors, radius, space } from '../theme';
import { getTotals } from '../native/db';

function derive(totalXp) {
  try {
    const label = rpg.getRankLabel ? rpg.getRankLabel(totalXp) : 'First Rep';
    const prog = rpg.getXPProgress ? rpg.getXPProgress(totalXp) : { level: 1, progress: 0, xpToNext: 0 };
    return { label, ...prog };
  } catch {
    return { label: 'First Rep', level: 1, progress: 0, xpToNext: 0 };
  }
}

export default function ProfileScreen() {
  const [totals, setTotals] = useState({ totalXP: 0, workouts: 0, sets: 0, streak: 0 });

  useFocusEffect(
    useCallback(() => {
      try {
        setTotals(getTotals());
      } catch {}
    }, [])
  );

  const { label, level, progress, xpToNext } = derive(totals.totalXP);
  const pct = Math.max(0, Math.min(1, progress || 0));

  return (
    <Screen>
      <H1>Profile</H1>

      <Card style={{ backgroundColor: colors.obsidian, borderColor: colors.stone }}>
        <Label style={{ color: colors.gold }}>Rank</Label>
        <Text style={styles.title}>{label}</Text>
        <Text style={styles.level}>Level {level} · {Math.round(totals.totalXP).toLocaleString()} XP</Text>
        <View style={styles.barTrack}>
          <View style={[styles.barFill, { width: `${Math.round(pct * 100)}%` }]} />
        </View>
        <Text style={styles.next}>{xpToNext > 0 ? `${Math.round(xpToNext).toLocaleString()} XP to next level` : 'Max tier'}</Text>
      </Card>

      <View style={styles.grid}>
        <Metric label="Workouts" value={totals.workouts} />
        <Metric label="Sets" value={totals.sets} />
        <Metric label="Streak" value={totals.streak} />
      </View>

      <Body>XP is earned from finished workouts — {rpg.COMPLETE_BONUS} per session plus per-set XP,
        computed by the shared @opus/core engine so web and native agree.</Body>
    </Screen>
  );
}

function Metric({ label, value }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricVal}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  title: { color: colors.textPrimary, fontSize: 24, fontWeight: '700', marginTop: 6 },
  level: { color: colors.textSecondary, fontSize: 13, marginTop: 4 },
  barTrack: { height: 8, backgroundColor: colors.stone, borderRadius: 4, marginTop: space(3), overflow: 'hidden' },
  barFill: { height: 8, backgroundColor: colors.gold, borderRadius: 4 },
  next: { color: colors.ash, fontSize: 12, marginTop: 6 },
  grid: { flexDirection: 'row', gap: space(3) },
  metric: { flex: 1, backgroundColor: colors.chalk, borderColor: colors.ivory, borderWidth: 1, borderRadius: radius.lg, paddingVertical: space(4), alignItems: 'center' },
  metricVal: { color: colors.gold, fontSize: 20, fontWeight: '700', fontVariant: ['tabular-nums'] },
  metricLabel: { color: colors.textSecondary, fontSize: 12, marginTop: 2 },
});
