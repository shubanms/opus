import { describe, it, expect } from 'vitest';
import {
  serialize,
  deserialize,
  isStale,
  renumber,
  normalizeSession,
  removeSetAt,
  insertSetAt,
  hasSets,
  sameSession,
  canRestoreSession,
  lastSetAt,
  suggestEndAt,
  makeUid,
  IDLE_END_MS,
} from './workoutSession.js';

const session = { name: 'Push', startedAt: 1_000_000, energy: null, exercises: [{ exerciseId: 1, sets: [] }] };

describe('serialize / deserialize', () => {
  it('round-trips a session', () => {
    expect(deserialize(serialize(session))).toEqual(session);
  });
  it('returns null for missing/empty input', () => {
    expect(serialize(null)).toBeNull();
    expect(deserialize(null)).toBeNull();
    expect(deserialize('')).toBeNull();
  });
  it('returns null for corrupt JSON', () => {
    expect(deserialize('{not json')).toBeNull();
  });
  it('rejects wrong-shape objects', () => {
    expect(deserialize(JSON.stringify({ foo: 1 }))).toBeNull();
    expect(deserialize(JSON.stringify({ startedAt: 5 }))).toBeNull(); // no exercises[]
    expect(deserialize(JSON.stringify({ exercises: [] }))).toBeNull(); // no startedAt
  });
});

describe('isStale', () => {
  const now = 100 * 60 * 60 * 1000; // arbitrary "now"
  it('fresh session is not stale', () => {
    expect(isStale({ startedAt: now - 60 * 60 * 1000, exercises: [] }, now)).toBe(false); // 1h ago
  });
  it('older than 18h is stale', () => {
    expect(isStale({ startedAt: now - 19 * 60 * 60 * 1000, exercises: [] }, now)).toBe(true);
  });
  it('future start (clock skew) is stale', () => {
    expect(isStale({ startedAt: now + 5000, exercises: [] }, now)).toBe(true);
  });
  it('null / malformed is stale', () => {
    expect(isStale(null, now)).toBe(true);
    expect(isStale({ exercises: [] }, now)).toBe(true);
  });
});

const set = (n, extra = {}) => ({ setNumber: n, uid: `u${n}`, weight: 100, reps: 5, ...extra });
const nums = (sets) => sets.map((s) => s.setNumber);

describe('renumber', () => {
  it('closes the gap a removal leaves', () => {
    expect(nums(renumber([set(1), set(3)]))).toEqual([1, 2]);
  });
  it('repairs the duplicate numbering older builds produced', () => {
    // Log 3, delete set 2, log again: the old `length + 1` gave [1, 3, 3].
    expect(nums(renumber([set(1), set(3, { uid: 'a' }), set(3, { uid: 'b' })]))).toEqual([1, 2, 3]);
  });
  it('returns the same array when the numbering is already right', () => {
    const list = [set(1), set(2)];
    expect(renumber(list)).toBe(list);
  });
  it('handles nothing', () => {
    expect(renumber(undefined)).toEqual([]);
  });
});

describe('removeSetAt / insertSetAt', () => {
  it('removes exactly one set, even when numbers collided', () => {
    // The bug: one trash tap removed both "3"s. Removal now takes one row.
    const out = removeSetAt([set(1), set(2), set(3)], 2);
    expect(out.removed.uid).toBe('u2');
    expect(out.index).toBe(1);
    expect(nums(out.sets)).toEqual([1, 2]);
    expect(out.sets.map((s) => s.uid)).toEqual(['u1', 'u3']);
  });

  it('logging after a removal can never reuse a number', () => {
    const { sets } = removeSetAt([set(1), set(2), set(3)], 2);
    const next = [...sets, { ...set(sets.length + 1), uid: 'new' }];
    expect(new Set(nums(next)).size).toBe(next.length);
  });

  it('is a no-op for a set that is not there', () => {
    const list = [set(1)];
    const out = removeSetAt(list, 5);
    expect(out.removed).toBe(null);
    expect(out.sets).toBe(list);
  });

  it('puts a removed set back in its old slot', () => {
    const { sets, removed, index } = removeSetAt([set(1), set(2), set(3)], 2);
    const back = insertSetAt(sets, removed, index);
    expect(back.map((s) => s.uid)).toEqual(['u1', 'u2', 'u3']);
    expect(nums(back)).toEqual([1, 2, 3]);
  });

  it('appends when the slot no longer exists, and never duplicates', () => {
    const back = insertSetAt([set(1)], set(9, { uid: 'x' }), 7);
    expect(back.map((s) => s.uid)).toEqual(['u1', 'x']);
    expect(insertSetAt(back, back[1], 0).map((s) => s.uid)).toEqual(['x', 'u1']);
  });
});

