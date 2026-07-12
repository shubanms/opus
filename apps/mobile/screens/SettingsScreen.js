import { useState } from 'react';
import { View, Text, Pressable, StyleSheet, Alert } from 'react-native';
import { Screen, H1, Card, Label, Body } from '../ui';
import { colors, radius, space } from '../theme';
import { enableNotifications, testNotification, scheduleDailyReminder } from '../native/notifications';

function Button({ label, onPress, primary }) {
  return (
    <Pressable style={[styles.btn, primary && styles.btnPrimary]} onPress={onPress}>
      <Text style={[styles.btnText, primary && styles.btnTextPrimary]}>{label}</Text>
    </Pressable>
  );
}

export default function SettingsScreen() {
  const [notif, setNotif] = useState(false);

  const onEnableNotif = async () => {
    try {
      const granted = await enableNotifications();
      setNotif(granted);
      if (granted) {
        await scheduleDailyReminder(18, 0);
        Alert.alert('Notifications on', 'Daily 6pm reminder scheduled.');
      } else {
        Alert.alert('Not granted', 'Enable notifications for OPUS in Android settings.');
      }
    } catch (e) {
      Alert.alert('Error', String(e?.message || e));
    }
  };

  const onTestNotif = async () => {
    try { await testNotification(); } catch (e) { Alert.alert('Error', String(e?.message || e)); }
  };

  return (
    <Screen>
      <H1>Settings</H1>

      <Card>
        <Label>Notifications</Label>
        <Body style={{ marginVertical: space(2) }}>
          {notif ? 'Enabled · daily reminder set.' : 'Workout reminders and PR celebrations.'}
        </Body>
        <Button label={notif ? 'Re-schedule reminder' : 'Enable notifications'} onPress={onEnableNotif} primary />
        <View style={{ height: space(2) }} />
        <Button label="Test notification" onPress={onTestNotif} />
      </Card>

      <Card>
        <Label>Health Connect</Label>
        <Body style={{ marginVertical: space(2) }}>Auto-import steps, weight and sleep from Android Health Connect.</Body>
        <Button label="Connect Health Connect" onPress={() => Alert.alert('Health Connect', 'Wired in the next build step.')} />
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
  btnPrimary: { backgroundColor: colors.gold, borderColor: colors.gold },
  btnText: { color: colors.textPrimary, fontSize: 15, fontWeight: '600' },
  btnTextPrimary: { color: colors.obsidian, fontWeight: '700' },
  brand: { color: colors.textPrimary, fontSize: 18, fontWeight: '700', marginTop: 6 },
});
