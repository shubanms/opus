import { describe, it, expect } from 'vitest';
import { sessionSignals, pickPraise, pickConcern, buildVerdict, checkAdvice } from './verdict.js';

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

describe('checkAdvice', () => {
  const signals = (over) => sessionSignals(input(over));

  it('notices the volume came back', () => {
    const out = checkAdvice(
      { key: 'volumeDown', metric: 'volume', target: 8000 },
      signals({ session: { totalVolume: 9000, totalSets: 9 } })
    );
    expect(out.key).toBe('volumeDown');
    expect(out.text).toContain('brought the volume back');
  });

  it('says nothing when it did not happen', () => {
    // Repeating the same criticism every session is nagging; the new session's
    // own concern will raise it again on its own merits if it still applies.
    const out = checkAdvice(
      { key: 'volumeDown', metric: 'volume', target: 8000 },
      signals({ session: { totalVolume: 5000, totalSets: 9 } })
    );
    expect(out).toBe(null);
  });

  it('notices you started rating sets', () => {
    const out = checkAdvice(
      { key: 'unrated', metric: 'coverage', target: 0.5 },
      signals({ sets: [set(9), set(9), set(9)] })
    );
    expect(out.key).toBe('unrated');
  });

  it('notices you pushed harder', () => {
    const out = checkAdvice(
      { key: 'easy', metric: 'avgRpe', target: 8 },
      signals({ sets: [set(9), set(10), set(9)] })
    );
    expect(out.key).toBe('easy');
  });

  it('ages out advice this build no longer understands', () => {
    // Stored by an older version — it should go quiet, not throw.
    expect(checkAdvice({ key: 'gone', metric: 'nonsense', target: 1 }, signals())).toBe(null);
    expect(checkAdvice({ key: 'volumeDown', metric: 'nonsense', target: 1 }, signals())).toBe(null);
  });

  it('handles no open advice at all', () => {
    expect(checkAdvice(null, signals())).toBe(null);
    expect(checkAdvice({}, signals())).toBe(null);
  });

  it('does not fire on a metric that was never measured', () => {
    // avgRpe is null for an unrated session — that is not "target met".
    const out = checkAdvice(
      { key: 'easy', metric: 'avgRpe', target: 8 },
      signals({ sets: [set(), set(), set()] })
    );
    expect(out).toBe(null);
  });
});

describe('buildVerdict with an open piece of advice', () => {
  it('leads with the acknowledgement', () => {
    const v = buildVerdict({
      ...input({ session: { totalVolume: 9000, totalSets: 9, prCount: 2 } }),
      openAdvice: { key: 'volumeDown', metric: 'volume', target: 8000 },
    });
    expect(v.closedKey).toBe('volumeDown');
    expect(v.text.startsWith('You brought the volume back')).toBe(true);
  });

  it('replaces the praise rather than stacking with it', () => {
    // "You did the thing I asked" is the compliment; three clauses is a
    // paragraph nobody finishes.
    const v = buildVerdict({
      ...input({ session: { totalVolume: 9000, totalSets: 9, prCount: 2 } }),
      openAdvice: { key: 'volumeDown', metric: 'volume', target: 8000 },
    });
    expect(v.praiseKey).toBe(null);
    expect(v.text).not.toContain('new record');
  });

  it('still raises a new concern alongside it', () => {
    const v = buildVerdict({
      ...input({ session: { totalVolume: 9000, totalSets: 9 }, sets: [set(7), set(7), set(7)] }),
      openAdvice: { key: 'volumeDown', metric: 'volume', target: 8000 },
    });
    expect(v.closedKey).toBe('volumeDown');
    expect(v.concernKey).toBe('easy');
  });

  it('behaves exactly as before when there is no open advice', () => {
    const withNone = buildVerdict(input({ session: { totalVolume: 8000, totalSets: 1, prCount: 1 } }));
    expect(withNone.closedKey).toBe(null);
    expect(withNone.praiseKey).toBe('records');
  });
});
