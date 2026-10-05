import { describe, it, expect } from 'vitest';
import { filterHistory, groupByMonth, haystackFor, historyTags, normalize } from './historySearch.js';

const workouts = [
  { id: 3, date: '2026-10-02', name: 'Push', notes: 'Shoulder felt tight', tags: ['Chest'], totalVolume: 5000, totalSets: 18 },
  { id: 2, date: '2026-09-30', name: 'Pull', notes: '', tags: ['Back', 'Arms'], totalVolume: 4000, totalSets: 16 },
  { id: 1, date: '2026-09-28', name: 'Legs', tags: [], totalVolume: 9000, totalSets: 15 },
];
const names = new Map([[3, ['Bench Press', 'Overhead Press']], [2, ['Barbell Row', 'Pull-Up']], [1, ['Front Squat', 'Leg Press']]]);

describe('normalize / haystackFor', () => {
  it('ignores case and accents', () => {
    expect(normalize('Café PRESS')).toBe('cafe press');
  });
  it('includes name, notes, tags and exercise names', () => {
    const hay = haystackFor(workouts[0], names.get(3));
    for (const word of ['push', 'shoulder', 'chest', 'bench press']) expect(hay).toContain(word);
  });
});

describe('filterHistory', () => {
  it('returns everything for an empty query', () => {
    expect(filterHistory(workouts, {}, names)).toHaveLength(3);
    expect(filterHistory(workouts, { query: '   ' }, names)).toHaveLength(3);
  });

  it('finds a session by a lift in it', () => {
    expect(filterHistory(workouts, { query: 'front squat' }, names).map((w) => w.id)).toEqual([1]);
  });

  it('every word must match, in any field', () => {
    expect(filterHistory(workouts, { query: 'press tight' }, names).map((w) => w.id)).toEqual([3]);
    expect(filterHistory(workouts, { query: 'press' }, names).map((w) => w.id)).toEqual([3, 1]);
  });

  it('filters by tag, alone or with a query', () => {
    expect(filterHistory(workouts, { tag: 'Arms' }, names).map((w) => w.id)).toEqual([2]);
    expect(filterHistory(workouts, { tag: 'Arms', query: 'bench' }, names)).toEqual([]);
  });

  it('still searches names and notes before the exercise index has loaded', () => {
    expect(filterHistory(workouts, { query: 'tight' }, null).map((w) => w.id)).toEqual([3]);
  });
});

describe('historyTags', () => {
  it('most used first, ties alphabetical', () => {
    const tagged = [...workouts, { id: 4, date: '2026-09-01', tags: ['Arms'] }];
    expect(historyTags(tagged)).toEqual(['Arms', 'Back', 'Chest']);
    expect(historyTags([])).toEqual([]);
  });
});

describe('groupByMonth', () => {
  it('groups newest-first sessions by month with that month\'s totals', () => {
    const months = groupByMonth(workouts);
    expect(months.map((m) => [m.key, m.label, m.items.length, m.volume, m.sets])).toEqual([
      ['2026-10', 'October 2026', 1, 5000, 18],
      ['2026-09', 'September 2026', 2, 13000, 31],
    ]);
  });

  it('totals follow the filter', () => {
    const months = groupByMonth(filterHistory(workouts, { query: 'pull' }, names));
    expect(months.map((m) => [m.key, m.volume])).toEqual([['2026-09', 4000]]);
  });
});
