import { describe, it, expect } from 'vitest';
import { PROGRAMS, programById, programExerciseNames, resolveProgram } from './programs.js';
import seedExercises from './seedExercises.js';

const CATALOG = new Set(seedExercises.map((e) => e.name));

describe('PROGRAMS', () => {
  it('has the expected classic programs', () => {
    const ids = PROGRAMS.map((p) => p.id);
    expect(ids).toContain('stronglifts_5x5');
    expect(ids).toContain('gzclp');
    expect(ids).toContain('ppl');
    expect(ids).toContain('upper_lower');
    expect(ids).toContain('five_three_one');
  });

  it('every program has a name, level, days/week and a progression scheme', () => {
    for (const p of PROGRAMS) {
      expect(p.name && p.level).toBeTruthy();
      expect(p.daysPerWeek).toBeGreaterThan(0);
      expect(['off', 'linear', 'double']).toContain(p.progression.mode);
      expect(p.schedule.length).toBeGreaterThan(0);
    }
  });

  it('EVERY exercise in EVERY program resolves to the seeded catalog', () => {
    for (const p of PROGRAMS) {
      for (const name of programExerciseNames(p)) {
        expect(CATALOG.has(name), `${p.id}: "${name}" not in catalog`).toBe(true);
      }
    }
  });
});

describe('programById', () => {
  it('finds a program and misses cleanly', () => {
    expect(programById('ppl').name).toBe('Push / Pull / Legs');
    expect(programById('nope')).toBeNull();
  });
});

describe('resolveProgram', () => {
  const nameToId = Object.fromEntries(seedExercises.map((e, i) => [e.name, i + 1]));

  it('maps exercise names to ids and carries targets + progression', () => {
    const days = resolveProgram(programById('stronglifts_5x5'), nameToId);
    expect(days).toHaveLength(3);
    expect(days[0].name).toBe('Workout A');
    expect(days[0].dayOfWeek).toBe(1);
    expect(days[0].progression.mode).toBe('linear');
    const squat = days[0].exercises[0];
    expect(squat.exerciseId).toBe(nameToId['Back Squat']);
    expect(squat.targetSets).toBe(5);
    expect(squat.targetReps).toBe(5);
    expect(squat.targetWeight).toBeNull();
  });

  it('skips exercises whose names do not resolve', () => {
    const days = resolveProgram(programById('stronglifts_5x5'), { 'Back Squat': 42 });
    expect(days[0].exercises).toHaveLength(1); // only Back Squat resolved
    expect(days[0].exercises[0].exerciseId).toBe(42);
  });
});
