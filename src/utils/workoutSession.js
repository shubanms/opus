// Active-workout persistence helpers. The in-progress session is mirrored to
// localStorage so a phone lock or PWA reload never loses it. Pure + tested;
// the store wires these to read on boot and write-through on every change.

const MAX_AGE_MS = 18 * 60 * 60 * 1000; // 18h — older sessions are forgotten/stale
/** How long a gap before "you stopped lifting a while ago" is worth asking about. */
export const IDLE_END_MS = 30 * 60 * 1000;

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

// ---------------------------------------------------------------------------
// Set identity
//
// Sets used to be identified by `setNumber`, assigned as `sets.length + 1`.
// Delete set 2 of three and log again and you had [1, 3, 3]: one trash tap
// removed both 3s, a rating landed on both, React saw duplicate keys and both
// rows were saved as set 3. Two fixes, for two different jobs:
//
// - `setNumber` is renumbered 1..n on every removal, so it stays a position a
//   person can read ("set 3") and the crit roll keeps its rule that the same
//   position rolls the same way.
// - `uid` is minted once at log time and never changes, so React keys and
//   enter/exit animations follow the *set*, not the slot it happens to be in.
// ---------------------------------------------------------------------------

let uidSeq = 0;

/** A unique-enough id for a set or a session. Not a UUID; it never leaves the device. */
export function makeUid(prefix = 's', now = Date.now()) {
  uidSeq = (uidSeq + 1) % 1679616; // 36^4 — keeps the suffix short
  return `${prefix}${now.toString(36)}${uidSeq.toString(36)}${Math.floor(Math.random() * 1296).toString(36)}`;
}

/** Positions 1..n in order. Returns the same array when nothing changed. */
export function renumber(sets) {
  const list = sets ?? [];
  if (list.every((s, i) => s.setNumber === i + 1)) return list;
  return list.map((s, i) => (s.setNumber === i + 1 ? s : { ...s, setNumber: i + 1 }));
}

/**
 * Bring a stored session up to the current shape: a session id, a uid on
 * every set, unique set numbers. A session saved by an older build mid-workout
 * may carry the [1, 3, 3] numbering — this is where it gets repaired, before
 * any action can match two rows at once.
 */
export function normalizeSession(session, uid = makeUid) {
  if (!session) return session;
  let changed = false;
  const seen = new Set();
  const exercises = (session.exercises ?? []).map((ex) => {
    const original = ex.sets ?? [];
    let touched = false;
    const sets = original.map((s) => {
      if (s.uid && !seen.has(s.uid)) {
        seen.add(s.uid);
        return s;
      }
      touched = true;
      const fresh = { ...s, uid: uid('s') };
      seen.add(fresh.uid);
      return fresh;
    });
    const numbered = renumber(sets);
    if (numbered !== sets) touched = true;
    if (!touched && Array.isArray(ex.sets)) return ex;
    changed = true;
    return { ...ex, sets: numbered };
  });
  const sid = session.sid ?? uid('w');
  if (!changed && sid === session.sid) return session;
  return { ...session, sid, exercises };
}

/** Remove one set by position; returns `{ sets, removed, index }` (removed null if absent). */
export function removeSetAt(sets, setNumber) {
  const list = sets ?? [];
  const index = list.findIndex((s) => s.setNumber === setNumber);
  if (index < 0) return { sets: list, removed: null, index: -1 };
  const next = renumber([...list.slice(0, index), ...list.slice(index + 1)]);
  return { sets: next, removed: list[index], index };
}

/** Put a removed set back where it was (or at the end), renumbering around it. */
export function insertSetAt(sets, set, index) {
  const list = (sets ?? []).filter((s) => s.uid !== set.uid);
  const at = Math.max(0, Math.min(Number.isInteger(index) ? index : list.length, list.length));
  return renumber([...list.slice(0, at), set, ...list.slice(at)]);
}

/** True when the session has at least one logged set — i.e. something to lose. */
export function hasSets(session) {
  return Boolean(session?.exercises?.some((e) => (e.sets?.length ?? 0) > 0));
}

/** The same session, judged by its id (falling back to its start time for old saves). */
export function sameSession(a, b) {
  if (!a || !b) return false;
  if (a.sid && b.sid) return a.sid === b.sid;
  return a.startedAt === b.startedAt;
}

/**
 * Whether an undo may put `snapshot` back as the live session.
 *
 * Undo must never cost someone a *different* workout: if they started another
 * session in the seconds since the discard and logged anything in it, the
 * discard stays. An untouched new session has nothing to lose, so it yields.
 */
export function canRestoreSession(current, snapshot) {
  if (!snapshot) return false;
  if (!current) return true;
  if (sameSession(current, snapshot)) return true;
  return !hasSets(current);
}

/** Timestamp of the most recently logged set, or null for an empty session. */
export function lastSetAt(session) {
  let t = 0;
  for (const ex of session?.exercises ?? []) {
    for (const s of ex.sets ?? []) {
      const c = Number(s.completedAt);
      if (Number.isFinite(c) && c > t) t = c;
    }
  }
  return t > 0 ? t : null;
}

/**
 * When the session should be recorded as ending.
 *
 * A session finished on the spot ends now. One where the last set was more
 * than `IDLE_END_MS` ago — you forgot to tap Finish and walked home — would
 * otherwise record the walk as training time and its calories; that is when
 * ending at the last set is offered instead. Null means "nothing to offer".
 */
export function suggestEndAt(session, now = Date.now(), idleMs = IDLE_END_MS) {
  const last = lastSetAt(session);
  if (!last || !session?.startedAt) return null;
  if (now - last <= idleMs) return null;
  return Math.max(session.startedAt, last);
}
