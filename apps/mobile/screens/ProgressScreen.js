import { useState } from 'react';
import { View, Text, StyleSheet, useWindowDimensions } from 'react-native';
import Icon from '../components/Icon';
import { dateKey, units, prs as prsCore } from '@opus/core';
import { Screen, H1, Label, Body, Mono } from '../ui';
import { radius, space, fonts } from '../theme';
import { useColors, useThemedStyles } from '../native/ThemeProvider';
import { useSettings } from '../native/settings';
import Card from '../components/Card';
import StatTile from '../components/StatTile';
import Segmented from '../components/Segmented';
import PressScale from '../components/PressScale';
import LineChart from '../components/progress/LineChart';
import BarChart from '../components/progress/BarChart';
import BodyWeightCard from '../components/progress/BodyWeightCard';
import RecoveryCard from '../components/progress/RecoveryCard';
import MuscleFrequency from '../components/progress/MuscleFrequency';
import Heatmap from '../components/progress/Heatmap';
import ActivityRings from '../components/home/ActivityRings';
import ExerciseDetailSheet from '../components/exercise/ExerciseDetailSheet';
import { useDbQuery } from '../native/useDbQuery';
import {
  getBestByExercise, getTotals, getWeeklyVolume, getRecentWorkouts, getAllPRs,
  getMuscleFrequency, getWorkoutDays, getTopExercises,
} from '../native/db';
import * as session from '../native/workoutSession';

function relDay(ms) {
  try {
    const d = new Date(ms);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const gap = dateKey.daysBetween(key, dateKey.todayKey());
    if (gap === 0) return 'Today';
    if (gap === 1) return 'Yesterday';
    return `${gap}d ago`;
  } catch { return ''; }
}

function fmtPr(p, unit) {
  if (p.type === 'reps') return `${Math.round(p.value)} reps`;
  return `${units.toDisplay(p.value, unit)} ${units.unitLabel(unit)}`;
}

const TABS = [
  { value: 'overview', label: 'Overview' },
  { value: 'exercise', label: 'By Exercise' },
  { value: 'body', label: 'Body' },
];

