import { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { rpg, achievements as ach, bosses } from '@opus/core';
import { Screen, H1, Label, Body, Mono } from '../ui';
import { colors, radius, space, fonts } from '../theme';
import Card from '../components/Card';
import StatTile from '../components/StatTile';
import LevelBadge from '../components/rpg/LevelBadge';
import TitleBadge from '../components/rpg/TitleBadge';
import XPBar from '../components/rpg/XPBar';
import OpusMark from '../components/OpusMark';
import PressScale from '../components/PressScale';
import { SecondaryButton } from '../components/Button';
import ProgressionModal from '../components/profile/ProgressionModal';
import HallOfRecordsModal from '../components/profile/HallOfRecordsModal';
import { useSettings } from '../native/settings';
import { useDbQuery } from '../native/useDbQuery';
import { getTotals, unlockedAchievementKeys, computeAchievementStats, getAllPRs } from '../native/db';

export default function ProfileScreen() {
  const { settings } = useSettings();
  const [sheet, setSheet] = useState(null); // 'ranks' | 'records' | null
  const totals = useDbQuery(() => getTotals(), [], { totalXP: 0, workouts: 0, sets: 0, streak: 0, totalVolume: 0 });
  const unlockedKeys = useDbQuery(() => unlockedAchievementKeys(), [], []);
  const stats = useDbQuery(() => computeAchievementStats(), [], null);
  const prs = useDbQuery(() => getAllPRs(200), [], []);
  const unlocked = new Set(unlockedKeys);

  const rawLevel = rpg.getLevelFromTotalXP(totals.totalXP);
  const level = bosses.cappedLevel(rawLevel, stats); // display level respects boss gates
  const activeBoss = bosses.activeBoss(rawLevel, stats);
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

      {/* Boss gate callout — level is held at the gate until the feat is done */}
      {activeBoss && (
        <PressScale onPress={() => setSheet('ranks')} style={s.bossCallout}>
          <Ionicons name="flame" size={20} color={colors.ember} style={{ marginRight: space(3) }} />
          <View style={{ flex: 1 }}>
            <Text style={s.bossTitle}>Boss gate · Lv.{activeBoss.gate} {activeBoss.title}</Text>
            <Text style={s.bossDesc}>{activeBoss.desc}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.ash} />
        </PressScale>
      )}

      {/* Ranks & Records entry points */}
      <View style={s.btnRow}>
        <SecondaryButton label="Ranks & bosses" icon="ribbon" onPress={() => setSheet('ranks')} style={{ flex: 1 }} />
        <SecondaryButton label="Hall of Records" icon="trophy" onPress={() => setSheet('records')} style={{ flex: 1 }} />
      </View>

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

      {/* Achievements / trophy case */}
      <View style={s.achHead}>
        <Label>Achievements</Label>
        <Mono style={s.achCount}>{unlocked.size}/{ach.ACHIEVEMENTS.length}</Mono>
      </View>
      <Card>
        <View style={{ gap: space(1) }}>
          {ach.ACHIEVEMENTS.map((a) => {
            const earned = unlocked.has(a.key);
            const masked = a.hidden && !earned;
            return (
              <View key={a.key} style={s.achRow}>
                <Text style={[s.achIcon, !earned && { opacity: 0.3 }]}>{earned ? '🏅' : '🔒'}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[s.achTitle, !earned && s.achLocked]}>{masked ? 'Hidden achievement' : a.title}</Text>
                  <Text style={s.achDesc}>{masked ? 'Keep training to reveal this one.' : a.desc}</Text>
                </View>
                {a.xp > 0 && earned && <Mono style={s.achXp}>+{a.xp}</Mono>}
              </View>
            );
          })}
        </View>
      </Card>

      <Body>XP is earned from finished workouts — {rpg.COMPLETE_BONUS} per session plus per-set XP
        and achievement rewards, computed by the shared @opus/core engine so web and native agree.</Body>

      <ProgressionModal visible={sheet === 'ranks'} onClose={() => setSheet(null)} level={rawLevel} stats={stats} />
      <HallOfRecordsModal visible={sheet === 'records'} onClose={() => setSheet(null)} prs={prs} />
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
  achHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  achCount: { color: colors.gold, fontFamily: fonts.monoMedium, fontSize: 14 },
  achRow: { flexDirection: 'row', alignItems: 'center', gap: space(3), paddingVertical: space(2.5), borderTopColor: colors.ivory, borderTopWidth: StyleSheet.hairlineWidth },
  achIcon: { fontSize: 20 },
  achTitle: { color: colors.textPrimary, fontFamily: fonts.sansSemi, fontSize: 14 },
  achLocked: { color: colors.textSecondary },
  achDesc: { color: colors.textSecondary, fontFamily: fonts.sans, fontSize: 12, marginTop: 1 },
  achXp: { color: colors.gold, fontFamily: fonts.mono, fontSize: 12 },
  bossCallout: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.ivory, borderRadius: radius.lg, padding: space(4), borderLeftWidth: 3, borderLeftColor: colors.ember },
  bossTitle: { color: colors.textPrimary, fontFamily: fonts.sansSemi, fontSize: 14 },
  bossDesc: { color: colors.textSecondary, fontFamily: fonts.sans, fontSize: 12, marginTop: 1 },
  btnRow: { flexDirection: 'row', gap: space(3) },
});

