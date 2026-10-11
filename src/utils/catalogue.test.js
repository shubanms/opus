import { describe, it, expect } from 'vitest';
import {
  CARDIO_EXERCISES,
  PLACEHOLDER_NAME,
  STOCK_BY_ID,
  STOCK_MAX_ID,
  cardioRow,
  isPristineStock,
  orphanEvidence,
  planOrphanRepair,
} from './catalogue.js';

const treadmillSet = (exerciseId) => ({ exerciseId, isCardio: true, speedKmh: 8, incline: 2, durationSec: 600 });
const timedSet = (exerciseId) => ({ exerciseId, isCardio: true, speedKmh: null, incline: null, durationSec: 600 });
const liftSet = (exerciseId, weight = 50) => ({ exerciseId, weight, reps: 8 });
const stock = (ids) => ids.map((id) => ({ ...STOCK_BY_ID.get(id) }));
const allStock = () => stock([...STOCK_BY_ID.keys()]);
const plan = (sets, existing, orphanIds = [...new Set(sets.map((s) => s.exerciseId))]) =>
  planOrphanRepair({ orphanIds, evidence: orphanEvidence(sets), existing });

describe('the stock catalogue', () => {
  it('has stable ids 1–74', () => {
    expect(STOCK_MAX_ID).toBe(74);
    expect(STOCK_BY_ID.get(3).name).toBe('Bench Press');
  });
});

describe('isPristineStock', () => {
  it('is true only for an untouched stock row', () => {
    expect(isPristineStock({ ...STOCK_BY_ID.get(3) })).toBe(true);
    // Toggled on and back off: nothing of the user's left on it.
    expect(isPristineStock({ ...STOCK_BY_ID.get(3), favorite: false, color: null })).toBe(true);
  });

  it('keeps anything carrying user state, or not exactly the seed', () => {
    expect(isPristineStock({ ...STOCK_BY_ID.get(3), favorite: true })).toBe(false);
    expect(isPristineStock({ ...STOCK_BY_ID.get(3), color: '#8B7DFF' })).toBe(false);
    expect(isPristineStock({ ...STOCK_BY_ID.get(3), name: 'Flat Bench' })).toBe(false);
    expect(isPristineStock({ ...STOCK_BY_ID.get(3), isCustom: true })).toBe(false);
    // A field from a later version is kept by default, not lost by default.
    expect(isPristineStock({ ...STOCK_BY_ID.get(3), hidden: true })).toBe(false);
  });

  it('never treats cardio or custom rows as stock', () => {
    expect(isPristineStock(cardioRow(CARDIO_EXERCISES[0], 75))).toBe(false);
    expect(isPristineStock({ id: 83, name: 'Landmine Press', isCustom: true })).toBe(false);
    expect(isPristineStock(null)).toBe(false);
  });
});

describe('orphanEvidence', () => {
  it('reads treadmill bouts, timed bouts and lifts apart', () => {
    const ev = orphanEvidence([treadmillSet(75), timedSet(78), liftSet(90), liftSet(91, 0), { exerciseId: null }]);
    expect(ev.get(75)).toMatchObject({ cardio: true, treadmill: true, met: false });
    expect(ev.get(78)).toMatchObject({ cardio: true, treadmill: false, met: true });
    expect(ev.get(90)).toMatchObject({ cardio: false, strength: true, loaded: true });
    expect(ev.get(91)).toMatchObject({ strength: true, loaded: false });
    expect(ev.size).toBe(4);
  });

  it('counts an incline of 0 as a treadmill bout', () => {
    expect(orphanEvidence([{ exerciseId: 76, isCardio: true, speedKmh: 5, incline: 0 }]).get(76).treadmill).toBe(true);
  });
});

