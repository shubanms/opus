import { useState } from 'react';
import { View, Text, StyleSheet, Alert, Switch } from 'react-native';
import { dateKey } from '@opus/core';
import { Screen, H1, Label, Body, Wordmark } from '../ui';
import { colors, radius, space, fonts } from '../theme';
import Card from '../components/Card';
import { GoldButton, SecondaryButton } from '../components/Button';
import { enableNotifications, testNotification, scheduleDailyReminder } from '../native/notifications';
import { connectAndReadSteps, healthAvailability } from '../native/healthConnect';
import { setSteps } from '../native/db';
import { previewSounds } from '../native/sound';
import { useSettings } from '../native/settings';

function Row({ label, value, onValueChange }) {
  return (
    <View style={s.row}>
      <Body style={{ color: colors.textPrimary, fontFamily: fonts.sansMedium }}>{label}</Body>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: colors.ivory, true: colors.gold }}
        thumbColor={colors.chalk}
      />
    </View>
  );
}

export default function SettingsScreen() {
  const { settings, update } = useSettings();
  const [notif, setNotif] = useState(settings.notifDaily);
  const [steps, setStepsState] = useState(null);

  const onEnableNotif = async () => {
    try {
      const granted = await enableNotifications();
      setNotif(granted);
      update('notifDaily', granted);
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

  const onConnectHealth = async () => {
    try {
      const avail = await healthAvailability();
      if (avail === 'NotInstalled') { Alert.alert('Health Connect', 'Install Health Connect from the Play Store, then retry.'); return; }
      if (avail !== 'Available') { Alert.alert('Health Connect', 'Not supported on this device.'); return; }
      const res = await connectAndReadSteps();
      if (res.ok) {
        setStepsState(res.steps);
        try { setSteps(dateKey.todayKey(), res.steps); } catch {}
        Alert.alert('Imported', `${res.steps.toLocaleString()} steps today.`);
      } else {
        Alert.alert('Health Connect', 'Could not read steps.');
      }
    } catch (e) {
      Alert.alert('Error', String(e?.message || e));
    }
  };

  return (
    <Screen>
      <H1>Settings</H1>

      <Card>
        <Label>Notifications</Label>
        <Body style={{ marginVertical: space(2) }}>
          {notif ? 'Enabled · daily reminder set.' : 'Workout reminders and PR celebrations.'}
        </Body>
        <GoldButton label={notif ? 'Re-schedule reminder' : 'Enable notifications'} icon="notifications" onPress={onEnableNotif} />
        <View style={{ height: space(2) }} />
        <SecondaryButton label="Test notification" icon="paper-plane" onPress={onTestNotif} />
      </Card>

      <Card>
        <Label>Feel</Label>
        <View style={{ marginTop: space(2) }}>
          <Row label="Sound effects" value={settings.sound} onValueChange={(v) => update('sound', v)} />
          <Row label="Animations & haptics" value={settings.effects} onValueChange={(v) => update('effects', v)} />
        </View>
        <View style={{ marginTop: space(2) }}>
          <SecondaryButton label="Preview sounds" icon="musical-notes" onPress={() => previewSounds()} />
        </View>
      </Card>

      <Card>
        <Label>Health Connect</Label>
        <Body style={{ marginVertical: space(2) }}>
          {steps != null ? `${steps.toLocaleString()} steps imported today.` : 'Auto-import steps, weight and sleep from Android Health Connect.'}
        </Body>
        <GoldButton label="Connect & import today's steps" icon="walk" onPress={onConnectHealth} />
      </Card>

      <Card>
        <Label>About</Label>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', marginTop: space(2) }}>
          <Wordmark size={20} style={{ color: colors.textPrimary }} />
          <Text style={s.aboutTag}> · native</Text>
        </View>
        <Body style={{ marginTop: 4 }}>React Native + Expo build. Shared logic via @opus/core.</Body>
      </Card>
    </Screen>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: space(2) },
  aboutTag: { color: colors.textSecondary, fontFamily: fonts.sans, fontSize: 14 },
});
