import { describe, it, expect } from 'vitest';
import {
  decideProgression, PROGRESSION_DEFAULTS, stepInUnit, gridInUnit, stepLabel,
  raiseTarget, deloadTarget, completedPrescription, AT_TARGET_KG,
} from './progression.js';
import { toDisplay, toKg } from './units.js';

const sets = (reps, weight, n = 3) => Array.from({ length: n }, () => ({ reps, weight }));
const linear = { mode: 'linear', weightStep: 2.5, deloadAfterMisses: 2 };

describe('decideProgression', () => {
  it('does nothing when mode is off', () => {
    const r = decideProgression({ targetWeight: 100, targetReps: 5, targetSets: 3 }, sets(5, 100), { mode: 'off' });
    expect(r.action).toBe('off');
    expect(r.targetWeight).toBe(100);
  });

  it('does nothing with no working sets', () => {
    expect(decideProgression({ targetWeight: 100 }, [], { mode: 'linear' }).action).toBe('off');
  });

  it('bumps weight by the step when all sets hit target reps at weight', () => {
    const r = decideProgression({ targetWeight: 100, targetReps: 5, targetSets: 3 }, sets(5, 100), { mode: 'linear' });
    expect(r.action).toBe('increase');
    expect(r.targetWeight).toBe(102.5);
    expect(r.misses).toBe(0);
  });

  it('holds and counts a miss when reps fall short (linear)', () => {
    const r = decideProgression({ targetWeight: 100, targetReps: 5, targetSets: 3, misses: 0 }, sets(4, 100), { mode: 'linear' });
    expect(r.action).toBe('hold');
    expect(r.targetWeight).toBe(100);
    expect(r.misses).toBe(1);
  });

  it('deloads 10% after the configured consecutive misses (linear)', () => {
    const r = decideProgression({ targetWeight: 100, targetReps: 5, targetSets: 3, misses: 1 }, sets(4, 100), { mode: 'linear', deloadAfterMisses: 2 });
    expect(r.action).toBe('deload');
    expect(r.targetWeight).toBe(90);
    expect(r.misses).toBe(0);
  });

  it('double progression holds on a miss and never deloads', () => {
    const r = decideProgression({ targetWeight: 100, targetReps: 8, targetSets: 3, misses: 5 }, sets(6, 100), { mode: 'double' });
    expect(r.action).toBe('hold');
    expect(r.targetWeight).toBe(100);
    expect(r.misses).toBe(0);
  });

  it('progresses reps (not weight) for a bodyweight target', () => {
    const r = decideProgression({ targetWeight: 0, targetReps: 10, targetSets: 3 }, sets(10, 0), { mode: 'linear' });
    expect(r.action).toBe('increase');
    expect(r.targetWeight).toBe(0);
    expect(r.targetReps).toBe(11);
  });

  it('needs enough sets, not just enough reps', () => {
    const r = decideProgression({ targetWeight: 100, targetReps: 5, targetSets: 4 }, sets(5, 100, 2), { mode: 'linear' });
    expect(r.action).toBe('hold');
  });

  it('uses a custom weight step', () => {
    const r = decideProgression({ targetWeight: 60, targetReps: 8, targetSets: 3 }, sets(8, 60), { mode: 'linear', weightStep: 5 });
    expect(r.targetWeight).toBe(65);
  });

  it('exposes sane defaults', () => {
    expect(PROGRESSION_DEFAULTS).toMatchObject({ mode: 'off', weightStep: 2.5, deloadAfterMisses: 2 });
  });
});

describe('pass/fail counts sets at the target, not "some set touched it"', () => {
  const target = { targetSets: 5, targetReps: 5, targetWeight: 100 };

  it('one top set plus four light back-offs is a miss', () => {
    const r = decideProgression(target, [{ weight: 100, reps: 5 }, ...sets(5, 60, 4)], linear);
    expect(r.action).toBe('hold');
    expect(r.targetWeight).toBe(100);
    expect(r.misses).toBe(1);
  });

  it('a full 5×5 plus an extra back-off triple at the same weight is a pass', () => {
    const r = decideProgression(target, [...sets(5, 100, 5), { weight: 100, reps: 3 }], linear);
    expect(r.action).toBe('increase');
    expect(r.targetWeight).toBe(102.5);
  });

  it('a full 5×5 plus a lighter back-off set is a pass', () => {
    const r = decideProgression(target, [...sets(5, 100, 5), { weight: 60, reps: 4 }], linear);
    expect(r.action).toBe('increase');
  });

  it('four good sets out of five is a miss', () => {
    const r = decideProgression(target, [...sets(5, 100, 4), { weight: 100, reps: 4 }], linear);
    expect(r.action).toBe('hold');
  });

  it('heavier than the target still counts, and the next step starts from what was done', () => {
    const r = decideProgression(target, sets(5, 105, 5), linear);
    expect(r.action).toBe('increase');
    expect(r.targetWeight).toBe(107.5);
  });

  it('one heavy single on top of the prescription does not inflate the next target', () => {
    const r = decideProgression(target, [{ weight: 110, reps: 5 }, ...sets(5, 100, 4)], linear);
    expect(r.targetWeight).toBe(102.5);
  });

  it('allows kg↔lb rounding below the target', () => {
    expect(completedPrescription(sets(5, 100 - AT_TARGET_KG / 2, 5), target)).toBe(true);
    expect(completedPrescription(sets(5, 100 - 0.05, 5), target)).toBe(false);
  });
});

