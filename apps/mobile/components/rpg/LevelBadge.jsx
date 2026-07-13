// Gold disc with the level number (ports src/components/rpg/LevelBadge.jsx).
import { View, Text, StyleSheet } from 'react-native';
import { colors, fonts } from '../../theme';

export default function LevelBadge({ level = 1, size = 34 }) {
  return (
    <View style={[s.badge, { width: size, height: size, borderRadius: size / 2 }]}>
      <Text style={[s.num, { fontSize: size * 0.42 }]}>{level}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  badge: { backgroundColor: colors.gold, alignItems: 'center', justifyContent: 'center' },
  num: { color: colors.obsidian, fontFamily: fonts.monoMedium },
});
