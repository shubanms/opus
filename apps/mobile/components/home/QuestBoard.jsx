// Weekly quest board — 3 deterministic quests for the current week (rotates each
// Monday), live progress bars, and a claim button when a target is met. Ports
// the PWA QuestBoard. Self-contained: reads/writes the questClaims table.
import { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Icon from '../Icon';
import { quests as coreQuests } from '@opus/core';
import { Label, Mono } from '../../ui';
import { radius, space, fonts } from '../../theme';
import { useColors, useThemedStyles } from '../../native/ThemeProvider';
import Card from '../Card';
import PressScale from '../PressScale';
import Particles from '../fx/Particles';
import { useDbQuery } from '../../native/useDbQuery';
import { getWeekQuestStats, getQuestClaims, claimQuest } from '../../native/db';
import { playCue } from '../../native/sound';
import { success as hSuccess } from '../../native/haptics';

// Map the pool's icon names to Ionicons.
const ICON = {
  dumbbell: 'barbell', trophy: 'trophy', weight: 'barbell', footprints: 'walk',
  listChecks: 'list', layers: 'layers', flame: 'flame', mountain: 'trending-up',
};

export default function QuestBoard() {
  const colors = useColors();
  const s = useThemedStyles(makeStyles);
  const weekQuests = coreQuests.weeklyQuests();
  const stats = useDbQuery(() => getWeekQuestStats(), [], {});
  const claims = useDbQuery(() => getQuestClaims(), [], []);
  const claimed = new Set(claims);
  const [burst, setBurst] = useState(0);

  const doClaim = (q) => {
    if (claimQuest(q.id, q.xp)) {
      hSuccess();
      playCue('goal');
      setBurst((b) => b + 1);
    }
  };

  return (
    <View>
      <Label style={{ marginBottom: space(2) }}>This week's quests</Label>
      <Card>
        <View style={{ gap: space(3) }}>
          {weekQuests.map((q) => {
            const progress = stats?.[q.metric] || 0;
            const pct = Math.min(1, target(q) > 0 ? progress / target(q) : 0);
            const done = progress >= target(q);
            const isClaimed = claimed.has(q.id);
            return (
              <View key={q.id} style={s.quest}>
                <View style={s.qHead}>
                  <Icon name={ICON[q.icon] || 'ellipse'} size={18} color={colors.gold} style={{ marginRight: space(2) }} />
                  <View style={{ flex: 1 }}>
                    <Text style={s.qTitle}>{q.title}</Text>
                    <Text style={s.qDesc}>{questDesc(q)}</Text>
                  </View>
                  {isClaimed ? (
                    <View style={s.claimedPill}><Icon name="checkmark" size={13} color={colors.sage} /><Text style={s.claimedText}> Claimed</Text></View>
                  ) : done ? (
                    <PressScale onPress={() => doClaim(q)} style={s.claimBtn}>
                      <Text style={s.claimText}>+{q.xp} XP</Text>
                    </PressScale>
                  ) : (
                    <Mono style={s.qProg}>{fmtProg(q, progress)}</Mono>
                  )}
                </View>
                <View style={s.track}>
                  <View style={[s.fill, { width: `${pct * 100}%`, backgroundColor: done ? colors.sage : colors.gold }]} />
                </View>
              </View>
            );
          })}
        </View>
      </Card>
      {burst > 0 && <Particles key={burst} origin={{ x: 180, y: 40 }} spread={160} />}
    </View>
  );
}

function target(q) {
  return q.target;
}
function questDesc(q) {
  return q.volume ? `Lift ${(q.target / 1000).toLocaleString()} t of volume` : q.desc;
}
function fmtProg(q, progress) {
  if (q.volume) return `${Math.round(progress / 1000)}/${Math.round(q.target / 1000)}t`;
  return `${Math.round(progress)}/${q.target}`;
}

const makeStyles = (colors) => StyleSheet.create({
  quest: { gap: space(2) },
  qHead: { flexDirection: 'row', alignItems: 'center' },
  qTitle: { color: colors.textPrimary, fontFamily: fonts.sansSemi, fontSize: 14 },
  qDesc: { color: colors.textSecondary, fontFamily: fonts.sans, fontSize: 12, marginTop: 1 },
  qProg: { color: colors.ash, fontFamily: fonts.mono, fontSize: 13 },
  claimBtn: { backgroundColor: colors.gold, borderRadius: radius.full, paddingHorizontal: space(3.5), paddingVertical: space(1.5) },
  claimText: { color: colors.obsidian, fontFamily: fonts.sansSemi, fontSize: 12 },
  claimedPill: { flexDirection: 'row', alignItems: 'center' },
  claimedText: { color: colors.sage, fontFamily: fonts.sansMedium, fontSize: 12 },
  track: { height: 6, borderRadius: 3, backgroundColor: colors.ivory, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 3 },
});
