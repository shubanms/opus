// Progression sheet — the rank ladder (10 named titles across 50 levels) plus
// the 5 boss gates (cleared / active / locked). Ports the PWA ProgressionPage.
// Pure display over @opus/core rpg.RANKS + bosses.bossList(stats).
import { Modal, View, Text, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { rpg, bosses } from '@opus/core';
import { H2, Label, Mono } from '../../ui';
import { colors, radius, space, fonts } from '../../theme';
import PressScale from '../PressScale';

export default function ProgressionModal({ visible, onClose, level = 1, stats }) {
  const gates = bosses.bossList(stats);
  const active = bosses.activeBoss(level, stats);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={s.backdrop}>
        <View style={s.sheet}>
          <View style={s.header}>
            <H2>Ranks & bosses</H2>
            <PressScale hitSlop={10} onPress={onClose}><Ionicons name="close" size={24} color={colors.ash} /></PressScale>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: space(8), gap: space(2) }}>
            <Label>Boss gates</Label>
            {gates.map((b) => {
              const isActive = active && active.key === b.key;
              return (
                <View key={b.key} style={[s.gate, b.cleared && s.gateCleared, isActive && s.gateActive]}>
                  <Ionicons
                    name={b.cleared ? 'shield-checkmark' : isActive ? 'flame' : 'lock-closed'}
                    size={18}
                    color={b.cleared ? colors.sage : isActive ? colors.ember : colors.ash}
                    style={{ marginRight: space(3) }}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={s.gateTitle}>Lv.{b.gate} · {b.title}</Text>
                    <Text style={s.gateDesc}>{b.desc}</Text>
                  </View>
                  <Mono style={[s.gateState, b.cleared && { color: colors.sage }, isActive && { color: colors.ember }]}>
                    {b.cleared ? 'CLEARED' : isActive ? 'ACTIVE' : 'LOCKED'}
                  </Mono>
                </View>
              );
            })}

            <Label style={{ marginTop: space(4) }}>Rank ladder</Label>
            {rpg.RANKS.map((r) => {
              const reached = level >= r.level;
              const current = level >= r.level && level < r.level + 5;
              return (
                <View key={r.level} style={[s.rank, current && s.rankCurrent]}>
                  <Mono style={[s.rankLvl, reached && { color: colors.gold }]}>Lv.{r.level}</Mono>
                  <Text style={[s.rankTitle, !reached && { color: colors.ash }]}>{r.title}</Text>
                  {current && <Text style={s.rankNow}>YOU</Text>}
                </View>
              );
            })}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(17,16,16,0.72)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.chalk, borderTopLeftRadius: radius['2xl'], borderTopRightRadius: radius['2xl'], padding: space(5), paddingBottom: space(2), height: '82%' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: space(3) },
  gate: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.ivory, borderRadius: radius.md, paddingHorizontal: space(4), paddingVertical: space(3), borderLeftWidth: 3, borderLeftColor: 'transparent' },
  gateCleared: { borderLeftColor: colors.sage },
  gateActive: { borderLeftColor: colors.ember },
  gateTitle: { color: colors.textPrimary, fontFamily: fonts.sansSemi, fontSize: 14 },
  gateDesc: { color: colors.textSecondary, fontFamily: fonts.sans, fontSize: 12, marginTop: 1 },
  gateState: { fontSize: 10, color: colors.ash, fontFamily: fonts.mono, letterSpacing: 1 },
  rank: { flexDirection: 'row', alignItems: 'center', gap: space(3), paddingVertical: space(2.5), paddingHorizontal: space(3), borderRadius: radius.sm },
  rankCurrent: { backgroundColor: 'rgba(201,168,76,0.14)' },
  rankLvl: { width: 54, color: colors.textSecondary, fontFamily: fonts.mono, fontSize: 13 },
  rankTitle: { flex: 1, color: colors.textPrimary, fontFamily: fonts.sansMedium, fontSize: 15 },
  rankNow: { color: colors.gold, fontFamily: fonts.sansSemi, fontSize: 11, letterSpacing: 1 },
});
