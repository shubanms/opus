import { View, Text, StyleSheet, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { dateKey } from '@opus/core';
import { Screen, H1, Label, Body, Mono } from '../ui';
import { colors, radius, space, fonts } from '../theme';
import Card from '../components/Card';
import StatTile from '../components/StatTile';
import LineChart from '../components/progress/LineChart';
import BarChart from '../components/progress/BarChart';
import BodyWeightCard from '../components/progress/BodyWeightCard';
import RecoveryCard from '../components/progress/RecoveryCard';
import { useDbQuery } from '../native/useDbQuery';
import { getBestByExercise, getTotals, getWeeklyVolume, getRecentWorkouts, getAllPRs } from '../native/db';

function relDay(ms) {
  try {
    const d = new Date(ms);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const gap = dateKey.daysBetween(key, dateKey.todayKey());
    if (gap === 0) return 'Today';
    if (gap === 1) return 'Yesterday';
    if (gap != null && gap < 7) return `${gap}d ago`;
    return `${d.getMonth() + 1}/${d.getDate()}`;
  } catch {
    return '';
  }
}

export default function ProgressScreen() {
  const win = useWindowDimensions();
  const chartW = Math.round(win.width - 2 * space(5) - 2 * space(4)); // screen + card padding

  const totals = useDbQuery(() => getTotals(), [], { workouts: 0, sets: 0, totalVolume: 0 });
  const best = useDbQuery(() => getBestByExercise(8), [], []);
  const weekly = useDbQuery(() => getWeeklyVolume(8), [], []);
  const sessions = useDbQuery(() => getRecentWorkouts(12), [], []);
  const prs = useDbQuery(() => getAllPRs(12), [], []);

  const weeklyValues = (weekly || []).map((w) => w.volume);
  const sessionValues = [...(sessions || [])].reverse().map((w) => w.volume || 0);

  return (
    <Screen>
      <View>
        <H1>Progress</H1>
        <Label style={{ marginTop: 4 }}>Charts & records</Label>
      </View>

      <View style={s.bento}>
        <StatTile icon="barbell" value={totals.workouts} label="Workouts" />
        <StatTile icon="repeat" value={totals.sets} label="Sets" />
        <StatTile icon="trending-up" value={Math.round(totals.totalVolume / 1000)} suffix="k" label="Volume kg" />
      </View>

      <Card>
        <Label>Weekly volume · last 8 weeks</Label>
        <View style={{ marginTop: space(3) }}>
          <LineChart data={weeklyValues} width={chartW} height={130} />
        </View>
      </Card>

      <Card>
        <Label>Volume per session</Label>
        <View style={{ marginTop: space(3) }}>
          <BarChart data={sessionValues} width={chartW} height={120} />
        </View>
      </Card>

      <RecoveryCard />

      <BodyWeightCard width={chartW} />

      <Card>
        <Label>Best est. 1RM (Epley)</Label>
        {(!best || best.length === 0) ? (
          <Body style={{ marginTop: space(2) }}>Log a few weighted sets with an exercise name and your personal bests appear here.</Body>
        ) : (
          <View style={{ marginTop: space(3) }}>
            {best.map((d) => (
              <View key={d.name} style={s.row}>
                <Ionicons name="trophy" size={15} color={colors.gold} style={{ marginRight: space(3) }} />
                <Text style={s.name} numberOfLines={1}>{d.name}</Text>
                <Mono style={s.val}>{Math.round(d.e1rm)} kg</Mono>
              </View>
            ))}
          </View>
        )}
      </Card>

      {prs && prs.length > 0 && (
        <Card>
          <Label>Recent PRs</Label>
          <View style={{ marginTop: space(3) }}>
            {prs.map((p) => (
              <View key={p.id} style={s.row}>
                <Ionicons name="ribbon" size={15} color={colors.ember} style={{ marginRight: space(3) }} />
                <Text style={s.name} numberOfLines={1}>{p.exerciseName}</Text>
                <Mono style={s.sub}>{relDay(p.achievedAt)}</Mono>
                <Mono style={s.val}>  {Math.round(p.value)} kg</Mono>
              </View>
            ))}
          </View>
        </Card>
      )}
    </Screen>
  );
}

const s = StyleSheet.create({
  bento: { flexDirection: 'row', gap: space(3) },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: space(2.5), borderTopColor: colors.ivory, borderTopWidth: StyleSheet.hairlineWidth },
  name: { flex: 1, color: colors.textPrimary, fontFamily: fonts.sansMedium, fontSize: 15 },
  val: { color: colors.gold, fontFamily: fonts.monoMedium, fontSize: 15 },
  sub: { color: colors.ash, fontFamily: fonts.mono, fontSize: 12 },
});
