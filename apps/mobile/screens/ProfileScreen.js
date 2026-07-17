import { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Icon from '../components/Icon';
import { rpg, achievements as ach, bosses, economy } from '@opus/core';
import { Screen, H1, Label, Body, Mono } from '../ui';
import { radius, space, fonts } from '../theme';
import { useColors, useThemedStyles } from '../native/ThemeProvider';
import Card from '../components/Card';
import StatTile from '../components/StatTile';
import LevelBadge from '../components/rpg/LevelBadge';
import TitleBadge from '../components/rpg/TitleBadge';
import XPBar from '../components/rpg/XPBar';
import OpusMark from '../components/OpusMark';
import RadarCard from '../components/rpg/RadarCard';
import PressScale from '../components/PressScale';
import { SecondaryButton } from '../components/Button';
import ProgressionModal from '../components/profile/ProgressionModal';
import HallOfRecordsModal from '../components/profile/HallOfRecordsModal';
import WrappedModal from '../components/profile/WrappedModal';
import AchievementsModal, { AchievementRow } from '../components/profile/AchievementsModal';
import VaultModal from '../components/rpg/VaultModal';
import ShareButton from '../components/share/ShareButton';
import { useSettings } from '../native/settings';
import { useDbQuery } from '../native/useDbQuery';
import { getTotals, unlockedAchievementKeys, computeAchievementStats, getAllPRs, getWrappedInputs, getRadarInputs } from '../native/db';

export default function ProfileScreen({ navigation }) {
  const colors = useColors();
  const s = useThemedStyles(makeStyles);
  const { settings } = useSettings();
  const [sheet, setSheet] = useState(null); // 'ranks' | 'records' | null
  const totals = useDbQuery(() => getTotals(), [], { totalXP: 0, workouts: 0, sets: 0, streak: 0, totalVolume: 0 });
  const unlockedKeys = useDbQuery(() => unlockedAchievementKeys(), [], []);
  const stats = useDbQuery(() => computeAchievementStats(), [], null);
  const prs = useDbQuery(() => getAllPRs(200), [], []);
  const wrappedInputs = useDbQuery(() => getWrappedInputs(), [], { workouts: [], sets: [], prs: [], exName: {} });
  const radarInputs = useDbQuery(() => getRadarInputs(), [], null);
  const unlocked = new Set(unlockedKeys);
  // Preview = earned first, then locked, capped so the profile stays short.
  const achPreview = [
    ...ach.ACHIEVEMENTS.filter((a) => unlocked.has(a.key)),
    ...ach.ACHIEVEMENTS.filter((a) => !unlocked.has(a.key)),
  ].slice(0, 4);

  const rawLevel = rpg.getLevelFromTotalXP(totals.totalXP);
  const level = bosses.cappedLevel(rawLevel, stats); // display level respects boss gates
  const activeBoss = bosses.activeBoss(rawLevel, stats);
  const rank = rpg.getRankLabel(totals.totalXP);
  const prestige = rpg.getPrestige(totals.totalXP);
  const prog = rpg.getXPProgress(totals.totalXP);

  // Iron economy: equipped title flair + spendable balance (derived from history).
  const equipped = settings.equipped || {};
  const flair = equipped.titleFlair ? economy.cosmeticById(equipped.titleFlair)?.value : null;
  const ironBal = economy.ironBalance(
    economy.earnedIron({ workouts: totals.workouts, prCount: totals.prCount, questClaims: totals.questClaims, bonusIron: settings.dungeonIron }),
    settings.ironSpent
  );

  // Share-card payloads (mirror the web ProfilePage share data).
  const charStats = rpg.getCharacterStats(radarInputs || {});
  const unit = settings.unit || 'kg';
  const profileShareData = {
    name: settings.name, level, prestige, title: rank, stats: charStats,
    workouts: totals.workouts, streak: totals.streak, totalXp: totals.totalXP,
  };
  const challengeShareData = {
    name: settings.name, level, title: rank, workouts: totals.workouts,
    volumeKg: totals.totalVolume, bestStreak: stats?.bestStreak ?? totals.streak, unit,
  };

  return (
    <Screen>
      {/* Header row — title + Settings gear (Settings is no longer a bottom tab). */}
      <View style={s.headerRow}>
        <H1>Profile</H1>
        <PressScale sound="tap" onPress={() => navigation?.navigate('Settings')} hitSlop={10} style={s.gear} accessibilityLabel="Settings">
          <Icon name="settings" size={22} color={colors.textSecondary} />
        </PressScale>
      </View>

      {/* Identity hero */}
      <Card>
        <Text style={s.name}>{flair ? `${flair} ` : ''}{settings.name}</Text>
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
          {Math.round(totals.totalXP).toLocaleString()} XP earned
        </Body>
      </Card>

      {/* Character radar */}
      <RadarCard />

      {/* Boss gate callout — level is held at the gate until the feat is done */}
      {activeBoss && (
        <PressScale onPress={() => setSheet('ranks')} style={s.bossCallout}>
          <Icon name="flame" size={20} color={colors.ember} style={{ marginRight: space(3) }} />
          <View style={{ flex: 1 }}>
            <Text style={s.bossTitle}>Boss gate · Lv.{activeBoss.gate} {activeBoss.title}</Text>
            <Text style={s.bossDesc}>{activeBoss.desc}</Text>
          </View>
          <Icon name="chevron-forward" size={18} color={colors.ash} />
        </PressScale>
      )}

      {/* Ranks & Records entry points */}
      <View style={s.btnRow}>
        <SecondaryButton label="Ranks & bosses" icon="ribbon" onPress={() => setSheet('ranks')} style={{ flex: 1 }} />
        <SecondaryButton label="Hall of Records" icon="trophy" onPress={() => setSheet('records')} style={{ flex: 1 }} />
      </View>
      <SecondaryButton label="Your Wrapped" icon="sparkles" onPress={() => setSheet('wrapped')} />
      <SecondaryButton label={`The Vault · ◆ ${ironBal.toLocaleString()} Iron`} icon="star" onPress={() => setSheet('vault')} />

      {/* Shareable cards */}
      <View style={s.btnRow}>
        <ShareButton cardKey="profile" data={profileShareData} filename="opus-profile.png" label="Share profile" variant="pill" style={{ flex: 1 }} />
        <ShareButton cardKey="challenge" data={challengeShareData} filename="opus-challenge.png" label="Challenge" variant="pill" style={{ flex: 1 }} />
      </View>

      {/* Lifetime bento */}
      <Label>Lifetime</Label>
      <View style={s.bento}>
        <StatTile icon="barbell" value={totals.workouts} label="Workouts" />
        <StatTile icon="repeat" value={totals.sets} label="Sets" />
        <StatTile icon="flame" accent={colors.ember} value={totals.streak} label="Streak" />
      </View>
      <View style={s.bento}>
        <StatTile icon="trending-up" value={totals.totalVolume} compact label="Volume kg" />
        <StatTile icon="flash" value={Math.round(totals.totalXP)} label="Total XP" />
        <StatTile icon="ribbon" accent={colors.sage} value={level} label="Level" />
      </View>

      {/* Achievements / trophy case — a short preview; full list opens in a sheet. */}
      <View style={s.achHead}>
        <Label>Achievements</Label>
        <Mono style={s.achCount}>{unlocked.size}/{ach.ACHIEVEMENTS.length}</Mono>
      </View>
      <Card>
        <View style={{ gap: space(1) }}>
          {achPreview.map((a) => (
            <AchievementRow key={a.key} a={a} earned={unlocked.has(a.key)} />
          ))}
        </View>
      </Card>
      <SecondaryButton label={`View all achievements (${ach.ACHIEVEMENTS.length})`} icon="trophy" onPress={() => setSheet('achievements')} />

      <Body>XP is earned from finished workouts — {rpg.COMPLETE_BONUS} per session, plus per-set XP and achievement rewards.</Body>

      <ProgressionModal visible={sheet === 'ranks'} onClose={() => setSheet(null)} level={rawLevel} stats={stats} />
      <HallOfRecordsModal visible={sheet === 'records'} onClose={() => setSheet(null)} prs={prs} />
      <WrappedModal visible={sheet === 'wrapped'} onClose={() => setSheet(null)} inputs={wrappedInputs} />
      <AchievementsModal visible={sheet === 'achievements'} onClose={() => setSheet(null)} unlocked={unlocked} />
      <VaultModal visible={sheet === 'vault'} onClose={() => setSheet(null)} />
    </Screen>
  );
}

const makeStyles = (colors) => StyleSheet.create({
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  gear: { padding: space(1) },
  name: { color: colors.textPrimary, fontFamily: fonts.display, fontSize: 30 },
  rankRow: { flexDirection: 'row', alignItems: 'center', marginTop: space(3) },
  rank: { color: colors.textPrimary, fontFamily: fonts.displaySemi, fontSize: 20, marginLeft: space(3) },
  charTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  lvl: { color: colors.textInverse, fontFamily: fonts.monoMedium, fontSize: 28 },
  bento: { flexDirection: 'row', gap: space(3) },
  achHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  achCount: { color: colors.gold, fontFamily: fonts.monoMedium, fontSize: 14 },
  bossCallout: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.ivory, borderRadius: radius.lg, padding: space(4), borderLeftWidth: 3, borderLeftColor: colors.ember },
  bossTitle: { color: colors.textPrimary, fontFamily: fonts.sansSemi, fontSize: 14 },
  bossDesc: { color: colors.textSecondary, fontFamily: fonts.sans, fontSize: 12, marginTop: 1 },
  btnRow: { flexDirection: 'row', gap: space(3) },
});

