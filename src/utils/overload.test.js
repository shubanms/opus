import { describe, it, expect } from 'vitest';
import { getOverloadSuggestion, isDeloadDue } from './overload.js';
import { toKg } from './units.js';

const sess = (reps, weight = 60, n = 4) => Array.from({ length: n }, () => ({ weight, reps }));

describe('getOverloadSuggestion', () => {
  it('asks for a session when there is no history', () => {
    expect(getOverloadSuggestion([]).action).toBe('maintain');
  });

  it('lever 1: below target reps → increase reps', () => {
    const s = getOverloadSuggestion([sess(8)]);
    expect(s.action).toBe('increase_reps');
  });

  it('lever 2: at target reps but under target sets → increase sets', () => {
    const s = getOverloadSuggestion([sess(12, 60, 2)]);
    expect(s.action).toBe('increase_sets');
  });

  it('lever 3: target reps + sets two sessions running → increase weight', () => {
    const s = getOverloadSuggestion([sess(12, 60, 4), sess(12, 60, 4)]);
    expect(s.action).toBe('increase_weight');
    expect(s.suggestedWeight).toBeGreaterThan(60);
    expect(s.reason).toContain('62.5kg');
  });
});

describe('getOverloadSuggestion in pounds', () => {
  const lbs = (v) => toKg(v, 'lbs');
  // The plate-aware step the weight stepper uses: a pair of 2.5 lb plates.
  const fiveLb = toKg(5, 'lbs');

  it('steps up to a weight you can load', () => {
    // Was "Step up to 230.5lbs" — a flat 2.5 kg (5.51 lb) step off 225.
    const w = lbs(225);
    const s = getOverloadSuggestion([sess(12, w), sess(12, w)], { unit: 'lbs', weightStep: fiveLb });
    expect(s.reason).toContain('230lbs');
    expect(s.suggestedWeight).toBeCloseTo(lbs(230), 6);
  });

  it('defaults to a 5 lb step when no increment is passed', () => {
    const w = lbs(135);
    const s = getOverloadSuggestion([sess(12, w), sess(12, w)], { unit: 'lbs' });
    expect(s.reason).toContain('140lbs');
  });

  it('respects a sparse rack', () => {
    // Lightest plates are 5 lb, so the smallest jump is 10 lb.
    const w = lbs(135);
    const s = getOverloadSuggestion([sess(12, w), sess(12, w)], { unit: 'lbs', weightStep: toKg(10, 'lbs') });
    expect(s.reason).toContain('145lbs');
  });

  it('moves a weight logged in kg onto the pound grid', () => {
    // 77.5 kg is 170.86 lb — nobody can load that.
    const s = getOverloadSuggestion([sess(8, 77.5)], { unit: 'lbs', weightStep: fiveLb });
    expect(s.action).toBe('increase_reps');
    expect(s.reason).toContain('170lbs');
    const up = getOverloadSuggestion([sess(12, 77.5), sess(12, 77.5)], { unit: 'lbs', weightStep: fiveLb });
    expect(up.reason).toContain('175lbs');
  });

  it('leaves a weight you typed in pounds alone', () => {
    const s = getOverloadSuggestion([sess(8, lbs(22.5))], { unit: 'lbs', weightStep: fiveLb });
    expect(s.reason).toContain('22.5lbs');
  });
});

describe('getOverloadSuggestion in kg', () => {
  it('keeps an off-grid dumbbell weight as lifted', () => {
    // An 8 kg dumbbell is not a barbell step, but it is a real weight.
    const s = getOverloadSuggestion([sess(10, 8)], { unit: 'kg', weightStep: 2.5 });
    expect(s.reason).toContain('8kg');
  });

  it('steps a dumbbell up onto the next loadable weight', () => {
    const s = getOverloadSuggestion([sess(12, 8), sess(12, 8)], { unit: 'kg', weightStep: 2.5, equipment: 'dumbbell' });
    expect(s.reason).toContain('10kg');
  });

  it('follows a home rack whose lightest plates are 5 kg', () => {
    const s = getOverloadSuggestion([sess(12, 60), sess(12, 60)], { unit: 'kg', weightStep: 10, equipment: 'barbell' });
    expect(s.reason).toContain('70kg');
  });

  it('adds a barbell step to the bar you have rather than rounding to a multiple', () => {
    // 135 on a 45 lb bar with 5 lb plates: the next loadable weight is 145.
    const w = toKg(135, 'lbs');
    const s = getOverloadSuggestion([sess(12, w), sess(12, w)], { unit: 'lbs', weightStep: toKg(10, 'lbs'), equipment: 'barbell' });
    expect(s.reason).toContain('145lbs');
  });
});

describe('isDeloadDue', () => {
  it('flags 5+ consecutive training days', () => {
    expect(isDeloadDue(['2026-05-01', '2026-05-02', '2026-05-03', '2026-05-04', '2026-05-05'])).toBe(true);
  });
  it('does not flag a gap', () => {
    expect(isDeloadDue(['2026-05-01', '2026-05-02', '2026-05-10'])).toBe(false);
  });
  it('counts across a daylight-saving change', () => {
    // US spring-forward is 8 Mar 2026; EU is 29 Mar.
    expect(isDeloadDue(['2026-03-06', '2026-03-07', '2026-03-08', '2026-03-09', '2026-03-10'])).toBe(true);
    expect(isDeloadDue(['2026-03-27', '2026-03-28', '2026-03-29', '2026-03-30', '2026-03-31'])).toBe(true);
  });
});
