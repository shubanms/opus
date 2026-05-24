import { inQuietHours } from './notifications.js';

// Decides which in-app reminders to surface on app open. Pure + unit-tested;
// the hook supplies current state and persists the returned markers so each
// reminder fires at most once per its period. Respects per-type toggles and
// quiet hours. (In-app toasts only — a static PWA can't push in the background.)
export function pickReminders({ settings, now, today, weekKey, lastWorkoutDate, streak = 0, markers = {} }) {
  const out = [];
  if (inQuietHours(settings, now)) return out;

  // Weekly summary — once per ISO week.
  if (settings.weeklySummary && markers.lastSummaryWeek !== weekKey) {
    out.push({
      type: 'weeklySummary',
      title: 'A fresh week',
      body: 'New quests are live — and last week’s recap is waiting in Wrapped.',
      marker: { lastSummaryWeek: weekKey },
    });
  }

  // One daily nudge at most, and only if you haven't trained today. The
  // streak-at-risk nudge takes priority in the evening.
  const trainedToday = lastWorkoutDate === today;
  if (!trainedToday && markers.lastNudgeDay !== today) {
    const hour = now.getHours();
    if (settings.streakRisk && streak > 0 && hour >= 17) {
      out.push({
        type: 'streakRisk',
        title: 'Streak on the line',
        body: `Train today to keep your ${streak}-day streak alive.`,
        marker: { lastNudgeDay: today },
      });
    } else if (settings.gymNudge) {
      out.push({
        type: 'gymNudge',
        title: 'Time to train?',
        body: 'A quick session keeps your momentum going.',
        marker: { lastNudgeDay: today },
      });
    }
  }

  return out;
}
