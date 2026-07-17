// Achievements / trophy-case sheet — the full list (earned first, then locked,
// hidden ones masked until earned). Lifted out of ProfileScreen so the profile
// itself stays short; the profile shows a small preview + "View all".
import { Modal, View, Text, ScrollView, StyleSheet } from 'react-native';
import { achievements as ach } from '@opus/core';
import Icon from '../Icon';
import { H2, Label, Body, Mono } from '../../ui';
import { radius, space, fonts } from '../../theme';
import { useColors, useThemedStyles } from '../../native/ThemeProvider';
import PressScale from '../PressScale';

// Earned achievements sort to the top; within each group, source order is kept.
function ordered(unlocked) {
  const earned = ach.ACHIEVEMENTS.filter((a) => unlocked.has(a.key));
  const locked = ach.ACHIEVEMENTS.filter((a) => !unlocked.has(a.key));
  return [...earned, ...locked];
}

export function AchievementRow({ a, earned }) {
  const s = useThemedStyles(makeStyles);
  const masked = a.hidden && !earned;
  return (
    <View style={s.row}>
      <Text style={[s.icon, !earned && { opacity: 0.3 }]}>{earned ? '🏅' : '🔒'}</Text>
      <View style={{ flex: 1 }}>
        <Text style={[s.title, !earned && s.locked]}>{masked ? 'Hidden achievement' : a.title}</Text>
        <Text style={s.desc}>{masked ? 'Keep training to reveal this one.' : a.desc}</Text>
      </View>
      {a.xp > 0 && earned && <Mono style={s.xp}>+{a.xp}</Mono>}
    </View>
  );
}

export default function AchievementsModal({ visible, onClose, unlocked }) {
  const colors = useColors();
  const s = useThemedStyles(makeStyles);
  const list = ordered(unlocked);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={s.backdrop}>
        <View style={s.sheet}>
          <View style={s.header}>
            <H2>Achievements</H2>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space(3) }}>
              <Mono style={s.count}>{unlocked.size}/{ach.ACHIEVEMENTS.length}</Mono>
              <PressScale hitSlop={10} onPress={onClose}><Icon name="close" size={24} color={colors.ash} /></PressScale>
            </View>
          </View>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: space(8), gap: space(1) }}>
            {list.map((a) => (
              <AchievementRow key={a.key} a={a} earned={unlocked.has(a.key)} />
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const makeStyles = (colors) => StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(17,16,16,0.72)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.chalk, borderTopLeftRadius: radius['2xl'], borderTopRightRadius: radius['2xl'], padding: space(5), paddingBottom: space(2), height: '82%' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: space(3) },
  count: { color: colors.gold, fontFamily: fonts.monoMedium, fontSize: 14 },
  row: { flexDirection: 'row', alignItems: 'center', gap: space(3), paddingVertical: space(2.5), borderTopColor: colors.ivory, borderTopWidth: StyleSheet.hairlineWidth },
  icon: { fontSize: 20 },
  title: { color: colors.textPrimary, fontFamily: fonts.sansMedium, fontSize: 14 },
  locked: { color: colors.ash },
  desc: { color: colors.ash, fontFamily: fonts.sans, fontSize: 12, marginTop: 1 },
  xp: { color: colors.gold, fontFamily: fonts.monoMedium, fontSize: 13 },
});
