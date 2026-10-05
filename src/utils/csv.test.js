import { describe, it, expect } from 'vitest';
import { CSV_BOM, buildSetRows, escapeCsv, toCsv, setsToCsv } from './csv.js';

describe('escapeCsv', () => {
  it('leaves plain values unquoted', () => {
    expect(escapeCsv('Squat')).toBe('Squat');
    expect(escapeCsv(42)).toBe('42');
    expect(escapeCsv(null)).toBe('');
  });
  it('quotes and escapes commas, quotes, newlines', () => {
    expect(escapeCsv('a,b')).toBe('"a,b"');
    expect(escapeCsv('say "hi"')).toBe('"say ""hi"""');
    expect(escapeCsv('line1\nline2')).toBe('"line1\nline2"');
  });
  it('defuses text a spreadsheet would run as a formula', () => {
    expect(escapeCsv('=HYPERLINK("http://x","hi")')).toBe(`"'=HYPERLINK(""http://x"",""hi"")"`);
    expect(escapeCsv('+1')).toBe("'+1");
    expect(escapeCsv('-felt easy')).toBe("'-felt easy");
    expect(escapeCsv('@SUM(A1)')).toBe("'@SUM(A1)");
  });
  it('leaves real numbers alone, negative ones included', () => {
    expect(escapeCsv(-2.5)).toBe('-2.5');
  });
});

describe('toCsv', () => {
  it('writes a header then rows', () => {
    expect(toCsv(['A', 'B'], [[1, 2], ['x,y', 3]])).toBe('A,B\n1,2\n"x,y",3');
  });
});

describe('setsToCsv', () => {
  const rows = [{ date: '2026-05-20', workout: 'Push', exercise: 'Bench', setNumber: 1, weightKg: 100, reps: 5, rpe: 8, isWarmup: false, note: 'felt strong' }];
  it('includes a unit-labelled weight header and converts', () => {
    const kg = setsToCsv(rows, 'kg');
    expect(kg.split('\n')[0]).toContain('Weight (kg)');
    expect(kg.split('\n')[1]).toContain('100');
    const lb = setsToCsv(rows, 'lbs');
    expect(lb.split('\n')[0]).toContain('Weight (lbs)');
    expect(lb).toContain('220.46'); // 100kg → lbs
  });
  it('warmup renders as yes/blank and empty set → header only', () => {
    expect(setsToCsv([{ ...rows[0], isWarmup: true }], 'kg').split('\n')[1]).toContain('yes');
    expect(setsToCsv([], 'kg').split('\n')).toHaveLength(1);
  });
  it('has cardio columns, blank for lifts', () => {
    const csv = setsToCsv([
      rows[0],
      { date: '2026-05-20', workout: 'Push', exercise: 'Treadmill', setNumber: 1, weightKg: null, reps: null, durationSec: 930, distanceKm: 2.123, calories: 180.4 },
    ], 'kg').split('\n');
    expect(csv[0]).toBe('Date,Workout,Exercise,Set,Weight (kg),Reps,RPE,Warmup,Note,Duration (min),Distance (km),Calories (kcal)');
    expect(csv[1].endsWith('felt strong,,,')).toBe(true);
    expect(csv[2]).toBe('2026-05-20,Push,Treadmill,1,,,,,,15.5,2.12,180');
  });
  it('the BOM is a single U+FEFF', () => {
    expect(CSV_BOM).toHaveLength(1);
    expect(CSV_BOM.charCodeAt(0)).toBe(0xfeff);
  });
});

describe('buildSetRows', () => {
  const exercises = [{ id: 3, name: 'Bench' }, { id: 60, name: 'Squat' }, { id: 75, name: 'Treadmill' }];

  it('keeps each session\'s exercises together, in the order they were done', () => {
    const workouts = [{ id: 1, date: '2026-09-01', name: 'Legs + Push', createdAt: 100 }];
    // Squat (id 60) done first, so its sets have the lower ids.
    const sets = [];
    let id = 1;
    for (const ex of [60, 3]) for (let n = 1; n <= 3; n++) sets.push({ id: id++, workoutId: 1, exerciseId: ex, setNumber: n, weight: 50, reps: 5 });
    const order = buildSetRows({ sets: [...sets].reverse(), workouts, exercises }).map((r) => `${r.exercise}${r.setNumber}`);
    expect(order).toEqual(['Squat1', 'Squat2', 'Squat3', 'Bench1', 'Bench2', 'Bench3']);
  });

  it('keeps two sessions on one day apart, in the order they happened', () => {
    const workouts = [
      { id: 7, date: '2026-09-01', name: 'Evening', createdAt: 2000 },
      { id: 6, date: '2026-09-01', name: 'Morning', createdAt: 1000 },
      { id: 5, date: '2026-08-31', name: 'Yesterday', createdAt: 9000 },
    ];
    const sets = [
      { id: 30, workoutId: 7, exerciseId: 3, setNumber: 1 },
      { id: 20, workoutId: 6, exerciseId: 3, setNumber: 1 },
      { id: 21, workoutId: 6, exerciseId: 3, setNumber: 2 },
      { id: 31, workoutId: 7, exerciseId: 3, setNumber: 2 },
      { id: 10, workoutId: 5, exerciseId: 60, setNumber: 1 },
    ];
    expect(buildSetRows({ sets, workouts, exercises }).map((r) => r.workout)).toEqual(['Yesterday', 'Morning', 'Morning', 'Evening', 'Evening']);
  });

  it('carries cardio duration, distance and calories, and no weight', () => {
    const [row] = buildSetRows({
      sets: [{ id: 1, workoutId: 1, exerciseId: 75, setNumber: 1, isCardio: true, weight: 0, reps: 0, durationSec: 600, distanceKm: 1.5, calories: 90 }],
      workouts: [{ id: 1, date: '2026-09-01', name: 'Cardio' }],
      exercises,
    });
    expect(row).toMatchObject({ exercise: 'Treadmill', weightKg: null, reps: null, durationSec: 600, distanceKm: 1.5, calories: 90 });
  });
});
