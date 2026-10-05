import { describe, it, expect } from 'vitest';
import { buildExerciseHistory, setChipLabel, recordLabel } from './exerciseHistory.js';

const W = (id, date, createdAt = 0, name = 'Push') => ({ id, date, createdAt, name });
let sid = 0;
const S = (workoutId, setNumber, weight, reps, extra = {}) => ({ id: ++sid, workoutId, exerciseId: 7, setNumber, weight, reps, isWarmup: false, ...extra });

describe('buildExerciseHistory', () => {
  const workouts = [W(1, '2026-09-01', 10), W(2, '2026-09-04', 20), W(3, '2026-09-08', 30)];
  const sets = [
    // Session 1: first ever — its best sets are the first records.
    S(1, 1, 40, 10, { isWarmup: true }),
    S(1, 2, 60, 8),
    S(1, 3, 60, 8),
    // Session 2: heavier (weight + volume record), fewer reps.
    S(2, 2, 65, 6),
    S(2, 1, 30, 12, { isWarmup: true }),
    S(2, 3, 62.5, 8),
    // Session 3: lighter — no records at all.
    S(3, 1, 55, 8),
  ];
  const h = buildExerciseHistory(sets, workouts);

  it('returns sessions newest first with their dates', () => {
    expect(h.map((s) => s.date)).toEqual(['2026-09-08', '2026-09-04', '2026-09-01']);
    expect(h[0].workoutId).toBe(3);
  });

  it('orders sets within a session by set number', () => {
    expect(h[1].sets.map((s) => s.setNumber)).toEqual([1, 2, 3]);
  });

  it('marks the set that set each record, mirroring the finish screen', () => {
    const first = h[2].sets;
    expect(first[0].records).toEqual([]); // warm-up never counts
    expect(first[1].records.sort()).toEqual(['reps', 'volume', 'weight']);
    expect(first[2].records).toEqual([]); // a tie is not a new record

    const second = h[1].sets;
    expect(second.find((s) => s.weight === 65).records.sort()).toEqual(['weight']);
    // 62.5×8 = 500 beats 60×8 = 480 → the volume record moves to it.
    expect(second.find((s) => s.weight === 62.5).records).toEqual(['volume']);

    expect(h[0].sets[0].records).toEqual([]);
  });

  it('a lb-rounding repeat of the best is not a record', () => {
    const r = buildExerciseHistory([S(1, 1, 77.5, 5), S(2, 1, 77.50079, 5)], workouts);
    expect(r[1].sets[0].records).toContain('weight');
    expect(r[0].sets[0].records).toEqual([]);
  });

  it('drops sets whose workout is gone', () => {
    const r = buildExerciseHistory([...sets, S(99, 1, 200, 1)], workouts);
    expect(r.map((s) => s.workoutId)).toEqual([3, 2, 1]);
  });

  it('orders two sessions on one day by save time', () => {
    const r = buildExerciseHistory([S(5, 1, 50, 5), S(6, 1, 50, 5)], [W(5, '2026-09-10', 200), W(6, '2026-09-10', 100)]);
    expect(r.map((s) => s.workoutId)).toEqual([5, 6]);
  });

  it('handles nothing', () => {
    expect(buildExerciseHistory([], [])).toEqual([]);
    expect(buildExerciseHistory(undefined, undefined)).toEqual([]);
  });
});

describe('setChipLabel', () => {
  it('weight × reps in the display unit', () => {
    expect(setChipLabel({ weight: 77.5, reps: 8 }, 'kg')).toBe('77.5×8');
    expect(setChipLabel({ weight: 100, reps: 5 }, 'kg')).toBe('100×5');
    expect(setChipLabel({ weight: 61.234949, reps: 5 }, 'lbs')).toBe('135×5');
  });

  it('bodyweight and cardio', () => {
    expect(setChipLabel({ weight: 0, reps: 12 })).toBe('BW×12');
    expect(setChipLabel({ isCardio: true, durationSec: 900, distanceKm: 2 })).toBe('15:00 · 2 km');
    expect(setChipLabel({ isCardio: true })).toBe('Cardio');
  });
});

describe('recordLabel', () => {
  it('names the records a set holds', () => {
    expect(recordLabel(['weight'])).toBe('Weight record');
    expect(recordLabel(['weight', 'volume'])).toBe('Weight & volume record');
    expect(recordLabel(['weight', 'reps', 'volume'])).toBe('Weight, reps & volume record');
    expect(recordLabel([])).toBe('');
  });
});
