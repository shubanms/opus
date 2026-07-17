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
    // HIGH importance so notifications surface as a heads-up banner (DEFAULT
    // drops silently into the tray, which reads as "nothing happened").
    await Notifications.setNotificationChannelAsync('default', {
      name: 'OPUS',
      importance: Notifications.AndroidImportance.HIGH,
    });
  }
}

// Request permission (creates the channel first). Returns true when granted.
export async function enableNotifications() {
  await ensureChannel();
  const settings = await Notifications.getPermissionsAsync();
  let status = settings.status;
  if (status !== 'granted') {
    status = (await Notifications.requestPermissionsAsync()).status;
  }
  return status === 'granted';
}

// Fire a near-immediate local notification (proves delivery). Uses a 1-second
// timed trigger bound to the 'default' channel — a channel-less `trigger: null`
// immediate notification is not reliably shown on modern Android.
export async function testNotification() {
  await ensureChannel();
  await Notifications.scheduleNotificationAsync({
    content: { title: 'OPUS', body: "Notifications are working — let's train." },
    trigger: { seconds: 1, channelId: 'default' },
  });
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
