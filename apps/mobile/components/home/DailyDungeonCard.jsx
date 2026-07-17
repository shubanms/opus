// Today's deterministic dungeon (native parity): a themed session with affixes
// + an Iron reward you can claim once you've trained today.
import { View, Text, StyleSheet } from 'react-native';
import { dungeon as dungeonCore, dateKey } from '@opus/core';
import Icon from '../Icon';
import { radius, space, fonts } from '../../theme';
import { useColors, useThemedStyles } from '../../native/ThemeProvider';
import PressScale from '../PressScale';
import { useSettings, setSetting } from '../../native/settings';
import { playCue } from '../../native/sound';
import { success as hSuccess } from '../../native/haptics';
import * as session from '../../native/workoutSession';

export default function DailyDungeonCard({ lastWorkoutDate, navigation }) {
  const colors = useColors();
  const s = useThemedStyles(makeStyles);
  const { settings } = useSettings();
  const today = dateKey.todayKey();
  const d = dungeonCore.todaysDungeon(today);
  const trainedToday = lastWorkoutDate === today;
  const claimed = settings.lastDungeonClaim === today;

  const enter = () => {
    try { session.startSession(d.name); } catch {}
    playCue('start');
    navigation?.navigate('Workout');
  };
  const claim = () => {
    if (!trainedToday || claimed) return;
    setSetting('dungeonIron', (settings.dungeonIron || 0) + d.ironReward);
    setSetting('lastDungeonClaim', today);
    hSuccess(); playCue('quest');
  };

  return (
    <View style={s.card}>
      <View style={s.top}>
        <Text style={s.kicker}>⚔ DAILY DUNGEON</Text>
        <Text style={s.iron}>◆ {d.ironReward}</Text>
      </View>
      <Text style={s.name}>{d.name}</Text>
      <Text style={s.boss}>⚔ {d.boss} · {d.group}</Text>
      <View style={s.affixes}>
        {d.affixes.map((a) => (
          <Text key={a.id} style={s.affix}>{a.name}</Text>
        ))}
      </View>
      <View style={s.row}>
        <PressScale onPress={enter} style={s.enterBtn}><Text style={s.enterText}>Enter dungeon</Text></PressScale>
        {trainedToday && (
          <PressScale onPress={claim} style={[s.claimBtn, claimed && { backgroundColor: colors.ivory }]}>
            <Text style={[s.claimText, claimed && { color: colors.ash }]}>{claimed ? '✓ Claimed' : `Claim ◆${d.ironReward}`}</Text>
          </PressScale>
        )}
      </View>
    </View>
  );
}

const makeStyles = (colors) => StyleSheet.create({
  card: { backgroundColor: colors.chalk, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.gold, padding: space(4), marginTop: space(3) },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  kicker: { color: colors.gold, fontFamily: fonts.sansSemi, fontSize: 11, letterSpacing: 1 },
  iron: { color: colors.gold, fontFamily: fonts.monoMedium, fontSize: 12 },
  name: { color: colors.textPrimary, fontFamily: fonts.displaySemi, fontSize: 18, marginTop: space(1.5) },
  boss: { color: colors.textSecondary, fontFamily: fonts.sans, fontSize: 12, marginTop: 2 },
  affixes: { flexDirection: 'row', flexWrap: 'wrap', gap: space(1.5), marginTop: space(2) },
  affix: { backgroundColor: colors.ivory, color: colors.textPrimary, fontFamily: fonts.sans, fontSize: 11, paddingHorizontal: space(2), paddingVertical: 3, borderRadius: radius.full, overflow: 'hidden' },
  row: { flexDirection: 'row', gap: space(2), marginTop: space(3) },
  enterBtn: { flex: 1, backgroundColor: colors.gold, borderRadius: radius.lg, paddingVertical: space(2.5), alignItems: 'center' },
  enterText: { color: colors.obsidian, fontFamily: fonts.sansSemi, fontSize: 14 },
  claimBtn: { backgroundColor: colors.obsidian, borderRadius: radius.lg, paddingHorizontal: space(3), paddingVertical: space(2.5), alignItems: 'center', justifyContent: 'center' },
  claimText: { color: colors.gold, fontFamily: fonts.monoMedium, fontSize: 13 },
});
