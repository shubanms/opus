// Bottom-sheet share composer — a live card preview plus background/accent
// pickers, mirroring the web ShareSheet. The visible preview and an off-screen
// full-size (1080²) capture card stay in sync; "Share" snapshots the latter and
// opens the Android share sheet via native/share.js.
import { useRef, useState } from 'react';
import { Modal, View, Text, ScrollView, StyleSheet, Alert } from 'react-native';
import ViewShot from 'react-native-view-shot';
import { shareCard } from '@opus/core';
import Icon from '../Icon';
import { radius, space, fonts } from '../../theme';
import { useColors, useThemedStyles } from '../../native/ThemeProvider';
import PressScale from '../PressScale';
import { captureAndShare } from '../../native/share';
import { CARDS } from './cards';

const PREVIEW = 264;
const { THEMES, ACCENTS, resolveTheme } = shareCard;

export default function ShareSheet({ visible, onClose, cardKey = 'workout', data, filename = 'opus-card.png' }) {
  const colors = useColors();
  const s = useThemedStyles(makeStyles);
  const shotRef = useRef(null);
  const [themeIdx, setThemeIdx] = useState(1); // default to the black card
  const [accentIdx, setAccentIdx] = useState(0);
  const [busy, setBusy] = useState(false);

  const theme = resolveTheme(themeIdx, accentIdx);
  const Card = CARDS[cardKey] ?? CARDS.workout;

  const doShare = async () => {
    if (busy) return;
    setBusy(true);
    const res = await captureAndShare(shotRef, { dialogTitle: 'Share your OPUS card' });
    setBusy(false);
    if (!res.ok && res.reason !== 'share-failed') {
      Alert.alert('Could not share', 'The card could not be exported on this device.');
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={s.backdrop}>
        <View style={s.sheet}>
          <View style={s.header}>
            <Text style={s.title}>Share</Text>
            <PressScale hitSlop={10} onPress={onClose}><Icon name="close" size={24} color={colors.ash} /></PressScale>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: space(4) }}>
            {/* Live preview */}
            <View style={s.previewWrap}>
              <View style={s.preview}>
                {data ? <Card data={data} theme={theme} scale={PREVIEW / 1080} /> : null}
              </View>
            </View>

            {/* Background */}
            <Text style={s.section}>Background</Text>
            <View style={s.row}>
              {THEMES.map((t, i) => (
                <PressScale key={t.id} sound="tap" onPress={() => setThemeIdx(i)} style={[s.swatch, { backgroundColor: t.bg, borderColor: themeIdx === i ? theme.accent : 'transparent' }]}>
                  <Text style={[s.swatchLabel, { color: t.text }]}>{t.label}</Text>
                </PressScale>
              ))}
            </View>

            {/* Accent */}
            <Text style={s.section}>Accent</Text>
            <View style={s.accentRow}>
              {ACCENTS.map((a, i) => (
                <PressScale key={a.id} sound="tap" onPress={() => setAccentIdx(i)} style={[s.accent, { backgroundColor: a.color }]}>
                  {accentIdx === i && <Icon name="checkmark" size={18} color="#111010" />}
                </PressScale>
              ))}
            </View>

            <PressScale sound="success" onPress={doShare} disabled={busy || !data} style={[s.shareBtn, (busy || !data) && { opacity: 0.6 }]}>
              <Icon name="share" size={18} color={colors.obsidian} style={{ marginRight: space(2) }} />
              <Text style={s.shareText}>{busy ? 'Preparing…' : 'Share'}</Text>
            </PressScale>
          </ScrollView>
        </View>
      </View>

      {/* Off-screen full-size capture target (1080²) */}
      <View style={s.offscreen} pointerEvents="none" collapsable={false}>
        <ViewShot ref={shotRef} options={{ format: 'png', quality: 1, result: 'tmpfile', fileName: filename?.replace(/\.png$/, '') }}>
          {data ? <Card data={data} theme={theme} scale={1} /> : <View style={{ width: 1080, height: 1080, backgroundColor: theme.bg }} />}
        </ViewShot>
      </View>
    </Modal>
  );
}

const makeStyles = (colors) => StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(17,16,16,0.72)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.chalk, borderTopLeftRadius: radius['2xl'], borderTopRightRadius: radius['2xl'], padding: space(5), paddingBottom: space(4), maxHeight: '90%' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: space(4) },
  title: { color: colors.textPrimary, fontFamily: fonts.displaySemi, fontSize: 24 },
  previewWrap: { alignItems: 'center' },
  preview: { width: PREVIEW, height: PREVIEW, borderRadius: radius.lg, overflow: 'hidden', backgroundColor: colors.obsidian },
  section: { color: colors.textSecondary, fontFamily: fonts.sansSemi, fontSize: 11, textTransform: 'uppercase', letterSpacing: 1.5, marginTop: space(5), marginBottom: space(2) },
  row: { flexDirection: 'row', gap: space(2) },
  swatch: { flex: 1, height: 48, borderRadius: radius.lg, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  swatchLabel: { fontFamily: fonts.sansMedium, fontSize: 13 },
  accentRow: { flexDirection: 'row', gap: space(3) },
  accent: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  shareBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.gold, borderRadius: radius.lg, paddingVertical: space(3.5), marginTop: space(6) },
  shareText: { color: colors.obsidian, fontFamily: fonts.sansSemi, fontSize: 15 },
  // Rendered but pushed far off-screen; view-shot still captures it by tag.
  offscreen: { position: 'absolute', left: -20000, top: 0 },
});
