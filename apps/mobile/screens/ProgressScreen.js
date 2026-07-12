import { useCallback, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Screen, H1, Card, Label, Body } from '../ui';
import { colors, space } from '../theme';
import { getBestByExercise, getTotals } from '../native/db';

export default function ProgressScreen() {
  const [best, setBest] = useState([]);
  const [totals, setTotals] = useState({ workouts: 0, sets: 0, totalVolume: 0 });

  useFocusEffect(
    useCallback(() => {
      try {
        setBest(getBestByExercise(10));
        setTotals(getTotals());
      } catch {}
    }, [])
  );

  return (
    <Screen>
      <H1>Progress</H1>

      <View style={styles.stats}>
        <Stat label="Workouts" value={totals.workouts} />
        <Stat label="Sets" value={totals.sets} />
        <Stat label="Volume" value={`${Math.round(totals.totalVolume / 1000)}k`} />
      </View>

      <Card>
        <Label>Best est. 1RM (Epley)</Label>
        {best.length === 0 ? (
          <Body style={{ marginTop: 6 }}>Log a few weighted sets with an exercise name and your personal bests appear here.</Body>
        ) : (
          <View style={{ marginTop: space(3), gap: space(2) }}>
            {best.map((d) => (
              <View key={d.name} style={styles.row}>
                <Text style={styles.lift} numberOfLines={1}>{d.name}</Text>
                <Text style={styles.val}>{Math.round(d.e1rm)} kg</Text>
              </View>
            ))}
          </View>
        )}
      </Card>
    </Screen>
  );
}

function Stat({ label, value }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statVal}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  stats: { flexDirection: 'row', gap: space(3) },
  stat: { flex: 1, backgroundColor: colors.chalk, borderColor: colors.ivory, borderWidth: 1, borderRadius: 14, paddingVertical: space(4), alignItems: 'center' },
  statVal: { color: colors.gold, fontSize: 20, fontWeight: '700', fontVariant: ['tabular-nums'] },
  statLabel: { color: colors.textSecondary, fontSize: 12, marginTop: 2 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: space(3) },
  lift: { color: colors.textPrimary, fontSize: 15, flex: 1 },
  val: { color: colors.gold, fontVariant: ['tabular-nums'], fontSize: 15, fontWeight: '600' },
});
