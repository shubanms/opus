import { View, Text, StyleSheet, Pressable } from 'react-native';
import { dateKey } from '@opus/core';
import { Screen, Card, H1, Label, Body } from '../ui';
import { colors, radius, space } from '../theme';

export default function HomeScreen({ navigation }) {
  const today = dateKey.todayKey();
  return (
    <Screen>
      <View>
        <H1>OPUS</H1>
        <Body style={{ marginTop: 4 }}>Build your masterpiece.</Body>
      </View>

      <Card style={{ backgroundColor: colors.obsidian, borderColor: colors.stone }}>
        <Label style={{ color: colors.gold }}>Today · {today}</Label>
        <Text style={styles.cardTitle}>Ready to train?</Text>
        <Pressable style={styles.cta} onPress={() => navigation.navigate('Workout')}>
          <Text style={styles.ctaText}>Start workout</Text>
        </Pressable>
      </Card>

      <Card>
        <Label>Native app</Label>
        <Body style={{ marginTop: 6 }}>
          This is the React Native build of OPUS. Notifications, Health Connect and widgets are
          wired natively — set them up in Settings.
        </Body>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  cardTitle: { color: colors.textInverse ? '#F5F3EF' : '#fff', fontSize: 20, fontWeight: '600', marginTop: 6, marginBottom: space(3) },
  cta: { backgroundColor: colors.gold, borderRadius: radius.lg, paddingVertical: space(3.5), alignItems: 'center' },
  ctaText: { color: colors.obsidian, fontSize: 16, fontWeight: '700' },
});
