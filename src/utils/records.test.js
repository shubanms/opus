import { describe, it, expect } from 'vitest';
import { beats, bestSetFor, isRecordSet, recordValue, recordsFromSets } from './records.js';
import { toDisplay, toKg } from './units.js';

describe('beats', () => {
  it('a first record only needs to be above zero', () => {
    expect(beats(60, null, 'weight')).toBe(true);
    expect(beats(0, null, 'weight')).toBe(false);
    expect(beats(5, undefined, 'reps')).toBe(true);
  });
  it('a strict improvement beats', () => {
    expect(beats(80, 77.5, 'weight')).toBe(true);
    expect(beats(9, 8, 'reps')).toBe(true);
  });
  it('tying is not a record', () => {
    expect(beats(77.5, 77.5, 'weight')).toBe(false);
    expect(beats(8, 8, 'reps')).toBe(false);
  });
  it('a pound round trip of your best is not a new record', () => {
    // 77.5 kg shown in lb (2 dp), logged back unchanged.
    const roundTrip = toKg(toDisplay(77.5, 'lbs'), 'lbs');
    expect(roundTrip).not.toBe(77.5);
    expect(beats(roundTrip, 77.5, 'weight')).toBe(false);
    expect(beats(roundTrip * 8, 77.5 * 8, 'volume')).toBe(false);
  });
  it('the smallest real step still counts', () => {
    expect(beats(77.75, 77.5, 'weight')).toBe(true);
    expect(beats(toKg(171.5, 'lbs'), toKg(171, 'lbs'), 'weight')).toBe(true);
  });
});

describe('isRecordSet', () => {
  it('excludes warm-ups, cardio and zero-rep sets', () => {
    expect(isRecordSet({ weight: 60, reps: 5 })).toBe(true);
    expect(isRecordSet({ weight: 60, reps: 5, isWarmup: true })).toBe(false);
    expect(isRecordSet({ weight: 0, reps: 0, isCardio: true })).toBe(false);
    expect(isRecordSet({ weight: 100, reps: 0 })).toBe(false);
    expect(isRecordSet(null)).toBe(false);
  });
});

describe('recordValue', () => {
  it('scores each record type', () => {
    const s = { weight: 60, reps: 8 };
    expect(recordValue(s, 'weight')).toBe(60);
    expect(recordValue(s, 'reps')).toBe(8);
    expect(recordValue(s, 'volume')).toBe(480);
  });
});

describe('bestSetFor', () => {
  const sets = [
    { id: 1, workoutId: 10, weight: 60, reps: 8, completedAt: 1000 },
    { id: 2, workoutId: 11, weight: 70, reps: 5, completedAt: 2000 },
    { id: 3, workoutId: 12, weight: 70, reps: 5, completedAt: 3000 },
    { id: 4, workoutId: 12, weight: 90, reps: 1, isWarmup: true, completedAt: 3000 },
    { id: 5, workoutId: 13, weight: 120, reps: 0, completedAt: 4000 },
  ];
  it('takes the first set to reach the best value, not the latest', () => {
    const b = bestSetFor(sets, 'weight');
    expect(b.value).toBe(70);
    expect(b.set.id).toBe(2);
    expect(b.achievedAt).toBe(2000);
  });
  it('ignores warm-ups and zero-rep sets', () => {
    expect(bestSetFor(sets, 'weight').value).toBe(70);
  });
  it('reps and volume pick their own holders', () => {
    expect(bestSetFor(sets, 'reps').set.id).toBe(1);
    expect(bestSetFor(sets, 'volume').set.id).toBe(1); // 480 > 350
  });
  it('a later lb round-trip repeat does not steal the date', () => {
    const lb = toKg(toDisplay(70, 'lbs'), 'lbs');
    const withRepeat = [...sets, { id: 6, workoutId: 14, weight: lb, reps: 5, completedAt: 5000 }];
    expect(bestSetFor(withRepeat, 'weight').set.id).toBe(2);
  });
  it('falls back to the workout time when a set has none', () => {
    const b = bestSetFor([{ workoutId: 7, weight: 50, reps: 5 }], 'weight', (id) => (id === 7 ? 777 : 0));
    expect(b.achievedAt).toBe(777);
  });
  it('returns null when nothing qualifies', () => {
    expect(bestSetFor([], 'weight')).toBeNull();
    expect(bestSetFor([{ weight: 0, reps: 10 }], 'weight')).toBeNull();
  });
});

describe('recordsFromSets', () => {
  it('builds one row per record type, dated and linked to the set that set it', () => {
    const rows = recordsFromSets(3, [
      { workoutId: 1, weight: 100, reps: 5, completedAt: 100 },
      { workoutId: 2, weight: 90, reps: 8, completedAt: 200 },
    ]);
    expect(rows).toEqual([
      { exerciseId: 3, type: 'weight', value: 100, achievedAt: 100, workoutId: 1 },
      { exerciseId: 3, type: 'reps', value: 8, achievedAt: 200, workoutId: 2 },
      { exerciseId: 3, type: 'volume', value: 720, achievedAt: 200, workoutId: 2 },
    ]);
  });
  it('a bodyweight lift has reps but no weight record', () => {
    const rows = recordsFromSets(4, [{ workoutId: 1, weight: 0, reps: 12, completedAt: 1 }]);
    expect(rows.map((r) => r.type)).toEqual(['reps']);
  });
});
