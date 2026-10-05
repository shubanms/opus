import { inQuietHours } from './notifications.js';
import { STREAK } from './streak.js';
import { fmtVolume } from './units.js';

// Decides which in-app reminders to surface on app open. Pure + unit-tested;
// the hook supplies current state and persists the returned markers so each
// reminder fires at most once per its period. Respects per-type toggles and
// quiet hours. (In-app toasts only — a static PWA can't push in the background.)
//
// `streak` is the LIVE streak (hooks/useStreak), not `profile.streak`. The
// stored number is only true as of the last workout, so it used to nag "train
// today to keep your 9-day streak alive" every evening of a planned rest day —
// and for a streak that had died weeks earlier.

/** The evening hour from which a streak nudge takes priority over the gym nudge. */
export const EVENING_HOUR = 17;

/**
 * Whether a session is owed today, and how urgently.
 *
 * Returns null, 'due' (a plan's scheduled day, with time left in its window)
 * or 'last' (today is the last day that still counts). A day streak at risk is
 * always 'last': trained yesterday, not yet today.
 */
export function streakDueToday(streak, today) {
  if (!streak || typeof streak !== 'object') return null;
  if (streak.state !== STREAK.AT_RISK || !(streak.count > 0)) return null;
  if (!streak.scheduled) return 'last';
  if (streak.deadline === today) return 'last';
  if (streak.nextDue === today) return 'due';
  return null;
}

function streakCopy(streak, urgency) {
  const unit = streak.scheduled ? 'session' : 'day';
  const n = `${streak.count}-${unit} streak`;
  if (urgency === 'due') return `A session is due today — keep your ${n} going.`;
  return streak.scheduled ? `Last chance — train today to keep your ${n} alive.` : `Train today to keep your ${n} alive.`;
}

function weeklyCopy(lastWeek, unit) {
  const sessions = lastWeek?.sessions ?? 0;
  if (sessions > 0) {
    const volume = lastWeek.volumeKg > 0 ? ` · ${fmtVolume(lastWeek.volumeKg, unit)} lifted` : '';
    return `Last week: ${sessions} session${sessions === 1 ? '' : 's'}${volume}. New quests are live on Home.`;
  }
  return 'A fresh week — new quests are live on Home.';
}

/**
 * @param settings     notification prefs (per-type toggles + quiet hours)
 * @param now          a Date — for the hour and quiet hours
 * @param today        today's LOCAL date key
 * @param weekKey      this week's Monday key
 * @param lastWorkoutDate  the profile's last session date (trained today?)
 * @param streak       the live streak from useStreak
 * @param plannedToday null with no weekly plan, else whether today is on it
 * @param staleRoutine the most overused stale routine, or null
 * @param lastWeek     { sessions, volumeKg } for the week that just ended
 * @param unit         display unit for the weekly summary
 * @param markers      what already fired, and when
 */
export function pickReminders({
  settings,
  now,
  today,
  weekKey,
  lastWorkoutDate = null,
  streak = null,
  plannedToday = null,
  staleRoutine = null,
  lastWeek = null,
  unit = 'kg',
  markers = {},
}) {
  const out = [];
  if (inQuietHours(settings, now)) return out;

  // Stale routine — once per ISO week.
  if (settings.staleRoutine && staleRoutine && markers.lastStaleWeek !== weekKey) {
    out.push({
      type: 'staleRoutine',
      title: 'Switch it up',
      body: `You've run "${staleRoutine.name}" for a while — open it to shuffle in fresh moves.`,
      marker: { lastStaleWeek: weekKey },
    });
  }

  // Weekly summary — once per ISO week. It used to promise "last week's recap
  // is waiting in Wrapped", which only has months and years; the recap is now
  // in the toast itself.
  if (settings.weeklySummary && markers.lastSummaryWeek !== weekKey) {
    out.push({
      type: 'weeklySummary',
      title: 'A fresh week',
      body: weeklyCopy(lastWeek, unit),
      marker: { lastSummaryWeek: weekKey },
    });
  }

  // One daily nudge at most, and only if you haven't trained today. The
  // streak nudge takes priority in the evening, and only when a session is
  // actually owed today.
  const trainedToday = lastWorkoutDate === today;
  if (!trainedToday && markers.lastNudgeDay !== today) {
    const owed = streakDueToday(streak, today);
    if (settings.streakRisk && owed && now.getHours() >= EVENING_HOUR) {
      out.push({
        type: 'streakRisk',
        title: 'Streak on the line',
        body: streakCopy(streak, owed),
        marker: { lastNudgeDay: today },
      });
    } else if (settings.gymNudge && (plannedToday !== false || owed)) {
      // A planned rest day is part of the plan, not a lapse to nag about.
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
