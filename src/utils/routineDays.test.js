import { describe, it, expect } from 'vitest';
import { routineForDay, planByDay, ownsItsDay, weekdayConflicts, describeConflicts, DAY_SHORT, WEEK_ORDER } from './routineDays.js';

const T = (id, dayOfWeek, createdAt, name = `R${id}`) => ({ id, dayOfWeek, createdAt, name });

describe('routineForDay / planByDay', () => {
  // Two routines on Monday: the program installed later (id 3) must win.
  const templates = [T(1, 1, 100, 'Push'), T(2, 3, 110, 'Pull'), T(3, 1, 500, 'Workout A'), T(4, null, 600)];

  it('the newest routine owns a shared weekday', () => {
    expect(routineForDay(templates, 1).name).toBe('Workout A');
    expect(routineForDay(templates, 3).name).toBe('Pull');
    expect(routineForDay(templates, 5)).toBeNull();
  });

  it('is independent of list order', () => {
    expect(routineForDay([...templates].reverse(), 1).id).toBe(3);
    expect(planByDay([...templates].reverse())[1].id).toBe(3);
  });

  it('breaks createdAt ties by id', () => {
    expect(routineForDay([T(7, 2, 100), T(8, 2, 100)], 2).id).toBe(8);
  });

  it('maps every assigned weekday once, ignoring unassigned and invalid days', () => {
    const plan = planByDay([...templates, T(9, 7, 1), T(10, undefined, 1)]);
    expect(Object.keys(plan).map(Number).sort()).toEqual([1, 3]);
  });

  it('knows when a routine is shadowed on its own day', () => {
    expect(ownsItsDay(templates[0], templates)).toBe(false);
    expect(ownsItsDay(templates[2], templates)).toBe(true);
    expect(ownsItsDay(templates[3], templates)).toBe(false);
  });
});

describe('weekdayConflicts', () => {
  const templates = [T(1, 1, 1, 'Push'), T(2, 3, 2, 'Pull'), T(3, 5, 3, 'Legs'), T(4, 0, 4, 'Yoga')];

  it('lists the routines on the requested days, Monday first', () => {
    const c = weekdayConflicts(templates, [5, 1, 2]);
    expect(c.map((x) => [x.dayOfWeek, x.template.name])).toEqual([[1, 'Push'], [5, 'Legs']]);
  });

  it('puts Sunday last', () => {
    expect(weekdayConflicts(templates, [0, 1]).map((x) => x.dayOfWeek)).toEqual([1, 0]);
  });

  it('ignores the routine being edited', () => {
    expect(weekdayConflicts(templates, [1], { exclude: [1] })).toEqual([]);
  });

  it('is empty when the days are free', () => {
    expect(weekdayConflicts(templates, [2, 4, 6])).toEqual([]);
    expect(weekdayConflicts([], [1, 2])).toEqual([]);
  });

  it('describes them for a confirm dialog', () => {
    expect(describeConflicts(weekdayConflicts(templates, [1, 3]))).toBe('Mon (Push), Wed (Pull)');
  });
});

describe('labels', () => {
  it('index like Date.getDay and order the week from Monday', () => {
    expect(DAY_SHORT[0]).toBe('Sun');
    expect(WEEK_ORDER).toEqual([1, 2, 3, 4, 5, 6, 0]);
  });
});
