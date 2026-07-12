// Health Connect bridge (Android). Uses react-native-health-connect — a true
// native module (no WebView), so it can read steps/weight/sleep and run in the
// background. Read-only.
import {
  initialize,
  getSdkStatus,
  requestPermission,
  readRecords,
  SdkAvailabilityStatus,
} from 'react-native-health-connect';

export async function healthAvailability() {
  try {
    const status = await getSdkStatus();
    if (status === SdkAvailabilityStatus.SDK_AVAILABLE) return 'Available';
    if (status === SdkAvailabilityStatus.SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED) return 'NotInstalled';
    return 'NotSupported';
  } catch {
    return 'NotSupported';
  }
}

// Request read perms and return today's total steps (or null).
export async function connectAndReadSteps() {
  const ready = await initialize();
  if (!ready) return { ok: false, availability: 'NotSupported' };

  await requestPermission([{ accessType: 'read', recordType: 'Steps' }]);

  const now = new Date();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const res = await readRecords('Steps', {
    timeRangeFilter: { operator: 'between', startTime: start.toISOString(), endTime: now.toISOString() },
  });
  const records = res?.records ?? res ?? [];
  const steps = records.reduce((a, r) => a + (r.count || 0), 0);
  return { ok: true, steps };
}
