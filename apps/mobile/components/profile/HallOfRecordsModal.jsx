// Hall of Records sheet — every PR, grouped by date (newest first). Ports the
// PWA HallOfRecordsPage. Reads the prs table (passed in as `prs`).
import { Modal, View, Text, ScrollView, StyleSheet } from 'react-native';
import Icon from '../Icon';
import { H2, Label, Body, Mono } from '../../ui';
import { radius, space, fonts } from '../../theme';
import { useColors, useThemedStyles } from '../../native/ThemeProvider';
import PressScale from '../PressScale';

function dayLabel(ms) {
  const d = new Date(ms);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function HallOfRecordsModal({ visible, onClose, prs = [] }) {
  const colors = useColors();
  const s = useThemedStyles(makeStyles);
  // Group by calendar day (newest first — prs already come newest-first).
  const groups = [];
  const byDay = new Map();
  for (const p of prs) {
    const key = new Date(p.achievedAt).toDateString();
    if (!byDay.has(key)) {
      const g = { key, ms: p.achievedAt, items: [] };
      byDay.set(key, g);
      groups.push(g);
    }
    byDay.get(key).items.push(p);
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={s.backdrop}>
        <View style={s.sheet}>
          <View style={s.header}>
            <H2>Hall of Records</H2>
            <PressScale hitSlop={10} onPress={onClose}><Icon name="close" size={24} color={colors.ash} /></PressScale>
          </View>

          {groups.length === 0 ? (
            <Body style={{ marginTop: space(4) }}>No personal records yet — beat a best est. 1RM and it lands here.</Body>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: space(8), gap: space(3) }}>
              {groups.map((g) => (
                <View key={g.key} style={{ gap: space(2) }}>
                  <Label>{dayLabel(g.ms)}</Label>
                  {g.items.map((p) => (
                    <View key={p.id} style={s.row}>
                      <Icon name="trophy" size={16} color={colors.gold} style={{ marginRight: space(3) }} />
                      <Text style={s.name} numberOfLines={1}>{p.exerciseName}</Text>
                      <Mono style={s.val}>{Math.round(p.value)} kg {p.type === 'e1rm' ? '1RM' : ''}</Mono>
                    </View>
                  ))}
                </View>
              ))}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

const makeStyles = (colors) => StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(17,16,16,0.72)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.chalk, borderTopLeftRadius: radius['2xl'], borderTopRightRadius: radius['2xl'], padding: space(5), paddingBottom: space(2), height: '82%' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: space(3) },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.ivory, borderRadius: radius.md, paddingHorizontal: space(4), paddingVertical: space(3) },
  name: { flex: 1, color: colors.textPrimary, fontFamily: fonts.sansMedium, fontSize: 14 },
  val: { color: colors.gold, fontFamily: fonts.monoMedium, fontSize: 14 },
});
