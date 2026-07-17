import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Foreground display behaviour.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

async function ensureChannel() {
  if (Platform.OS === 'android') {
    // HIGH importance + sound so notifications surface as a heads-up banner
    // (DEFAULT drops silently into the tray, which reads as "nothing happened").
    await Notifications.setNotificationChannelAsync('default', {
      name: 'OPUS',
      importance: Notifications.AndroidImportance.HIGH,
      sound: 'default',
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#C9A84C',
    });
  }
}

async function ensurePermission() {
  const perm = await Notifications.getPermissionsAsync();
  if (perm.status === 'granted') return true;
  const req = await Notifications.requestPermissionsAsync();
  return req.status === 'granted';
}

// Request permission (creates the channel first). Returns true when granted.
export async function enableNotifications() {
  await ensureChannel();
  return ensurePermission();
}

// Fire an IMMEDIATE local notification (proves delivery). `trigger: null` posts
// right away with no AlarmManager, so it doesn't need SCHEDULE_EXACT_ALARM (which
// isn't auto-granted on Android 13+ and silently dropped a timed test). Returns a
// status so the UI can tell the user what happened. Requests permission if needed.
export async function testNotification() {
  await ensureChannel();
  const granted = await ensurePermission();
  if (!granted) return { ok: false, reason: 'denied' };
  await Notifications.scheduleNotificationAsync({
    content: { title: 'OPUS', body: "Notifications are working — let's train.", sound: 'default' },
    trigger: null,
  });
  return { ok: true };
}

// Schedule a daily workout reminder at the given hour (local).
export async function scheduleDailyReminder(hour = 18, minute = 0) {
  await ensureChannel();
  await Notifications.cancelAllScheduledNotificationsAsync();
  await Notifications.scheduleNotificationAsync({
    content: { title: 'OPUS', body: 'Time to train. Keep the streak alive.' },
    trigger: { hour, minute, repeats: true, channelId: 'default' },
  });
}
