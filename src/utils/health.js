// Health Connect bridge (Android / Capacitor only). Mirrors the native-plugin
// pattern in notifications.js: isNative() guard + dynamic import so the web
// build never pulls the native module and everything degrades gracefully on
// web / iOS. Read-only — OPUS imports data, it never writes to Health Connect.
import { Capacitor } from '@capacitor/core';

const isNative = () => Capacitor?.isNativePlatform?.() ?? false;
const loadHC = () => import('@devmaxime/capacitor-health-connect').then((m) => m.HealthConnect);

export function isHealthSupported() {
  return isNative();
}

// 'Available' | 'NotInstalled' | 'NotSupported' — or 'Unsupported' off-device.
export async function healthAvailability() {
  if (!isNative()) return 'Unsupported';
  try {
    const HC = await loadHC();
    const { availability } = await HC.checkAvailability();
    return availability;
  } catch {
    return 'NotSupported';
  }
}

// Request read access for the given record types (default: Steps). All requested
// permissions must be declared in AndroidManifest.xml. Returns true when every
// requested type was granted.
export async function requestHealthRead(types = ['Steps']) {
  if (!isNative()) return false;
  try {
    const HC = await loadHC();
    const res = await HC.requestPermissions({ read: types, write: [] });
    const granted = res?.read ?? [];
    return types.every((t) => granted.includes(t));
  } catch {
    return false;
  }
}

// Today's total steps from Health Connect (local calendar day). Returns a
// number, or null if unavailable / not permitted.
export async function readTodaySteps() {
  if (!isNative()) return null;
  try {
    const HC = await loadHC();
    const now = new Date();
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    const { aggregates } = await HC.aggregateRecords({
      start: start.toISOString(),
      end: now.toISOString(),
      type: 'Steps',
      groupBy: 'day',
    });
    return (aggregates ?? []).reduce((sum, a) => sum + (a.value || 0), 0);
  } catch {
    return null;
  }
}
