import { View, Text, Pressable, StyleSheet, Alert } from 'react-native';
import { Screen, H1, Card, Label, Body } from '../ui';
import { colors, radius, space } from '../theme';

function Button({ label, onPress }) {
  return (
    <Pressable style={styles.btn} onPress={onPress}>
      <Text style={styles.btnText}>{label}</Text>
    </Pressable>
  );
}

export default function SettingsScreen() {
  const soon = (what) => Alert.alert(what, 'Wired natively in the next build step.');
  return (
    <Screen>
      <H1>Settings</H1>

      <Card>
        <Label>Health Connect</Label>
        <Body style={{ marginVertical: space(2) }}>Auto-import steps, weight and sleep from Android Health Connect.</Body>
        <Button label="Connect Health Connect" onPress={() => soon('Health Connect')} />
      </Card>

      <Card>
        <Label>Notifications</Label>
        <Body style={{ marginVertical: space(2) }}>Workout reminders and PR celebrations.</Body>
        <Button label="Enable notifications" onPress={() => soon('Notifications')} />
      </Card>

      <Card>
        <Label>About</Label>
        <Text style={styles.brand}>OPUS · native</Text>
        <Body style={{ marginTop: 4 }}>React Native + Expo build. Shared logic via @opus/core.</Body>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  btn: { backgroundColor: colors.obsidian, borderColor: colors.stone, borderWidth: 1, borderRadius: radius.lg, paddingVertical: space(3.5), alignItems: 'center' },
  btnText: { color: colors.textPrimary, fontSize: 15, fontWeight: '600' },
  brand: { color: colors.textPrimary, fontSize: 18, fontWeight: '700', marginTop: 6 },
});
