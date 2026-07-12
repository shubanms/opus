import { View, Text, StyleSheet } from 'react-native';
import { rpg } from '@opus/core';
import { Screen, H1, Card, Label, Body } from '../ui';
import { colors, space } from '../theme';

function safeTitle(totalXp) {
  try {
    const level = rpg.getLevelFromTotalXP ? rpg.getLevelFromTotalXP(totalXp) : 1;
    const title = rpg.getTitle ? rpg.getTitle(level) : 'Athlete';
    return { level, title };
  } catch {
    return { level: 1, title: 'Athlete' };
  }
}

export default function ProfileScreen() {
  const totalXp = 8000;
  const { level, title } = safeTitle(totalXp);

  return (
    <Screen>
      <H1>Profile</H1>
      <Card>
        <Label>Rank</Label>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.level}>Level {level} · {totalXp.toLocaleString()} XP</Text>
      </Card>
      <Body>Your real character, achievements and stats come from the shared @opus/core logic once
        the data layer is connected.</Body>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { color: colors.textPrimary, fontSize: 22, fontWeight: '700', marginTop: 6 },
  level: { color: colors.textSecondary, fontSize: 13, marginTop: 4 },
});
