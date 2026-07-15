// The OPUS card idiom. Three variants ported from the PWA:
//  - light  : chalk surface + 1px ivory hairline (the default parchment card)
//  - dark   : stone surface (CharacterCard / rich feature)
//  - feature: obsidian surface + 1px gold border (boss gate / Today / highlight)
import { View, StyleSheet } from 'react-native';
import { radius, space } from '../theme';
import { useColors, useThemedStyles } from '../native/ThemeProvider';

export default function Card({ children, variant = 'light', style }) {
  const colors = useColors();
  const s = useThemedStyles(makeStyles);
  return <View style={[s.base, s[variant], style]}>{children}</View>;
}

const makeStyles = (colors) => StyleSheet.create({
  base: { borderRadius: radius['2xl'], padding: space(4), borderWidth: 1 },
  light: { backgroundColor: colors.chalk, borderColor: colors.ivory },
  dark: { backgroundColor: colors.stone, borderColor: '#3A3A3A' },
  feature: { backgroundColor: colors.obsidian, borderColor: colors.gold },
});
