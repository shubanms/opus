// The Vault — Iron economy shop (native parity with the web VaultModal). Iron
// is derived from history (sessions + PRs + quests); spending + owned/equipped
// cosmetics live in settings. Buy / equip cosmetics + open a loot chest.
import { useState } from 'react';
import { Modal, View, Text, ScrollView, StyleSheet } from 'react-native';
import { economy } from '@opus/core';
import Icon from '../Icon';
import { H2, Body } from '../../ui';
import { radius, space, fonts } from '../../theme';
import { useColors, useThemedStyles } from '../../native/ThemeProvider';
import PressScale from '../PressScale';
import { useDbQuery } from '../../native/useDbQuery';
import { getTotals } from '../../native/db';
import { useSettings, setSetting } from '../../native/settings';
import { playCue } from '../../native/sound';
import { success as hSuccess, tapLight } from '../../native/haptics';

const RARITY_COLOR = { common: '#9c9184', rare: '#6ea3c9', epic: '#b877dd', legendary: '#e3b23c' };
const TYPES = [
  { key: 'titleFlair', label: 'Title flair' },
  { key: 'cardTheme', label: 'Card theme' },
  { key: 'logoSkin', label: 'Logo skin' },
];

export default function VaultModal({ visible, onClose }) {
  const colors = useColors();
  const s = useThemedStyles(makeStyles);
  const { settings } = useSettings();
  const totals = useDbQuery(() => getTotals(), [], { workouts: 0, prCount: 0, questClaims: 0 });
  const owned = settings.ownedCosmetics || [];
  const equipped = settings.equipped || {};
  const balance = economy.ironBalance(
    economy.earnedIron({ workouts: totals.workouts, prCount: totals.prCount, questClaims: totals.questClaims }),
    settings.ironSpent
  );
  const [chestResult, setChestResult] = useState(null);

  const buy = (c) => {
    if (!economy.canAfford(balance, c.price) || owned.includes(c.id)) return;
    setSetting('ironSpent', (settings.ironSpent || 0) + c.price);
    setSetting('ownedCosmetics', [...owned, c.id]);
    hSuccess(); playCue('quest');
  };
  const equip = (c) => {
    const cur = equipped[c.type] === c.id ? null : c.id;
    setSetting('equipped', { ...equipped, [c.type]: cur });
    tapLight(); playCue('tick');
  };
  const chest = () => {
    if (balance < economy.CHEST_PRICE) return;
    const rolled = economy.rollChest(Date.now(), owned);
    setSetting('ironSpent', (settings.ironSpent || 0) + economy.CHEST_PRICE);
    if (rolled) setSetting('ownedCosmetics', [...owned, rolled.id]);
    setChestResult(rolled || { none: true });
    hSuccess(); playCue('achievement');
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={s.backdrop}>
        <View style={s.sheet}>
          <View style={s.header}>
            <H2>The Vault</H2>
            <PressScale hitSlop={10} onPress={onClose}><Icon name="close" size={24} color={colors.ash} /></PressScale>
          </View>

          <View style={s.balanceRow}>
            <Text style={s.balanceLbl}>BALANCE</Text>
            <Text style={s.balanceVal}>◆ {balance.toLocaleString()} Iron</Text>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: space(8) }}>
            <PressScale onPress={chest} style={[s.chest, balance < economy.CHEST_PRICE && { opacity: 0.5 }]}>
              <View style={{ flex: 1 }}>
                <Text style={s.chestTitle}>🎁 Open a Loot Chest</Text>
                <Text style={s.chestSub}>A random cosmetic — rarer is luckier</Text>
              </View>
              <Text style={s.chestPrice}>◆ {economy.CHEST_PRICE}</Text>
            </PressScale>
            {chestResult && (
              <Body style={{ textAlign: 'center', color: colors.gold, marginBottom: space(3) }}>
                {chestResult.none ? 'You already own everything — nothing new dropped.' : `✦ ${chestResult.name} (${chestResult.rarity}) unlocked!`}
              </Body>
            )}

            {TYPES.map((t) => (
              <View key={t.key} style={{ marginBottom: space(4) }}>
                <Text style={s.sectionLbl}>{t.label.toUpperCase()}</Text>
                <View style={s.grid}>
                  {economy.COSMETICS.filter((c) => c.type === t.key).map((c) => {
                    const isOwned = owned.includes(c.id);
                    const isEq = equipped[t.key] === c.id;
                    const afford = economy.canAfford(balance, c.price);
                    return (
                      <View key={c.id} style={[s.tile, isEq && { borderColor: colors.gold }]}>
                        <View style={s.tileTop}>
                          <Text style={s.tileName} numberOfLines={1}>{c.type === 'titleFlair' ? `${c.value} ` : ''}{c.name}</Text>
                          <Text style={[s.rarity, { color: RARITY_COLOR[c.rarity] }]}>{c.rarity}</Text>
                        </View>
                        {isOwned ? (
                          <PressScale onPress={() => equip(c)} style={[s.tileBtn, { backgroundColor: isEq ? colors.gold : colors.chalk }]}>
                            <Text style={[s.tileBtnText, { color: isEq ? colors.obsidian : colors.textPrimary }]}>{isEq ? '✓ Equipped' : 'Equip'}</Text>
                          </PressScale>
                        ) : (
                          <PressScale onPress={() => buy(c)} style={[s.tileBtn, { backgroundColor: afford ? colors.gold : colors.chalk }]}>
                            <Text style={[s.tileBtnText, { color: afford ? colors.obsidian : colors.ash }]}>◆ {c.price}</Text>
                          </PressScale>
                        )}
                      </View>
                    );
                  })}
                </View>
              </View>
            ))}
            <Body style={{ textAlign: 'center', color: colors.ash, fontSize: 12 }}>
              Iron is earned as you train — every session, PR and quest adds to your balance.
            </Body>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const makeStyles = (colors) => StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(17,16,16,0.72)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.chalk, borderTopLeftRadius: radius['2xl'], borderTopRightRadius: radius['2xl'], padding: space(5), paddingBottom: space(2), height: '86%' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: space(3) },
  balanceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.obsidian, borderRadius: radius.xl, paddingHorizontal: space(4), paddingVertical: space(3), marginBottom: space(4) },
  balanceLbl: { color: colors.ash, fontFamily: fonts.sansMedium, fontSize: 11, letterSpacing: 1 },
  balanceVal: { color: colors.gold, fontFamily: fonts.monoMedium, fontSize: 17 },
  chest: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.ivory, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.gold, paddingHorizontal: space(4), paddingVertical: space(3), marginBottom: space(3) },
  chestTitle: { color: colors.textPrimary, fontFamily: fonts.sansSemi, fontSize: 14 },
  chestSub: { color: colors.textSecondary, fontFamily: fonts.sans, fontSize: 12, marginTop: 2 },
  chestPrice: { color: colors.gold, fontFamily: fonts.monoMedium, fontSize: 14 },
  sectionLbl: { color: colors.ash, fontFamily: fonts.sansSemi, fontSize: 11, letterSpacing: 1, marginBottom: space(2) },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space(2) },
  tile: { width: '48%', backgroundColor: colors.ivory, borderRadius: radius.md, borderWidth: 1, borderColor: 'transparent', padding: space(3) },
  tileTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  tileName: { flex: 1, color: colors.textPrimary, fontFamily: fonts.sansSemi, fontSize: 13 },
  rarity: { fontFamily: fonts.mono, fontSize: 9, textTransform: 'uppercase' },
  tileBtn: { marginTop: space(2), borderRadius: radius.sm, paddingVertical: space(1.5), alignItems: 'center' },
  tileBtnText: { fontFamily: fonts.monoMedium, fontSize: 12 },
});
