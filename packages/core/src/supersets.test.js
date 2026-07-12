import { describe, it, expect } from 'vitest';
import { supersetRuns, noRestIds } from './supersets.js';

const ex = (id, supersetId = null) => ({ exerciseId: id, supersetId });

describe('supersetRuns', () => {
  it('treats unlinked exercises as standalone runs', () => {
    const runs = supersetRuns([ex(1), ex(2), ex(3)]);
    expect(runs.map((r) => r.length)).toEqual([1, 1, 1]);
  });
  it('groups contiguous exercises sharing a supersetId', () => {
    const runs = supersetRuns([ex(1, 'a'), ex(2, 'a'), ex(3)]);
    expect(runs.map((r) => r.map((e) => e.exerciseId))).toEqual([[1, 2], [3]]);
  });
  it('does not merge non-contiguous matches', () => {
    const runs = supersetRuns([ex(1, 'a'), ex(2), ex(3, 'a')]);
    expect(runs.map((r) => r.length)).toEqual([1, 1, 1]);
  });
  it('supports three-move circuits', () => {
    const runs = supersetRuns([ex(1, 'g'), ex(2, 'g'), ex(3, 'g')]);
    expect(runs).toHaveLength(1);
    expect(runs[0]).toHaveLength(3);
  });
});

describe('noRestIds', () => {
  it('is empty with no supersets', () => {
    expect(noRestIds([ex(1), ex(2)]).size).toBe(0);
  });
  it('rests only after the last member of a superset', () => {
    const ids = noRestIds([ex(1, 'a'), ex(2, 'a'), ex(3, 'a')]);
    expect(ids.has(1)).toBe(true);
    expect(ids.has(2)).toBe(true);
    expect(ids.has(3)).toBe(false); // last → rest happens
  });
});
