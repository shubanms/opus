import { useCallback, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Icon from '../components/Icon';
import { rpg, dateKey } from '@opus/core';
import { Screen, Wordmark, H1, H2, Label, Body, Mono } from '../ui';
import { radius, space, fonts } from '../theme';
import { useColors, useThemedStyles } from '../native/ThemeProvider';
import Card from '../components/Card';
import StatTile from '../components/StatTile';
import LevelBadge from '../components/rpg/LevelBadge';
import XPBar from '../components/rpg/XPBar';
import GoldAura from '../components/fx/GoldAura';
import PressScale from '../components/PressScale';
import QuestBoard from '../components/home/QuestBoard';
import HistoryModal from '../components/home/HistoryModal';
import ActivityRings from '../components/home/ActivityRings';
import { getTotals, getRecentWorkouts, getActiveWorkout } from '../native/db';
import { refreshWidgets } from '../native/widgets';
import { useSettings } from '../native/settings';

function relDay(key) {
  const gap = dateKey.daysBetween(key, dateKey.todayKey());
  if (gap === 0) return 'Today';
  if (gap === 1) return 'Yesterday';
  if (gap != null && gap < 7) return `${gap}d ago`;
  return key;
}

export default function HomeScreen({ navigation }) {
  const colors = useColors();
  const s = useThemedStyles(makeStyles);
  const { settings } = useSettings();
  const [totals, setTotals] = useState({ workouts: 0, totalVolume: 0, streak: 0, totalXP: 0 });
  const [recent, setRecent] = useState([]);
  const [active, setActive] = useState(null);
  const [historyOpen, setHistoryOpen] = useState(false);

  useFocusEffect(
    useCallback(() => {
      try {
        setTotals(getTotals());
        setRecent(getRecentWorkouts(3));
        setActive(getActiveWorkout());
        refreshWidgets();
      } catch {}
    }, [])
  );

  const level = rpg.getLevelFromTotalXP(totals.totalXP);
  const rank = rpg.getRankLabel(totals.totalXP);
  const prog = rpg.getXPProgress(totals.totalXP);

  return (
    <Screen>
      {/* Hero */}
      <View>
        <GoldAura size={340} intensity={0.5} />
        <Card style={{ overflow: 'hidden' }}>
          <View style={s.heroTop}>
            <View style={{ flex: 1 }}>
              <Wordmark size={38} style={{ color: colors.textPrimary }} />
              <Body style={{ marginTop: 2 }}>Welcome back, {settings.name}.</Body>
            </View>
            {totals.streak > 0 && (
              <View style={s.streakPill}>
                <Icon name="flame" size={14} color={colors.ember} />
                <Mono style={s.streakText}>{totals.streak}</Mono>
              </View>
            )}
          </View>

          <View style={s.rankRow}>
            <LevelBadge level={level} size={30} />
            <Text style={s.rankTitle}>{rank}</Text>
          </View>

          <View style={{ marginTop: space(3) }}>
            <XPBar progress={prog.progress} level={level} xpToNext={prog.xpToNext} showLabel />
          </View>
        </Card>
      </View>

      {/* Stat bento */}
      <View style={s.bento}>
        <StatTile icon="flame" accent={colors.ember} value={totals.streak} label={totals.streak === 1 ? 'Day streak' : 'Day streak'} />
        <StatTile icon="barbell" value={totals.workouts} label="Workouts" />
        <StatTile icon="trending-up" value={totals.totalVolume} compact label="Volume kg" />
      </View>

      {/* Today / start */}
      <Card variant="feature">
        <Label style={{ color: colors.gold }}>Today · {dateKey.todayKey()}</Label>
        <View style={s.todayRow}>
          <View style={{ flex: 1 }}>
            <H2 style={{ color: colors.textInverse, marginTop: 4 }}>{active ? 'Workout in progress' : 'Ready to train?'}</H2>
            <Body style={{ marginTop: 2 }}>{active ? 'Pick up where you left off.' : 'Log a session and earn XP.'}</Body>
          </View>
          <PressScale sound="start" onPress={() => navigation.navigate('Workout')} style={s.playBtn}>
            <Icon name={active ? 'play' : 'add'} size={24} color={colors.obsidian} />
          </PressScale>
        </View>
      </Card>

      {/* Daily activity */}
      <ActivityRings />

      {/* Weekly quests */}
      <QuestBoard />

      {/* Recent */}
      <Card>
        <View style={s.recentHead}>
          <Label>Recent</Label>
          {recent.length > 0 && (
            <PressScale hitSlop={8} onPress={() => setHistoryOpen(true)}>
              <Text style={s.seeAll}>See all</Text>
            </PressScale>
          )}
        </View>
        {recent.length === 0 ? (
          <H1 style={{ marginTop: space(2), fontSize: 26 }}>Your legacy starts here.</H1>
        ) : (
          <View style={{ marginTop: space(2) }}>
            {recent.map((w) => (
              <View key={w.id} style={s.recentRow}>
                <Text style={s.recentDay}>{relDay(w.dateKey)}</Text>
                <Mono style={s.recentMeta}>{w.setCount} sets · {Math.round(w.volume)} kg</Mono>
              </View>
            ))}
          </View>
        )}
      </Card>

      <HistoryModal visible={historyOpen} onClose={() => setHistoryOpen(false)} />
    </Screen>
  );
}

const makeStyles = (colors) => StyleSheet.create({
  heroTop: { flexDirection: 'row', alignItems: 'flex-start' },
  streakPill: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.ivory, borderRadius: radius.full, paddingHorizontal: space(3), paddingVertical: space(1.5) },
  streakText: { color: colors.ember, fontFamily: fonts.monoMedium, fontSize: 13, marginLeft: 4 },
  rankRow: { flexDirection: 'row', alignItems: 'center', marginTop: space(4) },
  rankTitle: { color: colors.textPrimary, fontFamily: fonts.displaySemi, fontSize: 22, marginLeft: space(3) },
  bento: { flexDirection: 'row', gap: space(3) },
  todayRow: { flexDirection: 'row', alignItems: 'center', marginTop: space(2) },
  playBtn: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.gold, alignItems: 'center', justifyContent: 'center', marginLeft: space(3) },
  recentHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  seeAll: { color: colors.gold, fontFamily: fonts.sansMedium, fontSize: 13 },
  recentRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: space(2.5), borderTopColor: colors.ivory, borderTopWidth: StyleSheet.hairlineWidth },
  recentDay: { color: colors.textPrimary, fontFamily: fonts.sansMedium, fontSize: 14 },
  recentMeta: { color: colors.textSecondary, fontSize: 13 },
});
