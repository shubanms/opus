import { useCallback, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Screen, H1, H2, Label, Body, Mono } from '../ui';
import { colors, radius, space, fonts } from '../theme';
import Card from '../components/Card';
import StatTile from '../components/StatTile';
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
      <View>
        <H1>Progress</H1>
        <Label style={{ marginTop: 4 }}>Charts & stats</Label>
      </View>

      <View style={s.bento}>
        <StatTile icon="barbell" value={totals.workouts} label="Workouts" />
        <StatTile icon="repeat" value={totals.sets} label="Sets" />
        <StatTile icon="trending-up" value={Math.round(totals.totalVolume / 1000)} suffix="k" label="Volume kg" />
      </View>

      <Card>
        <Label>Best est. 1RM (Epley)</Label>
        {best.length === 0 ? (
          <Body style={{ marginTop: space(2) }}>Log a few weighted sets with an exercise name and your personal bests appear here.</Body>
        ) : (
          <View style={{ marginTop: space(3) }}>
            {best.map((d) => (
              <View key={d.name} style={s.prRow}>
                <Ionicons name="trophy" size={15} color={colors.gold} style={{ marginRight: space(3) }} />
                <Text style={s.prName} numberOfLines={1}>{d.name}</Text>
                <Mono style={s.prVal}>{Math.round(d.e1rm)} kg</Mono>
              </View>
            ))}
          </View>
        )}
      </Card>

      <Body style={{ textAlign: 'center' }}>Trend charts land in the next update.</Body>
    </Screen>
  );
}

const s = StyleSheet.create({
  bento: { flexDirection: 'row', gap: space(3) },
  prRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: space(2.5), borderTopColor: colors.ivory, borderTopWidth: StyleSheet.hairlineWidth },
  prName: { flex: 1, color: colors.textPrimary, fontFamily: fonts.sansMedium, fontSize: 15 },
  prVal: { color: colors.gold, fontFamily: fonts.monoMedium, fontSize: 15 },
});