describe('a session with no target yet sets the baseline', () => {
  it('adopts the top weight without counting a miss', () => {
    const r = decideProgression(
      { targetSets: 5, targetReps: 5, targetWeight: null },
      [{ weight: 60, reps: 5 }, { weight: 70, reps: 5 }, { weight: 80, reps: 5 }],
      linear,
    );
    expect(r).toMatchObject({ action: 'hold', targetWeight: 80, misses: 0 });
  });

  it('progresses straight away when the prescription was completed', () => {
    const r = decideProgression({ targetSets: 5, targetReps: 5, targetWeight: null }, sets(5, 60, 5), linear);
    expect(r).toMatchObject({ action: 'increase', targetWeight: 62.5 });
  });
});

describe('units and plates', () => {
  it('steps in the user unit: 2.5 kg ↔ 5 lb, 5 kg ↔ 10 lb, small steps ↔ 2.5 lb', () => {
    expect(stepInUnit(2.5, 'kg')).toBe(2.5);
    expect(stepInUnit(2.5, 'lbs')).toBe(5);
    expect(stepInUnit(5, 'lbs')).toBe(10);
    expect(stepInUnit(1, 'lbs')).toBe(2.5);
    expect(stepInUnit(1.25, 'lbs')).toBe(2.5);
    expect(stepInUnit(undefined, 'kg')).toBe(2.5);
  });

  it('labels the step the way the user loads it', () => {
    expect(stepLabel(2.5, 'kg')).toBe('+2.5 kg');
    expect(stepLabel(2.5, 'lbs')).toBe('+5 lb');
    expect(stepLabel(5, 'kg')).toBe('+5 kg');
  });

  it('uses the finer of the plate grid and the step', () => {
    expect(gridInUnit(2.5, 'kg')).toBe(2.5);
    expect(gridInUnit(5, 'kg')).toBe(2.5);
    expect(gridInUnit(1, 'kg')).toBe(1);
    expect(gridInUnit(2.5, 'lbs')).toBe(5);
    expect(gridInUnit(1, 'lbs')).toBe(2.5);
  });

  it('a lbs lifter at 135 goes 140 → 145 → 150, and the shown number is always a pass', () => {
    let t = toKg(135, 'lbs');
    const seen = [];
    for (let i = 0; i < 3; i++) {
      const shown = toDisplay(t, 'lbs');
      // Log exactly what the screen shows, for every set.
      const next = decideProgression(
        { targetSets: 3, targetReps: 5, targetWeight: t },
        sets(5, toKg(shown, 'lbs'), 3),
        linear,
        { unit: 'lbs' },
      );
      expect(next.action).toBe('increase');
      t = next.targetWeight;
      seen.push(toDisplay(t, 'lbs'));
    }
    expect(seen).toEqual([140, 145, 150]);
  });

  it('pulls an off-grid lbs target (140.5 lb) back onto the 5 lb grid when raising', () => {
    const next = raiseTarget(toKg(140.5, 'lbs'), 2.5, 'lbs');
    expect(toDisplay(next, 'lbs')).toBe(145);
  });

  it('logging the displayed value of any grid target never reads as under it', () => {
    for (let lb = 45; lb <= 600; lb += 5) {
      const target = raiseTarget(toKg(lb - 5, 'lbs'), 2.5, 'lbs');
      expect(toDisplay(target, 'lbs')).toBe(lb);
      expect(completedPrescription(sets(5, toKg(toDisplay(target, 'lbs'), 'lbs'), 3), { targetSets: 3, targetReps: 5, targetWeight: target })).toBe(true);
    }
  });

  it('deloads round DOWN to a loadable weight', () => {
    expect(deloadTarget(102.5, 2.5, 'kg')).toBe(90); // 92.25 → 90
    expect(deloadTarget(122.5, 2.5, 'kg')).toBe(110); // 110.25 → 110
    expect(deloadTarget(62.5, 2.5, 'kg')).toBe(55); // 56.25 → 55
    expect(toDisplay(deloadTarget(toKg(225, 'lbs'), 2.5, 'lbs'), 'lbs')).toBe(200); // 202.5 → 200
  });

  it('has nowhere to deload to at the bottom of the grid', () => {
    expect(deloadTarget(2.5, 2.5, 'kg')).toBeNull();
    const r = decideProgression({ targetSets: 3, targetReps: 8, targetWeight: 2.5, misses: 1 }, sets(6, 2.5), linear);
    expect(r).toMatchObject({ action: 'hold', targetWeight: 2.5, misses: 0 });
  });

  it('no deload spiral: lifting the deloaded weight for every rep progresses', () => {
    // Second miss at 122.5 → deload. Then a clean 5×5 at the new target.
    const after = decideProgression({ targetSets: 5, targetReps: 5, targetWeight: 122.5, misses: 1 }, sets(4, 122.5, 5), linear);
    expect(after).toMatchObject({ action: 'deload', targetWeight: 110 });
    const next = decideProgression(after, sets(5, 110, 5), linear);
    expect(next).toMatchObject({ action: 'increase', targetWeight: 112.5, misses: 0 });
  });

  it('kg targets stay on the 2.5 grid when the scheme step is 5', () => {
    expect(raiseTarget(100, 5, 'kg')).toBe(105);
    expect(raiseTarget(101, 5, 'kg')).toBe(105); // 106 → nearest 2.5
  });
});
