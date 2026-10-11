import { useEffect, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db.js';
import useUIStore from '../store/uiStore.js';
import useSettingsStore from '../store/settingsStore.js';
import { useRPG } from './useRPG.js';
import { useStreak } from './useStreak.js';
import { getSettings } from '../utils/notifications.js';
import { pickReminders } from '../utils/reminders.js';
import { pickStalest } from '../utils/staleRoutine.js';
import { playChime } from '../utils/sound.js';
import { weekKeyOf } from '../utils/quests.js';
import { parseKey, shiftKey, todayKey } from '../utils/dateKey.js';

const MARKERS_KEY = 'opus_reminder_markers';

// Surfaces gentle in-app reminders (streak risk / gym nudge / weekly summary /
// stale routine) once on app open, when conditions hold. Markers in
// localStorage keep each to once-per-period; the ref keeps it to once per app
// session.
//
// Everything it decides on has to be *loaded* first, because it decides once:
// the stale-routine check used to run against the empty list a query returns
// before it resolves, and the streak nudge read the stored `profile.streak`,
// which is frozen at the last workout (a nine-day streak that died weeks ago
// was still "on the line" every evening). And it waits for onboarding and the
// tour — toasts sit above the tour, so they used to land on top of it.
export function useOnOpenReminders() {
  const { profile, loaded } = useRPG();
  const onboarded = useSettingsStore((s) => s.onboarded);
  const tourSeen = useSettingsStore((s) => s.tourSeen);
  const unit = useSettingsStore((s) => s.unit);
  // Decided at launch: an app opened straight into onboarding has nothing to
  // remind anyone of yet, so the first session after setup stays quiet.
  const [openedSetUp] = useState(() => {
    const s = useSettingsStore.getState();
    return s.onboarded && s.tourSeen;
  });
  const streak = useStreak();
  const history = useLiveQuery(async () => ({
    templates: await db.templates.toArray(),
    workouts: await db.workouts.toArray(),
  }), []);
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current || !openedSetUp) return;
    if (!loaded || !profile || !onboarded || !tourSeen) return;
    if (!history || !streak.ready) return;
    fired.current = true;

    const now = new Date();
    const today = todayKey(now);
    const weekKey = weekKeyOf(now);
    const staleRoutine = pickStalest(history.templates, history.workouts, now.getTime());

    // The week that just ended, for the weekly summary.
    const lastWeekStart = shiftKey(weekKey, -7);
    const lastWeekRows = history.workouts.filter((w) => w.date >= lastWeekStart && w.date < weekKey);
    const lastWeek = {
      sessions: lastWeekRows.length,
      volumeKg: lastWeekRows.reduce((a, w) => a + (w.totalVolume || 0), 0),
    };

    // With a plan, a day off the plan is rest, not a lapse.
    const planned = new Set(history.templates.map((t) => t.dayOfWeek).filter((d) => Number.isInteger(d)));
    const plannedToday = planned.size ? planned.has(parseKey(today).getDay()) : null;

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
      streak,
      plannedToday,
      staleRoutine,
      lastWeek,
      unit,
      markers,
    });
    if (!reminders.length) return;

    const showToast = useUIStore.getState().showToast;
    const updated = { ...markers };
    let delay = 700;
    for (const r of reminders) {
      setTimeout(() => {
        showToast(r.body, { type: 'info' });
        if (r.type === 'streakRisk') playChime('anthem'); // the "calling you back" cue
      }, delay);
      delay += 3400;
      Object.assign(updated, r.marker);
    }
    try {
      localStorage.setItem(MARKERS_KEY, JSON.stringify(updated));
    } catch {
      /* ignore */
    }
  }, [openedSetUp, loaded, profile, onboarded, tourSeen, history, streak, unit]);
}
