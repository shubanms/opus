import { describe, it, expect } from 'vitest';
import { acsmVO2, treadmillKcal, metKcal, strengthKcal, distanceKm, vo2Kcal, workoutCalories } from './calories.js';

describe('acsmVO2', () => {
  it('uses the walking equation at moderate speed', () => {
    // 5 km/h (83.33 m/min), 5% grade: 0.1*83.33 + 1.8*83.33*0.05 + 3.5
    expect(acsmVO2({ speedKmh: 5, inclinePct: 5 })).toBeCloseTo(19.33, 1);
  });
  it('adds nothing for grade on the flat', () => {
    expect(acsmVO2({ speedKmh: 5, inclinePct: 0 })).toBeCloseTo(11.83, 1);
  });
  it('switches to the running equation above ~8 km/h', () => {
    // 10 km/h (166.67 m/min), flat: 0.2*166.67 + 3.5
    expect(acsmVO2({ speedKmh: 10, inclinePct: 0 })).toBeCloseTo(36.83, 1);
  });
  it('never dips below resting VO2', () => {
    expect(acsmVO2({ speedKmh: 0, inclinePct: 0 })).toBe(3.5);
  });
});

describe('treadmillKcal', () => {
  it('estimates a 70kg incline walk in a sane range', () => {
    // 5 km/h, 5% incline, 70kg, 30 min ≈ 203 kcal
    const kcal = treadmillKcal({ speedKmh: 5, inclinePct: 5, weightKg: 70, minutes: 30 });
    expect(kcal).toBeGreaterThan(180);
    expect(kcal).toBeLessThan(230);
  });
  it('burns more with incline than flat', () => {
    const flat = treadmillKcal({ speedKmh: 5, inclinePct: 0, weightKg: 70, minutes: 30 });
    const hill = treadmillKcal({ speedKmh: 5, inclinePct: 8, weightKg: 70, minutes: 30 });
    expect(hill).toBeGreaterThan(flat);
  });
  it('scales with bodyweight and time', () => {
    const a = treadmillKcal({ speedKmh: 6, inclinePct: 3, weightKg: 60, minutes: 20 });
    const b = treadmillKcal({ speedKmh: 6, inclinePct: 3, weightKg: 90, minutes: 20 });
    expect(b).toBeGreaterThan(a);
  });
});

describe('metKcal', () => {
  it('matches the MET formula', () => {
    // 7 MET, 70kg, 30 min: 7*3.5*70/200*30 = 257.25 -> 257
    expect(metKcal({ met: 7, weightKg: 70, minutes: 30 })).toBe(257);
  });
});

describe('strengthKcal', () => {
  it('estimates lifting from duration', () => {
    expect(strengthKcal({ weightKg: 70, minutes: 45 })).toBe(metKcal({ met: 3.5, weightKg: 70, minutes: 45 }));
  });
});

describe('distanceKm', () => {
  it('is speed * time', () => {
    expect(distanceKm(6, 30)).toBeCloseTo(3, 5);
  });
});

describe('vo2Kcal', () => {
  it('is zero with no time', () => { expect(vo2Kcal(20, 70, 0)).toBe(0); });
});

describe('workoutCalories', () => {
  it('uses the stored figure when present', () => {
    expect(workoutCalories({ totalCalories: 321, duration: 3600, bodyweightKg: 80 })).toBe(321);
  });
  it('estimates from duration + bodyweight for pre-cardio history', () => {
    // no totalCalories: 45 min lifting at 70kg
    expect(workoutCalories({ duration: 45 * 60, bodyweightKg: 70 })).toBe(strengthKcal({ weightKg: 70, minutes: 45 }));
  });
  it('falls back to a nominal weight when bodyweight is unknown', () => {
    expect(workoutCalories({ duration: 30 * 60 })).toBe(strengthKcal({ weightKg: 70, minutes: 30 }));
  });
});
