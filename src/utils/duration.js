// Turning a number of seconds into something readable.
//
// This existed as three byte-identical private copies (WorkoutCard,
// EndWorkoutModal, WorkoutPage's ElapsedTimer) plus a fourth variant in the
// share cards. Same job, four places to fix a rounding bug.

/** Session length as prose: "45m", "1h 12m". */
export function formatDuration(secs) {
  const total = Math.max(0, Math.floor(Number(secs) || 0));
  const m = Math.floor(total / 60);
  const h = Math.floor(m / 60);
  return h > 0 ? `${h}h ${m % 60}m` : `${m}m`;
}

/**
 * A running clock: "07:32", and "1:07:32" once it passes an hour.
 *
 * Zero-padded on the minutes only when hours are showing, so a session that
 * has been open for eight minutes reads "8:04" rather than "08:04" — the
 * leading zero makes a short session look like a long one at a glance.
 */
export function formatClock(secs) {
  const total = Math.max(0, Math.floor(Number(secs) || 0));
  const s = total % 60;
  const m = Math.floor(total / 60) % 60;
  const h = Math.floor(total / 3600);
  const ss = String(s).padStart(2, '0');
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`;
}
