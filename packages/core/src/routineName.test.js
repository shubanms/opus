import { describe, it, expect } from 'vitest';
import { deriveRoutineName } from './routineName.js';

describe('deriveRoutineName', () => {
  it('names a single-muscle-dominant session after that muscle', () => {
    expect(deriveRoutineName({ chest: 5 })).toEqual({ name: 'Chest Day', autoKey: 'chest' });
    expect(deriveRoutineName({ quadriceps: 4 })).toEqual({ name: 'Quads Day', autoKey: 'quadriceps' });
  });

  it('names a spread push session "Push Day"', () => {
    // chest + front delts + triceps, none dominating → the split name.
    const r = deriveRoutineName({ chest: 3, 'front-deltoids': 2, triceps: 2 });
    expect(r).toEqual({ name: 'Push Day', autoKey: 'push' });
  });

  it('names a spread pull session "Pull Day"', () => {
    const r = deriveRoutineName({ 'upper-back': 3, biceps: 3, trapezius: 2 });
    expect(r).toEqual({ name: 'Pull Day', autoKey: 'pull' });
  });

  it('names a spread leg session "Leg Day"', () => {
    const r = deriveRoutineName({ quadriceps: 4, hamstring: 3, gluteal: 2 });
    expect(r).toEqual({ name: 'Leg Day', autoKey: 'legs' });
  });

  it('keeps a dominant muscle name even within a group', () => {
    // chest overwhelmingly dominates the push group → "Chest Day", not Push Day.
    const r = deriveRoutineName({ chest: 8, triceps: 1 });
    expect(r).toEqual({ name: 'Chest Day', autoKey: 'chest' });
  });

  it('calls a push+pull session "Upper Body"', () => {
    const r = deriveRoutineName({ chest: 4, 'upper-back': 4 });
    expect(r).toEqual({ name: 'Upper Body', autoKey: 'upper' });
  });

  it('calls a push+pull+legs session "Full Body"', () => {
    const r = deriveRoutineName({ chest: 3, 'upper-back': 3, quadriceps: 3 });
    expect(r).toEqual({ name: 'Full Body', autoKey: 'full-body' });
  });

  it('names a core-only session "Core Day"', () => {
    const r = deriveRoutineName({ abs: 4, obliques: 2 });
    expect(r).toEqual({ name: 'Core Day', autoKey: 'core' });
  });

  it('accepts an array of {muscle,count}', () => {
    const r = deriveRoutineName([{ muscle: 'chest', count: 5 }]);
    expect(r).toEqual({ name: 'Chest Day', autoKey: 'chest' });
  });

  it('is stable for the same group across sessions (re-match key)', () => {
    // Two different chest sessions must share an autoKey so the routine updates
    // rather than duplicating.
    const a = deriveRoutineName({ chest: 5 });
    const b = deriveRoutineName({ chest: 6, triceps: 1 });
    expect(a.autoKey).toBe(b.autoKey);
  });

  it('handles empty / zero input', () => {
    expect(deriveRoutineName({})).toEqual({ name: 'Workout', autoKey: null });
    expect(deriveRoutineName({ chest: 0 })).toEqual({ name: 'Workout', autoKey: null });
    expect(deriveRoutineName(null)).toEqual({ name: 'Workout', autoKey: null });
  });
});
