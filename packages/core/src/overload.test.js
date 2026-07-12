import { describe, it, expect } from 'vitest';
import { getOverloadSuggestion, isDeloadDue } from './overload.js';

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
  });
});

describe('isDeloadDue', () => {
  it('flags 5+ consecutive training days', () => {
    expect(isDeloadDue(['2026-05-01', '2026-05-02', '2026-05-03', '2026-05-04', '2026-05-05'])).toBe(true);
  });
  it('does not flag a gap', () => {
    expect(isDeloadDue(['2026-05-01', '2026-05-02', '2026-05-10'])).toBe(false);
  });
});
