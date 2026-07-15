// Gold disc with the level number (ports src/components/rpg/LevelBadge.jsx).
import { View, Text, StyleSheet } from 'react-native';
import { fonts } from '../../theme';
import { useColors, useThemedStyles } from '../../native/ThemeProvider';

export default function LevelBadge({ level = 1, size = 34 }) {
  const colors = useColors();
  const s = useThemedStyles(makeStyles);
  return (
    <View style={[s.badge, { width: size, height: size, borderRadius: size / 2 }]}>
      <Text style={[s.num, { fontSize: size * 0.42 }]}>{level}</Text>
    </View>
  );
}

const makeStyles = (colors) => StyleSheet.create({
  badge: { backgroundColor: colors.gold, alignItems: 'center', justifyContent: 'center' },
  num: { color: colors.obsidian, fontFamily: fonts.monoMedium },
});