describe('normalizeSession', () => {
  let n = 0;
  const uid = (p) => `${p}${++n}`;

  it('gives every set a uid and the session an id', () => {
    const out = normalizeSession({ startedAt: 1, exercises: [{ exerciseId: 1, sets: [{ setNumber: 1 }, { setNumber: 2 }] }] }, uid);
    expect(out.sid).toMatch(/^w/);
    expect(out.exercises[0].sets.every((s) => typeof s.uid === 'string')).toBe(true);
  });

  it('repairs duplicate numbers and duplicate uids from an older save', () => {
    const out = normalizeSession(
      {
        sid: 'w0',
        startedAt: 1,
        exercises: [{ exerciseId: 1, sets: [set(1), set(3, { uid: 'dup' }), set(3, { uid: 'dup' })] }],
      },
      uid
    );
    const sets = out.exercises[0].sets;
    expect(nums(sets)).toEqual([1, 2, 3]);
    expect(new Set(sets.map((s) => s.uid)).size).toBe(3);
  });

  it('returns the very same object when nothing needs fixing', () => {
    const s = { sid: 'w1', startedAt: 1, exercises: [{ exerciseId: 1, sets: [set(1), set(2)] }] };
    expect(normalizeSession(s, uid)).toBe(s);
  });

  it('passes null through', () => {
    expect(normalizeSession(null)).toBe(null);
  });
});

describe('makeUid', () => {
  it('does not repeat within a burst', () => {
    const ids = new Set(Array.from({ length: 500 }, () => makeUid('s', 123)));
    expect(ids.size).toBe(500);
  });
});

describe('session identity and undo', () => {
  const a = { sid: 'w1', startedAt: 10, exercises: [{ exerciseId: 1, sets: [set(1)] }] };
  const emptyOther = { sid: 'w2', startedAt: 20, exercises: [] };
  const busyOther = { sid: 'w3', startedAt: 30, exercises: [{ exerciseId: 2, sets: [set(1)] }] };

  it('knows a session by its id, or its start time for old saves', () => {
    expect(sameSession(a, { ...a })).toBe(true);
    expect(sameSession(a, emptyOther)).toBe(false);
    expect(sameSession({ startedAt: 5 }, { startedAt: 5 })).toBe(true);
    expect(sameSession(null, a)).toBe(false);
  });

  it('restores a discarded session when nothing has replaced it', () => {
    expect(canRestoreSession(null, a)).toBe(true);
  });

  it('lets an untouched new session yield', () => {
    expect(canRestoreSession(emptyOther, a)).toBe(true);
  });

  it('never clobbers a different session with work in it', () => {
    expect(canRestoreSession(busyOther, a)).toBe(false);
  });

  it('has nothing to restore without a snapshot', () => {
    expect(canRestoreSession(null, null)).toBe(false);
  });

  it('hasSets', () => {
    expect(hasSets(a)).toBe(true);
    expect(hasSets(emptyOther)).toBe(false);
    expect(hasSets(null)).toBe(false);
  });
});

describe('lastSetAt / suggestEndAt', () => {
  const start = 1_000_000_000;
  const sess = (times) => ({
    startedAt: start,
    exercises: [{ exerciseId: 1, sets: times.map((t, i) => set(i + 1, { completedAt: start + t })) }],
  });

  it('finds the most recent set across exercises', () => {
    const s = {
      startedAt: start,
      exercises: [
        { exerciseId: 1, sets: [set(1, { completedAt: start + 100 })] },
        { exerciseId: 2, sets: [set(1, { completedAt: start + 900 })] },
      ],
    };
    expect(lastSetAt(s)).toBe(start + 900);
    expect(lastSetAt({ startedAt: start, exercises: [] })).toBe(null);
  });

  it('offers nothing for a session finished on the spot', () => {
    const s = sess([60_000, 600_000]);
    expect(suggestEndAt(s, start + 600_000 + 5 * 60_000)).toBe(null);
  });

  it('offers the last set when you walked off without finishing', () => {
    const s = sess([60_000, 600_000]);
    expect(suggestEndAt(s, start + 600_000 + IDLE_END_MS + 1)).toBe(start + 600_000);
  });

  it('offers nothing for an empty session', () => {
    expect(suggestEndAt({ startedAt: start, exercises: [] }, start + 10 * IDLE_END_MS)).toBe(null);
  });
});
