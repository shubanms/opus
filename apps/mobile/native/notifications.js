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
    await Notifications.setNotificationChannelAsync('default', {
      name: 'OPUS',
      importance: Notifications.AndroidImportance.DEFAULT,
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

// Fire an immediate local notification (proves delivery).
export async function testNotification() {
  await ensureChannel();
  await Notifications.scheduleNotificationAsync({
    content: { title: 'OPUS', body: "Notifications are working — let's train." },
    trigger: null,
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
