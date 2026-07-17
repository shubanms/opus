import { useCallback, useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Icon from '../components/Icon';
import { rpg, dateKey, ambient, decay, bosses, streakShield } from '@opus/core';
import { Screen, Wordmark, H1, H2, Label, Body, Mono } from '../ui';
import { radius, space, fonts } from '../theme';
import { useColors, useThemedStyles } from '../native/ThemeProvider';
import Card from '../components/Card';
import StatTile from '../components/StatTile';
import Segmented from '../components/Segmented';
import LevelBadge from '../components/rpg/LevelBadge';
import XPBar from '../components/rpg/XPBar';
import GoldAura from '../components/fx/GoldAura';
import PressScale from '../components/PressScale';
import QuestBoard from '../components/home/QuestBoard';
import HistoryModal from '../components/home/HistoryModal';
import ActivityRings from '../components/home/ActivityRings';
import WeeklyRecap from '../components/home/WeeklyRecap';
import RecoveryCard from '../components/progress/RecoveryCard';
import { getTotals, getRecentWorkouts, getTodayPlan, getLastWorkoutDate, computeAchievementStats } from '../native/db';
import { useWorkoutSession } from '../native/workoutSession';
import { refreshWidgets } from '../native/widgets';
import { useSettings, motionOn, setSetting } from '../native/settings';
import { playCue } from '../native/sound';

// The "calling you back" anthem plays at most once per app session, the first
// time Home shows an active XP-decay warning (mirrors the web streakRisk cue).
let anthemPlayed = false;

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
  const [stats, setStats] = useState(null);
  const [today, setToday] = useState({ type: 'fresh', reason: 'No plan today — start fresh.' });
  const [lastWorkoutDate, setLastWorkoutDate] = useState(null);
  const active = useWorkoutSession();
  const [historyOpen, setHistoryOpen] = useState(false);
  const [deck, setDeck] = useState('activity');

  useFocusEffect(
    useCallback(() => {
      try {
        setTotals(getTotals());
        setRecent(getRecentWorkouts(3));
        setStats(computeAchievementStats());
        setToday(getTodayPlan());
        setLastWorkoutDate(getLastWorkoutDate());
        refreshWidgets();
      } catch {}
    }, [])
  );

  // XP decay → boss cap → progression, mirroring the web Home derivation order.
  const rawInfo = decay.decayInfo({ totalXp: totals.totalXP, lastWorkoutDate, streak: totals.streak });
  // Streak shield: tokens derived from history (workouts + claimed quests);
  // spending one waives the streak-break penalty on the current lapse.
  const shieldTokens = streakShield.tokenBalance(
    streakShield.tokensEarned({ workouts: totals.workouts, questClaims: totals.questClaims }),
    settings.tokensSpent
  );
  const shieldActive = streakShield.isShieldActive(settings.shieldedLapseDate, lastWorkoutDate);
  const streakPenalty = decay.streakBreakPenalty(rawInfo.days, totals.streak);
  const info = streakShield.shieldedDecay(rawInfo, { active: shieldActive, streakPenalty, earnedXp: totals.totalXP });
  const canShield = rawInfo.decaying && streakPenalty > 0 && !shieldActive && shieldTokens > 0;
  const effXp = info.effectiveXp;
  const rawLevel = rpg.getLevelFromTotalXP(effXp);
  const level = stats ? bosses.cappedLevel(rawLevel, stats) : rawLevel;
  const boss = stats ? bosses.activeBoss(rawLevel, stats) : null;
  const prestige = rpg.getPrestige(effXp);
  const rank = rpg.getRankLabel(effXp);
  const prog = rpg.getXPProgress(effXp);
  const scene = ambient.sceneParams({ streak: totals.streak, level, prestige, reducedMotion: !motionOn() });

  // Once per session, sound the "calling you back" anthem when the rank is slipping.
  useEffect(() => {
    if (info.decaying && !anthemPlayed) { anthemPlayed = true; playCue('anthem'); }
  }, [info.decaying]);

  const deckTabs = [
    { value: 'activity', label: 'Activity' },
    ...(totals.workouts > 0 ? [{ value: 'recovery', label: 'Recovery' }] : []),
    { value: 'quests', label: 'Quests' },
  ];

  return (
    <Screen>
      {/* Hero */}
      <View>
        <GoldAura size={340} intensity={scene.goldShade} speed={scene.motionSpeed} />
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

          {info.decaying && (
            <View style={s.decayRow}>
              <Icon name="trending-up" size={13} color={colors.ember} />
              <Text style={s.decayText}>Rank slipping — train to recover (−{info.lost} XP)</Text>
              {canShield && (
                <PressScale
                  onPress={() => { setSetting('tokensSpent', (settings.tokensSpent || 0) + 1); setSetting('shieldedLapseDate', lastWorkoutDate || ''); playCue('goal'); }}
                  style={s.shieldBtn}
                >
                  <Text style={s.shieldBtnText}>🛡️ Use shield ({shieldTokens})</Text>
                </PressScale>
              )}
            </View>
          )}
          {!info.decaying && shieldActive && (
            <View style={s.decayRow}>
              <Text style={[s.decayText, { color: colors.sage }]}>🛡️ Streak shielded — rest day protected</Text>
            </View>
          )}
          {!info.decaying && !shieldActive && shieldTokens > 0 && (
            <View style={s.decayRow}>
              <Mono style={s.tokenText}>🛡️ {shieldTokens} rest {shieldTokens === 1 ? 'token' : 'tokens'} banked</Mono>
            </View>
          )}
        </Card>
      </View>

      {/* Stat bento */}
      <View style={s.bento}>
        <StatTile icon="flame" accent={colors.ember} value={totals.streak} label="Day streak" />
        <StatTile icon="barbell" value={totals.workouts} label="Workouts" />
        <StatTile icon="trending-up" value={totals.totalVolume} compact label="Volume kg" />
      </View>

      {/* Boss gate */}
      {boss && (
        <PressScale onPress={() => navigation.navigate('Profile')} style={s.bossCard}>
          <Icon name="flame" size={20} color={colors.ember} style={{ marginRight: space(3) }} />
          <View style={{ flex: 1 }}>
            <Text style={s.bossTitle}>Boss gate · Lv.{boss.gate} {boss.title}</Text>
            <Text style={s.bossDesc}>{boss.desc}</Text>
          </View>
          <Icon name="chevron-forward" size={18} color={colors.ash} />
        </PressScale>
      )}

      {/* Today */}
      <Card variant="feature">
        <Label style={{ color: colors.gold }}>Today · {dateKey.todayKey()}</Label>
        <View style={s.todayRow}>
          <View style={{ flex: 1 }}>
            <H2 style={{ color: colors.textInverse, marginTop: 4 }}>
              {active ? 'Workout in progress' : today.type === 'rest' ? 'Rest day' : today.type === 'template' ? today.template?.name || 'On your plan' : 'Ready to train?'}
            </H2>
            <Body style={{ marginTop: 2 }}>
              {active ? 'Pick up where you left off.' : today.type === 'template' ? `${today.template?.exercises?.length || 0} exercises · ${today.reason}` : today.reason}
            </Body>
          </View>
          <PressScale sound="start" onPress={() => navigation.navigate('Workout')} style={s.playBtn}>
            <Icon name={active ? 'play' : today.type === 'rest' ? 'checkmark' : 'add'} size={24} color={colors.obsidian} />
          </PressScale>
        </View>
      </Card>

      {/* Weekly recap */}
      <WeeklyRecap />

      {/* Secondary deck */}
      <Segmented options={deckTabs} value={deckTabs.some((t) => t.value === deck) ? deck : 'activity'} onChange={setDeck} />
      {deck === 'activity' && <ActivityRings />}
      {deck === 'recovery' && totals.workouts > 0 && <RecoveryCard />}
      {deck === 'quests' && <QuestBoard />}

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
  decayRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: space(2), marginTop: space(3) },
  decayText: { color: colors.ember, fontFamily: fonts.sans, fontSize: 12 },
  shieldBtn: { backgroundColor: colors.gold, borderRadius: radius.full, paddingHorizontal: space(2.5), paddingVertical: space(1) },
  shieldBtnText: { color: colors.obsidian, fontFamily: fonts.sansSemi, fontSize: 12 },
  tokenText: { color: colors.ash, fontFamily: fonts.mono, fontSize: 11 },
  bento: { flexDirection: 'row', gap: space(3) },
  bossCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.obsidian, borderColor: colors.ember, borderWidth: 1, borderRadius: radius.xl, padding: space(4) },
  bossTitle: { color: colors.textInverse, fontFamily: fonts.sansSemi, fontSize: 14 },
  bossDesc: { color: colors.ash, fontFamily: fonts.sans, fontSize: 12, marginTop: 1 },
  todayRow: { flexDirection: 'row', alignItems: 'center', marginTop: space(2) },
  playBtn: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.gold, alignItems: 'center', justifyContent: 'center', marginLeft: space(3) },
  recentHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  seeAll: { color: colors.gold, fontFamily: fonts.sansMedium, fontSize: 13 },
  recentRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: space(2.5), borderTopColor: colors.ivory, borderTopWidth: StyleSheet.hairlineWidth },
  recentDay: { color: colors.textPrimary, fontFamily: fonts.sansMedium, fontSize: 14 },
  recentMeta: { color: colors.textSecondary, fontSize: 13 },
});
