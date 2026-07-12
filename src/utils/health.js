// Health Connect bridge (Android / Capacitor only). Mirrors the native-plugin
// pattern in notifications.js: isNative() guard + dynamic import so the web
// build never pulls the native module and everything degrades gracefully on
// web / iOS. Read-only — OPUS imports data, it never writes to Health Connect.
import { Capacitor } from '@capacitor/core';

const isNative = () => Capacitor?.isNativePlatform?.() ?? false;
const loadHC = () => import('@devmaxime/capacitor-health-connect').then((m) => m.HealthConnect);

// Guard every native call: if the bridge is misbehaving and a call never
// resolves, fail with `fallback` instead of hanging the UI forever (the
// symptom that left the card stuck on "Connecting…").
function withTimeout(promise, ms, fallback) {
  return Promise.race([
    promise,
    new Promise((resolve) => setTimeout(() => resolve(fallback), ms)),
  ]);
}

export function isHealthSupported() {
  return isNative();
}

// The running platform ('android' | 'ios' | 'web') — used to confirm the native
// bridge is actually connected.
export function platform() {
  return Capacitor?.getPlatform?.() ?? 'web';
}

// 'Available' | 'NotInstalled' | 'NotSupported' — or 'Unsupported' off-device,
// 'Timeout' if the bridge never answers.
export async function healthAvailability() {
  if (!isNative()) return 'Unsupported';
  try {
    const HC = await withTimeout(loadHC(), 8000, null);
    if (!HC) return 'Timeout';
    const res = await withTimeout(HC.checkAvailability(), 8000, null);
    return res?.availability ?? 'Timeout';
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
    const HC = await withTimeout(loadHC(), 8000, null);
    if (!HC) return false;
    // The permission dialog is user-driven, so allow much longer here.
    const res = await withTimeout(HC.requestPermissions({ read: types, write: [] }), 120000, null);
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
    const HC = await withTimeout(loadHC(), 8000, null);
    if (!HC) return null;
    const now = new Date();
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    const res = await withTimeout(HC.aggregateRecords({
      start: start.toISOString(),
      end: now.toISOString(),
      type: 'Steps',
      groupBy: 'day',
    }), 10000, null);
    if (!res) return null;
    return (res.aggregates ?? []).reduce((sum, a) => sum + (a.value || 0), 0);
  } catch {
    return null;
  }
}
