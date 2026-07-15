// Rank/title pill (ports src/components/rpg/TitleBadge.jsx). accent = gold fill
// on obsidian text; muted = ivory fill on secondary text.
import { View, Text, StyleSheet } from 'react-native';
import { radius, space, fonts } from '../../theme';
import { useColors, useThemedStyles } from '../../native/ThemeProvider';

export default function TitleBadge({ title, variant = 'accent', style }) {
  const colors = useColors();
  const s = useThemedStyles(makeStyles);
  const isAccent = variant === 'accent';
  return (
    <View style={[s.pill, isAccent ? s.accent : s.muted, style]}>
      <Text style={[s.text, isAccent ? s.accentText : s.mutedText]}>{title}</Text>
    </View>
  );
}

const makeStyles = (colors) => StyleSheet.create({
  pill: { borderRadius: radius.full, paddingHorizontal: space(4), paddingVertical: space(1.5), alignSelf: 'flex-start' },
  accent: { backgroundColor: colors.gold },
  muted: { backgroundColor: colors.ivory },
  text: { fontFamily: fonts.sansSemi, fontSize: 13 },
  accentText: { color: colors.obsidian },
  mutedText: { color: colors.textSecondary },
});
