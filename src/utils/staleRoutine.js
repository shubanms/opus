// "Switch it up" detection. A routine is stale once it's both old enough AND
// well-used — dual threshold so brand-new routines never nudge. Pure + tested.

const WEEK_MS = 7 * 86400000;
export const STALE_WEEKS = 4;
export const STALE_SESSIONS = 8;

export function isStaleRoutine(template, sessions, now = Date.now()) {
  if (!template?.createdAt) return false;
  const weeks = (now - template.createdAt) / WEEK_MS;
  return weeks >= STALE_WEEKS && sessions >= STALE_SESSIONS;
}

// Count completed workouts per templateId.
export function sessionCounts(workouts) {
  const counts = {};
  for (const w of workouts) {
    if (w.templateId != null) counts[w.templateId] = (counts[w.templateId] ?? 0) + 1;
  }
  return counts;
}

// The most-overused stale routine ({ id, name, sessions }), or null.
export function pickStalest(templates, workouts, now = Date.now()) {
  const counts = sessionCounts(workouts);
  let best = null;
  for (const t of templates) {
    const s = counts[t.id] ?? 0;
    if (isStaleRoutine(t, s, now) && (!best || s > best.sessions)) {
      best = { id: t.id, name: t.name, sessions: s };
    }
  }
  return best;
}
