import { View, Text, StyleSheet } from 'react-native';
import { oneRepMax } from '@opus/core';
import { Screen, H1, Card, Label, Body } from '../ui';
import { colors, space } from '../theme';

export default function ProgressScreen() {
  const demo = [
    { lift: 'Bench Press', w: 100, r: 5 },
    { lift: 'Squat', w: 140, r: 3 },
    { lift: 'Deadlift', w: 180, r: 2 },
  ].map((d) => ({ ...d, e1rm: Math.round(oneRepMax.epley1RM(d.w, d.r)) }));

  return (
    <Screen>
      <H1>Progress</H1>
      <Card>
        <Label>Estimated 1RM (Epley)</Label>
        <View style={{ marginTop: space(3), gap: space(2) }}>
          {demo.map((d) => (
            <View key={d.lift} style={styles.row}>
              <Text style={styles.lift}>{d.lift}</Text>
              <Text style={styles.val}>{d.e1rm} kg</Text>
            </View>
          ))}
        </View>
      </Card>
      <Body>Charts and your real history land once the SQLite data layer is wired (see docs/NATIVE_PORT.md).</Body>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  lift: { color: colors.textPrimary, fontSize: 15 },
  val: { color: colors.gold, fontVariant: ['tabular-nums'], fontSize: 15, fontWeight: '600' },
});
