// Active-workout persistence helpers. The in-progress session is mirrored to
// localStorage so a phone lock or PWA reload never loses it. Pure + tested;
// the store wires these to read on boot and write-through on every change.

const MAX_AGE_MS = 18 * 60 * 60 * 1000; // 18h — older sessions are forgotten/stale

export function serialize(session) {
  if (!session) return null;
  try {
    return JSON.stringify(session);
  } catch {
    return null;
  }
}

// Parse + minimally validate a stored session. Corrupt/old-shape → null.
export function deserialize(raw) {
  if (!raw) return null;
  try {
    const s = JSON.parse(raw);
    if (!s || typeof s !== 'object') return null;
    if (typeof s.startedAt !== 'number' || !Array.isArray(s.exercises)) return null;
    return s;
  } catch {
    return null;
  }
}

// A session is stale (should not auto-resume) if it started in the future
// (clock weirdness) or more than MAX_AGE_MS ago.
export function isStale(session, now = Date.now()) {
  if (!session || typeof session.startedAt !== 'number') return true;
  const age = now - session.startedAt;
  return age < 0 || age > MAX_AGE_MS;
}
