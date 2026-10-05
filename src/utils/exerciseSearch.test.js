import { describe, it, expect } from 'vitest';
import { normalize, queryWords, matchesExercise, searchExercises, findNameClash } from './exerciseSearch.js';
import seed from './seedExercises.js';

const catalog = seed.map((e, i) => ({ ...e, id: i + 1 }));
const names = (list) => list.map((e) => e.name);

describe('normalize / queryWords', () => {
  it('trims, lowercases, collapses spaces and strips accents', () => {
    expect(normalize('  Développé   Couché ')).toBe('developpe couche');
    expect(queryWords('squat ')).toEqual(['squat']);
    expect(queryWords('  press   bench ')).toEqual(['press', 'bench']);
    expect(queryWords('   ')).toEqual([]);
    expect(normalize(null)).toBe('');
  });
});

describe('searchExercises', () => {
  it('ignores the trailing space an Android keyboard adds', () => {
    const r = searchExercises(catalog, 'squat ');
    expect(r.length).toBeGreaterThan(0);
    expect(names(r)).toContain('Back Squat');
  });

  it('matches words in any order', () => {
    const r = names(searchExercises(catalog, 'press bench'));
    expect(r).toContain('Bench Press');
    expect(r).toContain('Incline Bench Press');
    expect(r).not.toContain('Overhead Press');
  });

  it('matches equipment + muscle', () => {
    const r = searchExercises(catalog, 'dumbbell chest');
    expect(r.length).toBeGreaterThan(0);
    for (const ex of r) {
      expect(ex.equipment).toBe('dumbbell');
      expect(ex.muscleGroup).toBe('chest');
    }
  });

  it('knows what people call the muscles', () => {
    expect(searchExercises(catalog, 'glutes').every((e) => ['gluteal', 'hamstring', 'quadriceps', 'calves'].includes(e.muscleGroup) || /glute/i.test(e.name))).toBe(true);
    expect(names(searchExercises(catalog, 'glutes'))).toContain('Hip Thrust');
    expect(names(searchExercises(catalog, 'quads'))).toContain('Leg Extension');
    expect(names(searchExercises(catalog, 'rear delts'))).toContain('Face Pull');
  });

  it('ranks name matches ahead of muscle-only matches', () => {
    const r = names(searchExercises(catalog, 'chest'));
    const firstMuscleOnly = r.findIndex((n) => !/chest/i.test(n));
    const lastNameMatch = r.map((n) => /chest/i.test(n)).lastIndexOf(true);
    expect(lastNameMatch).toBeLessThan(firstMuscleOnly);
  });

  it('accent-insensitive on the data side too', () => {
    const list = [{ id: 1, name: 'Développé couché', muscleGroup: 'chest', equipment: 'barbell' }];
    expect(searchExercises(list, 'developpe')).toHaveLength(1);
  });

  it('an empty query returns the list untouched', () => {
    expect(searchExercises(catalog, '  ')).toBe(catalog);
    expect(searchExercises(undefined, 'x')).toEqual([]);
  });

  it('matchesExercise needs every word', () => {
    const bench = catalog.find((e) => e.name === 'Bench Press');
    expect(matchesExercise(bench, 'bench barbell')).toBe(true);
    expect(matchesExercise(bench, 'bench cable')).toBe(false);
  });
});

describe('findNameClash', () => {
  const list = [{ id: 1, name: 'Bench Press' }, { id: 2, name: 'Landmine Press' }];

  it('finds a duplicate regardless of case, spacing and accents', () => {
    expect(findNameClash(list, '  bench   PRESS ')?.id).toBe(1);
    expect(findNameClash([{ id: 3, name: 'Développé' }], 'developpe')?.id).toBe(3);
  });

  it('lets an exercise keep its own name when edited', () => {
    expect(findNameClash(list, 'Landmine press', 2)).toBeNull();
    expect(findNameClash(list, 'Bench Press', 2)?.id).toBe(1);
  });

  it('a free or blank name is no clash', () => {
    expect(findNameClash(list, 'Reverse Nordic')).toBeNull();
    expect(findNameClash(list, '   ')).toBeNull();
  });
});
