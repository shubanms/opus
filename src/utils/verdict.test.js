import { describe, it, expect } from 'vitest';
import { sessionSignals, pickPraise, pickConcern, buildVerdict } from './verdict.js';

const set = (rpe = null, isWarmup = false) => ({ rpe, isWarmup, weight: 60, reps: 8 });
const typical = [8000, 8200, 7800, 8100];

const input = (over = {}) => ({
  session: { totalVolume: 8000, totalSets: 9, prCount: 0, ...(over.session ?? {}) },
  sets: over.sets ?? Array.from({ length: 9 }, () => set()),
  recentVolumes: over.recentVolumes ?? typical,
});

describe('sessionSignals', () => {
  it('measures this session against previous ones', () => {
    const s = sessionSignals(input({ session: { totalVolume: 10000, totalSets: 9 } }));
    expect(s.hasBaseline).toBe(true);
    expect(s.volumeDelta).toBeGreaterThan(20);
  });

  it('refuses a baseline from too little history', () => {
    // Two prior sessions is not an average, it is two numbers.
    const s = sessionSignals(input({ recentVolumes: [8000, 8200] }));
    expect(s.hasBaseline).toBe(false);
  });

  it('never includes the session in its own baseline', () => {
    // The caller passes previous sessions only; if it leaked in, a first-ever
    // session would compare against itself and always read 0%.
    const s = sessionSignals(input({ recentVolumes: [] }));
    expect(s.avgVolume).toBe(null);
    expect(s.volumeDelta).toBe(0);
  });

  it('survives a missing session and junk numbers', () => {
    const s = sessionSignals({ session: undefined, sets: undefined });
    expect(s.volume).toBe(0);
    expect(s.prCount).toBe(0);
    expect(s.effort.rated).toBe(0);
  });
});

describe('pickPraise', () => {
  it('leads with records when there are any', () => {
    const s = sessionSignals(input({ session: { totalVolume: 100, totalSets: 1, prCount: 2 } }));
    expect(pickPraise(s).key).toBe('records');
    expect(pickPraise(s).text).toContain('2 new records');
  });

  it('says one record, not one records', () => {
    const s = sessionSignals(input({ session: { totalVolume: 100, totalSets: 1, prCount: 1 } }));
    expect(pickPraise(s).text).toBe('1 new record.');
  });

  it('notices a big volume week', () => {
    const s = sessionSignals(input({ session: { totalVolume: 11000, totalSets: 9 } }));
    expect(pickPraise(s).key).toBe('volumeUp');
  });

  it('notices intensity when volume is unremarkable', () => {
    const s = sessionSignals(input({ sets: [set(10), set(10), set(7)] }));
    expect(pickPraise(s).key).toBe('intensity');
  });

  it('says nothing rather than inventing a compliment', () => {
    // An ordinary session with nothing notable should not be flattered.
    const s = sessionSignals(input({ session: { totalVolume: 8000, totalSets: 6 }, sets: [set(), set()] }));
    expect(pickPraise(s)).toBe(null);
  });
});

describe('pickConcern', () => {
  it('flags a session well below the recent average', () => {
    const c = pickConcern(sessionSignals(input({ session: { totalVolume: 5000, totalSets: 6 } })));
    expect(c.key).toBe('volumeDown');
    expect(c.text).toContain('below your recent average');
  });

  it('does not scold a low-volume session that set records', () => {
    // A heavy low-volume day that produced a PR is a good session.
    const c = pickConcern(
      sessionSignals(input({ session: { totalVolume: 5000, totalSets: 6, prCount: 1 } }))
    );
    expect(c?.key).not.toBe('volumeDown');
  });

  it('will not compare against an average it does not have', () => {
    const c = pickConcern(
      sessionSignals(input({ session: { totalVolume: 100, totalSets: 6 }, recentVolumes: [] }))
    );
    expect(c?.key).not.toBe('volumeDown');
  });

  it('asks for ratings rather than judging intensity it was never told', () => {
    const c = pickConcern(sessionSignals(input({ sets: [set(), set(), set(), set()] })));
    expect(c.key).toBe('unrated');
  });

  it('flags a session where everything felt easy', () => {
    const c = pickConcern(sessionSignals(input({ sets: [set(7), set(7), set(7)] })));
    expect(c.key).toBe('easy');
  });

  it('needs enough ratings before calling a session easy', () => {
    // One easy set is not a verdict about the session.
    const c = pickConcern(sessionSignals(input({ sets: [set(7), set(), set(), set()] })));
    expect(c?.key).not.toBe('easy');
  });
});

describe('buildVerdict', () => {
  it('carries both halves when both exist', () => {
    const v = buildVerdict(
      input({ session: { totalVolume: 5000, totalSets: 14 }, sets: Array.from({ length: 14 }, () => set(10)) })
    );
    expect(v.praiseKey).toBeTruthy();
    expect(v.concernKey).toBeTruthy();
    expect(v.text.split('.').filter(Boolean).length).toBeGreaterThanOrEqual(2);
  });

  it('says something honest when there is nothing to report', () => {
    const v = buildVerdict(input({ session: { totalVolume: 8000, totalSets: 6 }, sets: [set(), set()] }));
    expect(v.text).toContain('unremarkable');
    expect(v.praiseKey).toBe(null);
    expect(v.concernKey).toBe(null);
  });

  it('emits advice the next session can check, separate from the prose', () => {
    const v = buildVerdict(input({ session: { totalVolume: 5000, totalSets: 6 } }));
    expect(v.advice).toEqual({ key: 'volumeDown', metric: 'volume', target: 8025 });
    // The advice must never be something you have to parse back out of the text.
    expect(v.text).not.toContain('metric');
  });

  it('has no advice when there is no concern', () => {
    const v = buildVerdict(input({ session: { totalVolume: 8000, totalSets: 1, prCount: 3 }, sets: [set(9)] }));
    expect(v.advice).toBe(null);
  });

  it('always produces text, however broken the input', () => {
    expect(buildVerdict({}).text.length).toBeGreaterThan(0);
    expect(buildVerdict({ session: null, sets: null, recentVolumes: null }).text.length).toBeGreaterThan(0);
  });
});
