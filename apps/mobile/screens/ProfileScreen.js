import { useCallback, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { rpg } from '@opus/core';
import { Screen, H1, Label, Body, Mono } from '../ui';
import { colors, radius, space, fonts } from '../theme';
import Card from '../components/Card';
import StatTile from '../components/StatTile';
import LevelBadge from '../components/rpg/LevelBadge';
import TitleBadge from '../components/rpg/TitleBadge';
import XPBar from '../components/rpg/XPBar';
import OpusMark from '../components/OpusMark';
import { useSettings } from '../native/settings';
import { getTotals } from '../native/db';

export default function ProfileScreen() {
  const { settings } = useSettings();
  const [totals, setTotals] = useState({ totalXP: 0, workouts: 0, sets: 0, streak: 0, totalVolume: 0 });

  useFocusEffect(
    useCallback(() => {
      try {
        setTotals(getTotals());
      } catch {}
    }, [])
  );

  const level = rpg.getLevelFromTotalXP(totals.totalXP);
  const rank = rpg.getRankLabel(totals.totalXP);
  const prestige = rpg.getPrestige(totals.totalXP);
  const prog = rpg.getXPProgress(totals.totalXP);

  return (
    <Screen>
      <H1>Profile</H1>

      {/* Identity hero */}
      <Card>
        <Text style={s.name}>{settings.name}</Text>
        <View style={s.rankRow}>
          <LevelBadge level={level} size={30} />
          <Text style={s.rank}>{rank}</Text>
        </View>
        <View style={{ marginTop: space(3) }}>
          <XPBar progress={prog.progress} level={level} xpToNext={prog.xpToNext} showLabel />
        </View>
      </Card>

      {/* Character card (dark) */}
      <Card variant="dark">
        <View style={s.charTop}>
          <View>
            <Mono style={s.lvl}>Lv. {level}</Mono>
            <TitleBadge title={rpg.getTitle(level)} style={{ marginTop: space(2) }} />
          </View>
          <OpusMark size={78} level={level} prestige={prestige} />
        </View>
        <Body style={{ marginTop: space(3), color: colors.ash }}>
          {Math.round(totals.totalXP).toLocaleString()} XP earned · radar chart coming next update.
        </Body>
      </Card>

      {/* Lifetime bento */}
      <Label>Lifetime</Label>
      <View style={s.bento}>
        <StatTile icon="barbell" value={totals.workouts} label="Workouts" />
        <StatTile icon="repeat" value={totals.sets} label="Sets" />
        <StatTile icon="flame" accent={colors.ember} value={totals.streak} label="Streak" />
      </View>
      <View style={s.bento}>
        <StatTile icon="trending-up" value={Math.round(totals.totalVolume / 1000)} suffix="k" label="Volume kg" />
        <StatTile icon="flash" value={Math.round(totals.totalXP)} label="Total XP" />
        <StatTile icon="ribbon" accent={colors.sage} value={level} label="Level" />
      </View>

      <Body>XP is earned from finished workouts — {rpg.COMPLETE_BONUS} per session plus per-set XP,
        computed by the shared @opus/core engine so web and native agree.</Body>
    </Screen>
  );
}

const s = StyleSheet.create({
  name: { color: colors.textPrimary, fontFamily: fonts.display, fontSize: 30 },
  rankRow: { flexDirection: 'row', alignItems: 'center', marginTop: space(3) },
  rank: { color: colors.textPrimary, fontFamily: fonts.displaySemi, fontSize: 20, marginLeft: space(3) },
  charTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  lvl: { color: colors.textInverse, fontFamily: fonts.monoMedium, fontSize: 28 },
  bento: { flexDirection: 'row', gap: space(3) },
});
