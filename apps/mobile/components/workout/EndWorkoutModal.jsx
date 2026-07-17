// End-of-workout celebration — a bottom-sheet summary shown after a session is
// saved: animated XP / volume / sets counters, a PR banner when a record fell,
// and a gold "Done" CTA. Ports the PWA EndWorkoutModal.
import { Modal, View, Text, StyleSheet } from 'react-native';
import { units, prs as prsCore } from '@opus/core';
import { H1, H2, Label, Mono } from '../../ui';
import { radius, space, fonts } from '../../theme';
import { useColors, useThemedStyles } from '../../native/ThemeProvider';
import { useSettings } from '../../native/settings';
import CountUp from '../fx/CountUp';
import Particles from '../fx/Particles';
import { GoldButton } from '../Button';
import ShareButton from '../share/ShareButton';

function Stat({ label, value, suffix, accent }) {
  const colors = useColors();
  const s = useThemedStyles(makeStyles);
  return (
    <View style={s.stat}>
      <CountUp value={value} suffix={suffix} style={[s.statValue, accent && { color: colors.gold }]} />
      <Label style={{ marginTop: 4 }}>{label}</Label>
    </View>
  );
}

export default function EndWorkoutModal({ visible, summary, prs = [], achievements = [], shareData, onClose }) {
  const colors = useColors();
  const s = useThemedStyles(makeStyles);
  const { settings } = useSettings();
  const unit = settings.unit || 'kg';
  const prCount = prs.length;
  // Format a PR value by its type: reps are a count, weight/volume are weights.
  const fmtPr = (p) => (p.type === 'reps'
    ? `${Math.round(p.value)} reps`
    : `${units.toDisplay(p.value, unit)} ${units.unitLabel(unit)}`);
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={s.backdrop}>
        <View style={s.sheet}>
          {prCount > 0 && <Particles key={`pr-${prCount}`} origin={{ x: 170, y: 90 }} spread={200} />}
          <H1 style={s.title}>{prCount > 0 ? 'New PR! 🏆' : 'Workout saved'}</H1>
          <H2 style={s.sub}>
            {prCount > 0 ? `You beat ${prCount} personal best${prCount > 1 ? 's' : ''}.` : 'Great work — your stats updated.'}
          </H2>

          <View style={s.grid}>
            <Stat label="XP earned" value={summary?.xpEarned ?? 0} suffix=" XP" accent />
            <Stat label="Volume" value={summary?.totalVolume ?? 0} suffix=" kg" />
            <Stat label="Sets" value={summary?.totalSets ?? 0} />
            <Stat label="PRs" value={prCount} accent={prCount > 0} />
          </View>

          {prCount > 0 && (
            <View style={s.prList}>
              {prs.slice(0, 4).map((p) => (
                <View key={`${p.exerciseName}-${p.type || 'e1rm'}`} style={s.prRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.prName}>{p.exerciseName}</Text>
                    {p.type ? <Text style={s.prType}>{prsCore.prTypeLabel(p.type)}</Text> : null}
                  </View>
                  <Mono style={s.prVal}>{fmtPr(p)}</Mono>
                </View>
              ))}
            </View>
          )}

          {achievements.length > 0 && (
            <View style={s.achList}>
              {achievements.map((a) => (
                <View key={a.key} style={s.achRow}>
                  <Text style={s.achIcon}>🏅</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={s.achTitle}>{a.title}</Text>
                    <Text style={s.achDesc}>{a.desc}{a.xp ? ` · +${a.xp} XP` : ''}</Text>
                  </View>
                </View>
              ))}
            </View>
          )}

          {shareData && (
            <ShareButton cardKey="workout" data={shareData} filename="opus-workout.png" label="Share this workout" variant="pill" />
          )}

          <GoldButton label="Done" icon="checkmark" sound="success" onPress={onClose} style={{ marginTop: space(2) }} />
        </View>
      </View>
    </Modal>
  );
}

const makeStyles = (colors) => StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(17,16,16,0.72)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.chalk, borderTopLeftRadius: radius['2xl'], borderTopRightRadius: radius['2xl'], padding: space(6), paddingBottom: space(10), gap: space(3) },
  title: { textAlign: 'center' },
  sub: { textAlign: 'center', color: colors.textSecondary, fontFamily: fonts.sans, fontSize: 15 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: space(2) },
  stat: { width: '50%', paddingVertical: space(3), alignItems: 'center' },
  statValue: { fontSize: 30, color: colors.textPrimary, fontFamily: fonts.mono },
  prList: { gap: space(2), marginTop: space(1) },
  prRow: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: colors.ivory, borderRadius: radius.md, paddingHorizontal: space(4), paddingVertical: space(3) },
  prName: { color: colors.textPrimary, fontFamily: fonts.sansSemi, fontSize: 14 },
  prType: { color: colors.ash, fontFamily: fonts.sans, fontSize: 11, marginTop: 1 },
  prVal: { color: colors.gold, fontSize: 14 },
  achList: { gap: space(2), marginTop: space(1) },
  achRow: { flexDirection: 'row', alignItems: 'center', gap: space(3), backgroundColor: colors.stone, borderRadius: radius.md, paddingHorizontal: space(4), paddingVertical: space(3) },
  achIcon: { fontSize: 22 },
  achTitle: { color: colors.textInverse, fontFamily: fonts.sansSemi, fontSize: 14 },
  achDesc: { color: colors.ash, fontFamily: fonts.sans, fontSize: 12, marginTop: 1 },
});
