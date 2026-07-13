// Tactile feedback wrappers (expo-haptics), gated by the `effects` setting.
// Every call is best-effort — haptics never throw into the UI.
import * as Haptics from 'expo-haptics';
import { getSetting } from './settings';

function on() {
  return !!getSetting('effects');
}

export function tapLight() {
  if (!on()) return;
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
}

export function selection() {
  if (!on()) return;
  Haptics.selectionAsync().catch(() => {});
}

export function success() {
  if (!on()) return;
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
}

export function warning() {
  if (!on()) return;
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
}
