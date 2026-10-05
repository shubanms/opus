import { describe, it, expect } from 'vitest';
import { PROGRAMS, programById, programExerciseNames, programDays, resolveProgram, nameToIdMap } from './programs.js';
import seedExercises from './seedExercises.js';

const CATALOG = new Set(seedExercises.map((e) => e.name));
const BY_NAME = new Map(seedExercises.map((e) => [e.name, e]));

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

  it('installs as many days as the card says, each on its own weekday', () => {
    for (const p of PROGRAMS) {
      expect(p.schedule, p.id).toHaveLength(p.daysPerWeek);
      expect(programDays(p), p.id).toHaveLength(p.daysPerWeek);
    }
  });

  it('day names are unique within a program (they key the card chips and name the routines)', () => {
    for (const p of PROGRAMS) {
      const names = p.schedule.map((d) => d.name);
      expect(new Set(names).size, p.id).toBe(names.length);
    }
  });

  it('PPL is six days — push, pull and legs twice — Monday to Saturday', () => {
    const ppl = programById('ppl');
    expect(ppl.schedule.map((d) => d.name)).toEqual(['Push A', 'Pull A', 'Legs A', 'Push B', 'Pull B', 'Legs B']);
    expect(ppl.schedule.map((d) => d.dayOfWeek)).toEqual([1, 2, 3, 4, 5, 6]);
    // A and B days are genuinely different sessions.
    expect(ppl.schedule[0].exercises[0].name).not.toBe(ppl.schedule[3].exercises[0].name);
    // And they train what their names say.
    const groups = (day) => day.exercises.map((e) => BY_NAME.get(e.name).muscleGroup);
    for (const day of ppl.schedule.filter((d) => d.name.startsWith('Legs'))) {
      // (Romanian deadlift is filed under lower back in the catalogue.)
      expect(groups(day).filter((g) => ['quadriceps', 'hamstring', 'gluteal', 'calves'].includes(g)).length).toBeGreaterThanOrEqual(4);
    }
    for (const day of ppl.schedule.filter((d) => d.name.startsWith('Push'))) {
      expect(groups(day).every((g) => ['chest', 'front-deltoids', 'triceps'].includes(g))).toBe(true);
    }
  });

  it('nothing claims to be 5/3/1 or percentage-based — the engine cannot do waves', () => {
    for (const p of PROGRAMS) {
      expect(p.name, p.id).not.toMatch(/5\/3\/1/);
      expect(p.desc, p.id).not.toMatch(/percentage-based/i);
    }
    expect(programById('five_three_one').desc).toMatch(/without its percentage waves/);
  });

  it('steps are sized per lift: presses and curls small, deadlifts big', () => {
    const stepOf = (p, e) => e.step ?? p.progression.weightStep;
    for (const p of PROGRAMS) {
      for (const day of p.schedule) {
        for (const e of day.exercises) {
          if (e.name === 'Deadlift') expect(stepOf(p, e), `${p.id} ${e.name}`).toBe(5);
          if (/Press|Curl|Raise|Pushdown|Fly|Flye|Dip|Row|Pull/.test(e.name) && e.name !== 'Leg Press') {
            expect(stepOf(p, e), `${p.id} ${e.name}`).toBeLessThanOrEqual(2.5);
          }
        }
      }
    }
    // The back squat moves 5 a time when it's trained once or twice a week;
    // StrongLifts squats every session, so (as written) it moves 2.5 a time.
    expect(stepOf(programById('ppl'), programById('ppl').schedule[2].exercises[0])).toBe(5);
    expect(stepOf(programById('stronglifts_5x5'), programById('stronglifts_5x5').schedule[0].exercises[0])).toBe(2.5);
  });

  it('StrongLifts says what its fixed week does, and its squat is one prescription all week', () => {
    const sl = programById('stronglifts_5x5');
    expect(sl.desc).toMatch(/once a week/);
    const squats = sl.schedule.map((d) => d.exercises.find((e) => e.name === 'Back Squat'));
    expect(squats.every((s) => s && s.sets === 5 && s.reps === 5)).toBe(true);
  });
});

describe('programById', () => {
  it('finds a program and misses cleanly', () => {
    expect(programById('ppl').name).toBe('Push / Pull / Legs');
    expect(programById('nope')).toBeNull();
  });
});

describe('nameToIdMap', () => {
  it('prefers built-in exercises over a custom one with the same name', () => {
    const map = nameToIdMap([
      { id: 1, name: 'Bench Press', isCustom: false },
      { id: 90, name: 'Bench Press', isCustom: true },
      { id: 91, name: 'Landmine Press', isCustom: true },
    ]);
    expect(map['Bench Press']).toBe(1);
    expect(map['Landmine Press']).toBe(91);
  });

  it('…whatever order they come in', () => {
    const map = nameToIdMap([{ id: 90, name: 'Bench Press', isCustom: true }, { id: 1, name: 'Bench Press', isCustom: false }]);
    expect(map['Bench Press']).toBe(1);
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

  it('carries a per-lift step only where one is set', () => {
    const days = resolveProgram(programById('stronglifts_5x5'), nameToId);
    expect(days[1].exercises.find((e) => e.exerciseId === nameToId.Deadlift).weightStep).toBe(5);
    expect(days[1].exercises.find((e) => e.exerciseId === nameToId['Overhead Press']).weightStep).toBeNull();
  });

  it('skips exercises whose names do not resolve', () => {
    const days = resolveProgram(programById('stronglifts_5x5'), { 'Back Squat': 42 });
    expect(days[0].exercises).toHaveLength(1); // only Back Squat resolved
    expect(days[0].exercises[0].exerciseId).toBe(42);
  });
});
