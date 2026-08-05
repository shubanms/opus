import { describe, it, expect } from 'vitest';
import { rankAlternatives, swapScore } from './exerciseSwap.js';

const ex = (id, name, over = {}) => ({
  id,
  name,
  muscleGroup: 'chest',
  equipment: 'barbell',
  difficulty: 'intermediate',
  ...over,
});

const bench = ex(1, 'Bench Press');

describe('swapScore', () => {
  it('prefers a different implement', () => {
    // You swap because the barbell is taken, not because you dislike benching.
    const dumbbell = ex(2, 'DB Press', { equipment: 'dumbbell' });
    const otherBarbell = ex(3, 'Incline Bench', { equipment: 'barbell' });
    expect(swapScore(bench, dumbbell)).toBeGreaterThan(swapScore(bench, otherBarbell));
  });

  it('prefers a similar difficulty', () => {
    const same = ex(2, 'A', { equipment: 'cable', difficulty: 'intermediate' });
    const far = ex(3, 'B', { equipment: 'cable', difficulty: 'advanced' });
    expect(swapScore(bench, same)).toBeGreaterThan(swapScore(bench, far));
  });

  it('prefers something you already train', () => {
    const plain = ex(2, 'A', { equipment: 'cable' });
    const fave = ex(3, 'B', { equipment: 'cable', favorite: true });
    expect(swapScore(bench, fave)).toBeGreaterThan(swapScore(bench, plain));
  });

  it('handles unknown difficulty without blowing up', () => {
    expect(swapScore(bench, ex(2, 'A', { difficulty: undefined }))).toBeGreaterThanOrEqual(0);
  });
});

describe('rankAlternatives', () => {
  const catalogue = [
    bench,
    ex(2, 'Dumbbell Press', { equipment: 'dumbbell' }),
    ex(3, 'Incline Bench Press', { equipment: 'barbell' }),
    ex(4, 'Cable Crossover', { equipment: 'cable' }),
    ex(5, 'Barbell Row', { muscleGroup: 'upper-back' }),
    ex(6, 'Squat', { muscleGroup: 'quadriceps' }),
  ];

  it('only offers the same muscle group', () => {
    const out = rankAlternatives(bench, catalogue);
    expect(out.every((e) => e.muscleGroup === 'chest')).toBe(true);
    // A "substitute" that trains something else is a different workout.
    expect(out.find((e) => e.name === 'Barbell Row')).toBeUndefined();
  });

  it('never offers the exercise you are replacing', () => {
    expect(rankAlternatives(bench, catalogue).find((e) => e.id === 1)).toBeUndefined();
  });

  it('leads with a different implement', () => {
    const out = rankAlternatives(bench, catalogue);
    expect(out[0].equipment).not.toBe('barbell');
  });

  it('excludes exercises already in the session', () => {
    const out = rankAlternatives(bench, catalogue, { exclude: [2, 4] });
    expect(out.map((e) => e.id)).toEqual([3]);
  });

  it('respects the limit', () => {
    expect(rankAlternatives(bench, catalogue, { limit: 1 })).toHaveLength(1);
    expect(rankAlternatives(bench, catalogue, { limit: 0 })).toHaveLength(0);
  });

  it('is deterministic for equal scores', () => {
    const a = rankAlternatives(bench, catalogue).map((e) => e.id);
    const b = rankAlternatives(bench, catalogue).map((e) => e.id);
    expect(a).toEqual(b);
  });

  it('survives missing data', () => {
    expect(rankAlternatives(undefined, catalogue)).toEqual([]);
    expect(rankAlternatives(bench, undefined)).toEqual([]);
    expect(rankAlternatives({ id: 9 }, catalogue)).toEqual([]);
    expect(rankAlternatives(bench, [null, undefined])).toEqual([]);
  });

  it('returns nothing rather than something wrong when the group is unique', () => {
    expect(rankAlternatives(ex(9, 'Only', { muscleGroup: 'tail' }), catalogue)).toEqual([]);
  });
});
