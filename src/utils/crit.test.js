import { describe, it, expect } from 'vitest';
import { hashSeed, critRoll, rollCrit, comboCount, comboMult, bonusXp, setXp, CRIT_CHANCE } from './crit.js';

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
  it('never changes its output — chests and dungeons are generated from it', () => {
    // Pinned from the shipped implementation. A different number here re-rolls
    // every dungeon and loot table a person has already seen.
    expect(hashSeed(123, 'crit', 2)).toBe(0.39105581562034786);
    expect(hashSeed('2026-10-05', 'theme')).toBe(0.994933744892478);
    expect(hashSeed('2026-10-05', 'affix', 3)).toBe(0.262102612759918);
    expect(hashSeed(42, 'chest')).toBe(0.7680864701978862);
    expect(hashSeed('2026-10-05', 'gen')).toBe(0.3881254910957068);
  });
});

// A realistic spread of session seeds: `startedAt` timestamps a few hours to a
// few days apart, which is what the roll actually gets fed.
const seeds = (n) => Array.from({ length: n }, (_, k) => 1_759_000_000_000 + k * 7_919_000 + (k % 13) * 104_729);

describe('rollCrit', () => {
  it('always crits the first working set', () => {
    expect(rollCrit({ seed: 1, setNumber: 1, first: true })).toBe(true);
  });
  it('is deterministic per (seed, exercise, setNumber) — no re-roll exploit', () => {
    const a = rollCrit({ seed: 999, exerciseId: 4, setNumber: 3 });
    const b = rollCrit({ seed: 999, exerciseId: 4, setNumber: 3 });
    expect(a).toBe(b);
  });
  it('respects the chance threshold (chance 0 → never, 1 → always)', () => {
    expect(rollCrit({ seed: 5, setNumber: 2, chance: 0 })).toBe(false);
    expect(rollCrit({ seed: 5, setNumber: 2, chance: 1 })).toBe(true);
  });

  it('hits the expected rate on the set numbers people actually log', () => {
    let crits = 0;
    let rolls = 0;
    for (const seed of seeds(3000)) {
      for (let n = 1; n <= 8; n += 1) {
        rolls += 1;
        if (rollCrit({ seed, exerciseId: 7, setNumber: n })) crits += 1;
      }
    }
    expect(crits / rolls).toBeGreaterThan(CRIT_CHANCE - 0.02);
    expect(crits / rolls).toBeLessThan(CRIT_CHANCE + 0.02);
  });

  it('is not all-or-nothing within a session', () => {
    // The shipped hash critted on every one of sets 2–8 in ~11% of sessions
    // and on none of them in ~81%. Independent 15% rolls give ~0.00002% and
    // ~32%. Allow generous slack — this guards the shape, not the decimals.
    const N = 4000;
    let all = 0;
    let none = 0;
    for (const seed of seeds(N)) {
      let c = 0;
      for (let n = 2; n <= 8; n += 1) if (rollCrit({ seed, exerciseId: 12, setNumber: n })) c += 1;
      if (c === 7) all += 1;
      if (c === 0) none += 1;
    }
    expect(all / N).toBeLessThan(0.005);
    expect(none / N).toBeGreaterThan(0.25);
    expect(none / N).toBeLessThan(0.4);
  });

  it('gives each exercise in a session its own pattern', () => {
    // Without the exercise in the roll, set 3 of every lift in a session
    // critted together.
    let differs = 0;
    for (const seed of seeds(200)) {
      const a = [1, 2, 3, 4, 5].map((n) => critRoll(seed, 1, n));
      const b = [1, 2, 3, 4, 5].map((n) => critRoll(seed, 2, n));
      if (a.some((v, i) => v !== b[i])) differs += 1;
    }
    expect(differs).toBe(200);
  });

  it('keeps critRoll in [0, 1)', () => {
    for (const seed of seeds(200)) {
      const v = critRoll(seed, 3, 4);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});

describe('setXp', () => {
  it('prices a set the way the end-of-session total does', () => {
    // 95 kg × 10 against a 100 kg best: intensity 1.3 → round(95 × 1.3) = 124.
    expect(setXp({ weightKg: 95, reps: 10, best: 100 })).toEqual({ base: 124, bonus: 0 });
  });
  it('adds the crit and combo bonus on top of the base', () => {
    expect(setXp({ weightKg: 95, reps: 10, best: 100, crit: true })).toEqual({ base: 124, bonus: 124 });
    expect(setXp({ weightKg: 100, reps: 10, best: null, combo: 3 }).bonus).toBe(10);
  });
  it('scores bodyweight reps and survives blanks', () => {
    expect(setXp({ weightKg: 0, reps: 12 }).base).toBe(12);
    expect(setXp()).toEqual({ base: 0, bonus: 0 });
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
