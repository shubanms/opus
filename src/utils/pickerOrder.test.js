import { describe, it, expect } from 'vitest';
import { recentExerciseIds, rankForPicker, pickerSections } from './pickerOrder.js';

const ex = (id, name, extra = {}) => ({ id, name, ...extra });
const catalogue = [
  ex(1, 'Squat'),
  ex(2, 'Bench Press', { favorite: true }),
  ex(3, 'Deadlift'),
  ex(4, 'Arnold Press'),
  ex(5, 'Curl', { favorite: true }),
  ex(6, 'Row'),
];

describe('recentExerciseIds', () => {
  it('takes each exercise once, newest first', () => {
    const sets = [{ exerciseId: 3 }, { exerciseId: 3 }, { exerciseId: 6 }, { exerciseId: 3 }, { exerciseId: 1 }];
    expect(recentExerciseIds(sets)).toEqual([3, 6, 1]);
  });
  it('respects the limit and skips junk', () => {
    expect(recentExerciseIds([{ exerciseId: 1 }, {}, null, { exerciseId: 2 }, { exerciseId: 3 }], 2)).toEqual([1, 2]);
    expect(recentExerciseIds(undefined)).toEqual([]);
  });
});

describe('rankForPicker', () => {
  it('puts favourites first, then recent, then A–Z', () => {
    const names = rankForPicker(catalogue, [6, 1, 2]).map((e) => e.name);
    expect(names).toEqual(['Bench Press', 'Curl', 'Row', 'Squat', 'Arnold Press', 'Deadlift']);
  });
  it('orders favourites by recency too', () => {
    expect(rankForPicker(catalogue, [5]).slice(0, 2).map((e) => e.name)).toEqual(['Curl', 'Bench Press']);
  });
  it('is plain A–Z with no history and no stars', () => {
    const plain = catalogue.map(({ favorite, ...e }) => e);
    expect(rankForPicker(plain).map((e) => e.name)).toEqual(['Arnold Press', 'Bench Press', 'Curl', 'Deadlift', 'Row', 'Squat']);
  });
  it('does not mutate its input', () => {
    const copy = [...catalogue];
    rankForPicker(catalogue, [6]);
    expect(catalogue).toEqual(copy);
  });
});

describe('pickerSections', () => {
  it('groups favourites, recent and the full catalogue', () => {
    const s = pickerSections(catalogue, [6, 2, 1]);
    expect(s.map((x) => x.key)).toEqual(['favourites', 'recent', 'all']);
    expect(s[0].items.map((e) => e.name)).toEqual(['Bench Press', 'Curl']);
    // A favourite is not repeated under Recent.
    expect(s[1].items.map((e) => e.name)).toEqual(['Row', 'Squat']);
    // The A–Z list stays complete.
    expect(s[2].items).toHaveLength(catalogue.length);
    expect(s[2].items[0].name).toBe('Arnold Press');
  });
  it('drops empty groups', () => {
    const plain = catalogue.map(({ favorite, ...e }) => e);
    expect(pickerSections(plain, []).map((x) => x.key)).toEqual(['all']);
  });
  it('ignores recent ids that are no longer in the catalogue', () => {
    expect(pickerSections(catalogue, [99, 6])[1].items.map((e) => e.id)).toEqual([6]);
  });
});