describe('planOrphanRepair', () => {
  it('nothing orphaned, nothing to do', () => {
    expect(planOrphanRepair({ orphanIds: [], existing: allStock() })).toEqual({ create: [], remap: [], blockStart: null });
  });

  it('rebuilds a late installer\'s cardio straight after the stock seed', () => {
    const p = plan([treadmillSet(77), timedSet(79)], allStock());
    expect(p.blockStart).toBe(75);
    expect(p.create.map((r) => [r.id, r.name])).toEqual([[77, 'Running'], [79, 'Rowing Machine']]);
    expect(p.create[0]).toEqual(cardioRow(CARDIO_EXERCISES[2], 77));
  });

  it('skips past an early installer\'s custom lifts', () => {
    const existing = [...allStock(), { id: 75, name: 'Early 1', isCustom: true }, { id: 76, name: 'Early 2', isCustom: true }];
    const p = plan([treadmillSet(79), timedSet(81)], existing);
    expect(p.blockStart).toBe(77);
    expect(p.create.map((r) => [r.id, r.name])).toEqual([[79, 'Running'], [81, 'Rowing Machine']]);
  });

  it('puts treadmill bouts on treadmill machines and timed bouts on the rest', () => {
    // The same id lands differently depending on what was logged against it.
    const timed = plan([timedSet(80)], allStock());
    expect(timed.blockStart).toBe(75);
    expect(timed.create[0]).toMatchObject({ id: 80, name: 'Elliptical', cardioMode: 'met' });
    const treadmill = plan([treadmillSet(80)], allStock());
    expect(treadmill.blockStart).toBe(78);
    expect(treadmill.create[0]).toMatchObject({ id: 80, name: 'Running', cardioMode: 'treadmill' });
  });

  it('evidence no legal block can explain gets a placeholder, not a guess', () => {
    // From 75, id 77 is always a treadmill machine — a timed bout cannot be one.
    const p = plan([timedSet(77)], allStock());
    expect(p.blockStart).toBeNull();
    expect(p.create[0]).toMatchObject({ id: 77, name: PLACEHOLDER_NAME, equipment: 'cardio', cardioMode: 'met' });
  });

  it('leaves out a machine whose name a custom lift already had when the block was made', () => {
    // A custom "Running" at 75 meant the by-name insert skipped Running, so
    // Cycling sat one place earlier than usual.
    const existing = [...allStock(), { id: 75, name: 'Running', isCustom: true, equipment: 'machine' }];
    const p = plan([treadmillSet(77), timedSet(78)], existing);
    expect(p.blockStart).toBe(76);
    expect(p.create.map((r) => [r.id, r.name])).toEqual([[77, 'Walking'], [78, 'Cycling']]);
  });

  it('points old ids at a machine that was re-created elsewhere, instead of a second copy', () => {
    const existing = [...allStock(), { id: 83, name: 'Mine', isCustom: true }];
    CARDIO_EXERCISES.forEach((c, i) => existing.push(cardioRow(c, 84 + i)));
    const p = plan([treadmillSet(75), timedSet(78)], existing);
    expect(p.create).toEqual([]);
    expect(p.remap).toEqual([{ from: 75, to: 84 }, { from: 78, to: 87 }]);
  });

  it('a routine-only reference (no bouts logged) is placed when the block can hold every orphan', () => {
    const p = plan([], allStock(), [75, 80]);
    expect(p.create.map((r) => [r.id, r.name])).toEqual([[75, 'Treadmill'], [80, 'Elliptical']]);
  });

  it('never makes a lift into a cardio machine', () => {
    const p = plan([treadmillSet(75), liftSet(76)], allStock());
    // 76 is inside every block that could hold 75, so no block is consistent.
    expect(p.blockStart).toBeNull();
    expect(p.create.map((r) => [r.id, r.name, r.equipment])).toEqual([
      [75, `${PLACEHOLDER_NAME} 1`, 'cardio'],
      [76, `${PLACEHOLDER_NAME} 2`, 'machine'],
    ]);
  });

  it('anything unidentifiable becomes an editable placeholder at its own id', () => {
    const p = plan([liftSet(120), liftSet(121, 0)], allStock());
    expect(p.create).toHaveLength(2);
    for (const row of p.create) {
      expect(row).toMatchObject({ isCustom: true, restored: true, muscleGroup: 'upper-back' });
    }
    expect(p.create.find((r) => r.id === 121).equipment).toBe('bodyweight');
    // One placeholder is just "Restored exercise".
    expect(plan([liftSet(120)], allStock()).create[0].name).toBe(PLACEHOLDER_NAME);
  });

  it('cardio evidence spread wider than one block cannot be placed', () => {
    const p = plan([treadmillSet(75), timedSet(95)], allStock());
    expect(p.blockStart).toBeNull();
    expect(p.create.every((r) => r.muscleGroup === 'cardio' && r.isCustom)).toBe(true);
    expect(p.create.find((r) => r.id === 75).cardioMode).toBe('treadmill');
    expect(p.create.find((r) => r.id === 95).cardioMode).toBe('met');
  });

  it('ignores ids that cannot be row keys', () => {
    expect(planOrphanRepair({ orphanIds: [null, 0, -3, 1.5, 'x'] }).create).toEqual([]);
  });
});
