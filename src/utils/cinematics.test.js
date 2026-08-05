import { describe, it, expect } from 'vitest';
import {
  KIND,
  BASE_MS,
  headlinePR,
  pace,
  queueForResult,
  totalDuration,
  summarize,
} from './cinematics.js';

const pr = (over = {}) => ({ name: 'Bench Press', type: 'weight', value: 100, prev: 90, ...over });

describe('headlinePR', () => {
  it('prefers a weight record over volume and reps', () => {
    const picked = headlinePR([
      { ...pr({ type: 'reps', value: 12, prev: 8 }) },
      { ...pr({ type: 'volume', value: 5000, prev: 2000 }) },
      { ...pr({ type: 'weight', value: 101, prev: 100 }) },
    ]);
    // Even though the volume record is a far bigger jump.
    expect(picked.type).toBe('weight');
  });

  it('breaks ties on the biggest relative gain', () => {
    const picked = headlinePR([
      pr({ name: 'Squat', value: 102, prev: 100 }),
      pr({ name: 'Deadlift', value: 150, prev: 100 }),
    ]);
    expect(picked.name).toBe('Deadlift');
  });

  it('ranks a first-ever record below one that beat something', () => {
    const picked = headlinePR([
      pr({ name: 'First', value: 200, prev: null }),
      pr({ name: 'Beat', value: 60, prev: 50 }),
    ]);
    expect(picked.name).toBe('Beat');
  });

  it('falls back to the larger value when neither beat anything', () => {
    const picked = headlinePR([
      pr({ name: 'Small', value: 40, prev: null }),
      pr({ name: 'Big', value: 90, prev: null }),
    ]);
    expect(picked.name).toBe('Big');
  });

  it('does not mutate the input', () => {
    const list = [pr({ type: 'reps' }), pr({ type: 'weight' })];
    const copy = [...list];
    headlinePR(list);
    expect(list).toEqual(copy);
  });

  it('handles nothing', () => {
    expect(headlinePR([])).toBe(null);
    expect(headlinePR(undefined)).toBe(null);
  });
});

describe('pace', () => {
  it('plays one or two events at full length', () => {
    expect(pace(1)).toBe(1);
    expect(pace(2)).toBe(1);
  });

  it('speeds up as the queue grows', () => {
    expect(pace(3)).toBeLessThan(1);
    expect(pace(4)).toBeLessThan(pace(3));
  });
});

describe('queueForResult', () => {
  it('is empty for an ordinary session', () => {
    expect(queueForResult({ prCount: 0, leveledUp: false })).toEqual([]);
    expect(queueForResult(undefined)).toEqual([]);
    expect(queueForResult({})).toEqual([]);
  });

  it('collapses many records into one cinematic and counts the rest', () => {
    const q = queueForResult({ prs: [pr(), pr({ type: 'reps' }), pr({ type: 'volume' })] });
    expect(q).toHaveLength(1);
    expect(q[0].kind).toBe(KIND.PR);
    expect(q[0].extra).toBe(2);
  });

  it('orders record, level, dungeon, achievement', () => {
    const q = queueForResult({
      prs: [pr()],
      leveledUp: true,
      newLevel: 5,
      newTitle: 'Contender',
      dungeon: { cleared: true, name: 'Gauntlet of Steel', iron: 120 },
      newAchievements: [{ key: 'a', title: 'First Blood' }],
    });
    expect(q.map((x) => x.kind)).toEqual([KIND.PR, KIND.LEVEL, KIND.DUNGEON, KIND.ACHIEVEMENT]);
  });

  it('does not re-celebrate a dungeon already cleared today', () => {
    const q = queueForResult({ dungeon: { cleared: true, alreadyCleared: true, name: 'X' } });
    expect(q).toEqual([]);
  });

  it('gives every item a stable unique key', () => {
    const q = queueForResult({ prs: [pr()], leveledUp: true, newLevel: 2, newTitle: 'T' });
    expect(new Set(q.map((x) => x.id)).size).toBe(q.length);
  });

  it('keeps a four-event session under six seconds', () => {
    const q = queueForResult({
      prs: [pr()],
      leveledUp: true,
      newLevel: 5,
      newTitle: 'Contender',
      dungeon: { cleared: true, name: 'Gauntlet', iron: 120 },
      newAchievements: [{ key: 'a', title: 'First Blood' }],
    });
    // Nothing here can be skipped, so the worst case is the number that matters.
    expect(totalDuration(q)).toBeLessThan(6000);
  });

  it('plays a lone event at its full length', () => {
    const q = queueForResult({ leveledUp: true, newLevel: 3, newTitle: 'T' });
    expect(q[0].duration).toBe(BASE_MS[KIND.LEVEL]);
    expect(q[0].scale).toBe(1);
  });

  it('carries the pacing scale on every item', () => {
    // The components stagger their content in on a delay schedule. If the
    // screen shortens but the schedule does not, the last line arrives as the
    // cinematic is leaving — so the scale has to travel with the item.
    const q = queueForResult({
      prs: [pr()],
      leveledUp: true,
      newLevel: 5,
      newTitle: 'C',
      dungeon: { cleared: true, name: 'G', iron: 1 },
    });
    expect(q).toHaveLength(3);
    for (const item of q) {
      expect(item.scale).toBe(pace(3));
      expect(item.duration).toBe(Math.round(BASE_MS[item.kind] * pace(3)));
    }
  });
});

describe('summarize', () => {
  it('describes each kind in one line', () => {
    expect(summarize({ kind: KIND.PR, pr: pr(), extra: 0 })).toContain('Bench Press');
    expect(summarize({ kind: KIND.PR, pr: pr(), extra: 2 })).toContain('+2 more');
    expect(summarize({ kind: KIND.LEVEL, level: 7, title: 'Brute' })).toBe('Level 7 — Brute');
    expect(summarize({ kind: KIND.DUNGEON, name: 'Gauntlet', iron: 90 })).toContain('90 Iron');
    expect(summarize({ kind: KIND.ACHIEVEMENT, achievements: [{ title: 'First Blood' }] })).toContain(
      'First Blood'
    );
    expect(
      summarize({ kind: KIND.ACHIEVEMENT, achievements: [{ title: 'a' }, { title: 'b' }] })
    ).toBe('2 achievements unlocked');
  });

  it('survives junk', () => {
    expect(summarize(null)).toBe('');
    expect(summarize({ kind: 'nonsense' })).toBe('');
    expect(summarize({ kind: KIND.PR })).toContain('record');
  });
});
