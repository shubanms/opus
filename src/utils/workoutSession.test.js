import { describe, it, expect } from 'vitest';
import { serialize, deserialize, isStale } from './workoutSession.js';

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
