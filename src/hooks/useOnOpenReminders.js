import { useEffect, useRef } from 'react';
import useUIStore from '../store/uiStore.js';
import useSettingsStore from '../store/settingsStore.js';
import { useRPG } from './useRPG.js';
import { getSettings } from '../utils/notifications.js';
import { pickReminders } from '../utils/reminders.js';
import { weekKeyOf } from '../utils/quests.js';

const MARKERS_KEY = 'opus_reminder_markers';

// Surfaces gentle in-app reminders (streak risk / gym nudge / weekly summary)
// once on app open, when conditions hold. Markers in localStorage keep each to
// once-per-period; the ref keeps it to once per app session.
export function useOnOpenReminders() {
  const { profile, loaded } = useRPG();
  const onboarded = useSettingsStore((s) => s.onboarded);
  const fired = useRef(false);

  useEffect(() => {
    if (!loaded || !profile || !onboarded || fired.current) return;
    fired.current = true;

    const now = new Date();
    const today = now.toISOString().slice(0, 10);
    const weekKey = weekKeyOf(now);

    let markers = {};
    try {
      markers = JSON.parse(localStorage.getItem(MARKERS_KEY) || '{}');
    } catch {
      /* ignore */
    }

    const reminders = pickReminders({
      settings: getSettings(),
      now,
      today,
      weekKey,
      lastWorkoutDate: profile.lastWorkoutDate,
      streak: profile.streak ?? 0,
      markers,
    });
    if (!reminders.length) return;

    const showToast = useUIStore.getState().showToast;
    const updated = { ...markers };
    let delay = 700;
    for (const r of reminders) {
      setTimeout(() => showToast(r.body, { type: 'info' }), delay);
      delay += 3400;
      Object.assign(updated, r.marker);
    }
    try {
      localStorage.setItem(MARKERS_KEY, JSON.stringify(updated));
    } catch {
      /* ignore */
    }
  }, [loaded, profile, onboarded]);
}
