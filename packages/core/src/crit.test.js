import { describe, it, expect } from 'vitest';
import { hashSeed, rollCrit, comboCount, comboMult, bonusXp, CRIT_CHANCE } from './crit.js';

describe('hashSeed', () => {
  it('is deterministic and in [0,1)', () => {
    const a = hashSeed(123, 'crit', 2);
    const b = hashSeed(123, 'crit', 2);
    expect(a).toBe(b);
    expect(a).toBeGreaterThanOrEqual(0);
    expect(a).toBeLessThan(1);
  });
  it('varies with inputs', () => {
    expect(hashSeed(1, 'crit', 1)).not.toBe(hashSeed(1, 'crit', 2));
  });
});

describe('rollCrit', () => {
  it('always crits the first working set', () => {
    expect(rollCrit({ seed: 1, setNumber: 1, first: true })).toBe(true);
  });
  it('is deterministic per (seed, setNumber) — no re-roll exploit', () => {
    const a = rollCrit({ seed: 999, setNumber: 3 });
    const b = rollCrit({ seed: 999, setNumber: 3 });
    expect(a).toBe(b);
  });
  it('respects the chance threshold (chance 0 → never, 1 → always)', () => {
    expect(rollCrit({ seed: 5, setNumber: 2, chance: 0 })).toBe(false);
    expect(rollCrit({ seed: 5, setNumber: 2, chance: 1 })).toBe(true);
  });
  it('produces roughly the expected crit rate across many sets', () => {
    let crits = 0;
    const N = 2000;
    for (let i = 0; i < N; i++) if (rollCrit({ seed: 42, setNumber: i })) crits++;
    const rate = crits / N;
    expect(rate).toBeGreaterThan(CRIT_CHANCE - 0.06);
    expect(rate).toBeLessThan(CRIT_CHANCE + 0.06);
  });
});

describe('comboCount', () => {
  it('is 1 for a single set', () => {
    expect(comboCount([1000])).toBe(1);
  });
  it('counts a run of sets within the cap', () => {
    const t = [0, 60000, 120000, 180000]; // 60s gaps
    expect(comboCount(t)).toBe(4);
  });
  it('breaks the run on a long rest', () => {
    const t = [0, 60000, 500000, 560000]; // big gap before the last two
    expect(comboCount(t)).toBe(2);
  });
  it('ignores nullish timestamps', () => {
    expect(comboCount([null, 1000, undefined])).toBe(1);
  });
});

describe('comboMult', () => {
  it('is 1 at combo 1 (no bonus)', () => {
    expect(comboMult(1)).toBe(1);
  });
  it('adds 5% per chained set', () => {
    expect(comboMult(3)).toBeCloseTo(1.1);
  });
  it('caps at +25%', () => {
    expect(comboMult(20)).toBeCloseTo(1.25);
  });
});

describe('bonusXp', () => {
  it('is 0 with no crit and no combo', () => {
    expect(bonusXp(100, { crit: false, combo: 1 })).toBe(0);
  });
  it('doubles the base on a crit (+100%)', () => {
    expect(bonusXp(100, { crit: true, combo: 1 })).toBe(100);
  });
  it('adds the combo bonus on top', () => {
    // crit (+100) + combo 3 (+10% of 100 = 10) = 110
    expect(bonusXp(100, { crit: true, combo: 3 })).toBe(110);
  });
  it('handles zero/blank base safely', () => {
    expect(bonusXp(0, { crit: true, combo: 5 })).toBe(0);
    expect(bonusXp(undefined, { crit: true })).toBe(0);
  });
});