export default function ProgressScreen({ navigation }) {
  const colors = useColors();
  const s = useThemedStyles(makeStyles);
  const { settings } = useSettings();
  const unit = settings.unit || 'kg';
  const win = useWindowDimensions();
  const chartW = Math.round(win.width - 2 * space(5) - 2 * space(4));
  const [tab, setTab] = useState('overview');
  const [detailName, setDetailName] = useState(null);

  const totals = useDbQuery(() => getTotals(), [], { workouts: 0, sets: 0, totalVolume: 0, streak: 0, prCount: 0, hours: 0 });
  const best = useDbQuery(() => getBestByExercise(8), [], []);
  const weekly = useDbQuery(() => getWeeklyVolume(8), [], []);
  const sessions = useDbQuery(() => getRecentWorkouts(12), [], []);
  const prs = useDbQuery(() => getAllPRs(12), [], []);
  const muscles = useDbQuery(() => getMuscleFrequency(), [], []);
  const days = useDbQuery(() => getWorkoutDays(), [], new Set());
  const top = useDbQuery(() => getTopExercises({ by: 'sets', limit: 10 }), [], []);

  // Week-over-week volume delta (raw kg).
  const lastVol = weekly.length ? weekly[weekly.length - 1].volume : 0;
  const prevVol = weekly.length > 1 ? weekly[weekly.length - 2].volume : 0;
  const deltaPct = prevVol > 0 ? Math.round(((lastVol - prevVol) / prevVol) * 100) : null;
  const up = lastVol >= prevVol;

  const weeklyData = weekly.map((w) => ({ value: Math.round(units.toDisplay(w.volume, unit)) }));
  const sessionData = [...sessions].reverse().map((w) => ({ value: Math.round(units.toDisplay(w.volume || 0, unit)) }));

  const addToWorkout = (name) => {
    const t = top.find((e) => e.name === name);
    session.addExercise({ name, muscleGroup: t?.muscleGroup, equipment: null });
    navigation.navigate('Workout');
  };

  return (
    <Screen>
      <H1>Progress</H1>
      <Segmented options={TABS} value={tab} onChange={setTab} style={{ marginTop: space(1) }} />

      {tab === 'overview' && (
        <>
          <View style={s.bento}>
            <StatTile icon="barbell" value={totals.workouts} label="Workouts" />
            <StatTile icon="trending-up" value={totals.totalVolume} compact label="Volume kg" />
            <StatTile icon="ribbon" accent={colors.ember} value={totals.prCount} label="PRs" />
          </View>
          <View style={s.bento}>
            <StatTile icon="flame" accent={colors.ember} value={totals.streak} label="Streak" />
            <StatTile icon="time" value={Math.round(totals.hours)} label="Hours" />
            <StatTile icon="repeat" value={totals.sets} label="Sets" />
          </View>

          <Card>
            <View style={s.cardHead}>
              <Label>Weekly volume · 8 wks</Label>
              {deltaPct != null && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Icon name={up ? 'trending-up' : 'trending-up'} size={14} color={up ? colors.sage : colors.ember} />
                  <Text style={[s.delta, { color: up ? colors.sage : colors.ember }]}>{up ? '+' : ''}{deltaPct}% vs last</Text>
                </View>
              )}
            </View>
            <View style={{ marginTop: space(3) }}>
              <LineChart data={weeklyData} width={chartW} height={120} />
            </View>
          </Card>

          <Card>
            <Label>Volume per session</Label>
            <View style={{ marginTop: space(3) }}>
              <BarChart data={sessionData} width={chartW} height={120} />
            </View>
          </Card>

          <MuscleFrequency data={muscles} />
          <Heatmap days={days} />

          {prs.length > 0 && (
            <Card>
              <Label>Recent PRs</Label>
              <View style={{ marginTop: space(3) }}>
                {prs.map((p) => (
                  <View key={p.id} style={s.row}>
                    <Icon name="ribbon" size={15} color={colors.ember} style={{ marginRight: space(3) }} />
                    <Text style={s.name} numberOfLines={1}>{p.exerciseName}</Text>
                    <Mono style={s.sub}>{p.type ? prsCore.prTypeLabel(p.type) : relDay(p.achievedAt)}</Mono>
                    <Mono style={s.val}>  {fmtPr(p, unit)}</Mono>
                  </View>
                ))}
              </View>
            </Card>
          )}
        </>
      )}

      {tab === 'exercise' && (
        <>
          <Card>
            <Label>Top exercises</Label>
            {top.length === 0 ? (
              <Body style={{ marginTop: space(2) }}>No lifts yet — log a workout to see your leaders.</Body>
            ) : (
              <View style={{ marginTop: space(3) }}>
                {top.map((e, i) => (
                  <PressScale key={e.name} sound="tap" onPress={() => setDetailName(e.name)} style={s.topRow}>
                    <Mono style={s.rank}>{i + 1}</Mono>
                    <View style={{ flex: 1 }}>
                      <Text style={s.name} numberOfLines={1}>{e.name}</Text>
                      <Text style={s.sub}>{e.sets} sets{e.muscleGroup ? ` · ${String(e.muscleGroup).replace(/-/g, ' ')}` : ''}</Text>
                    </View>
                    <Mono style={s.val}>{units.fmtVolume(e.volume, unit)}</Mono>
                    <Icon name="chevron-forward" size={16} color={colors.ash} />
                  </PressScale>
                ))}
              </View>
            )}
          </Card>

          {best.length > 0 && (
            <Card>
              <Label>Best est. 1RM (Epley)</Label>
              <View style={{ marginTop: space(3) }}>
                {best.map((d) => (
                  <PressScale key={d.name} sound="tap" onPress={() => setDetailName(d.name)} style={s.row}>
                    <Icon name="trophy" size={15} color={colors.gold} style={{ marginRight: space(3) }} />
                    <Text style={s.name} numberOfLines={1}>{d.name}</Text>
                    <Mono style={s.val}>{units.toDisplay(Math.round(d.e1rm), unit)} {units.unitLabel(unit)}</Mono>
                  </PressScale>
                ))}
              </View>
            </Card>
          )}

          <RecoveryCard />
        </>
      )}

      {tab === 'body' && (
        <>
          <ActivityRings />
          <BodyWeightCard width={chartW} />
          <RecoveryCard />
        </>
      )}

      <ExerciseDetailSheet
        visible={detailName != null}
        exerciseName={detailName}
        onClose={() => setDetailName(null)}
        onAddToWorkout={addToWorkout}
      />
    </Screen>
  );
}

const makeStyles = (colors) => StyleSheet.create({
  bento: { flexDirection: 'row', gap: space(3) },
  cardHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  delta: { fontFamily: fonts.sansMedium, fontSize: 12 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: space(2) },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: space(3), paddingVertical: space(2.5), borderTopColor: colors.ivory, borderTopWidth: StyleSheet.hairlineWidth },
  rank: { width: 20, color: colors.ash, fontSize: 14, textAlign: 'center' },
  name: { flex: 1, color: colors.textPrimary, fontFamily: fonts.sansSemi, fontSize: 14 },
  sub: { color: colors.textSecondary, fontFamily: fonts.sans, fontSize: 12 },
  val: { color: colors.gold, fontFamily: fonts.monoMedium, fontSize: 13 },
});
