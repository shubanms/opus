import { describe, it, expect } from 'vitest';
import {
  MUSCLE_LABEL,
  WEEKLY_TARGET,
  MOVEMENT,
  STATUS,
  muscleStatus,
  weeklyBreakdown,
  pushPullBalance,
  balanceMessage,
} from './muscleTargets.js';

describe('the muscle vocabulary', () => {
  it('covers exactly the groups the app can label', () => {
    // A target for a muscle the UI cannot name would render as a raw key.
    expect(Object.keys(WEEKLY_TARGET).sort()).toEqual(Object.keys(MUSCLE_LABEL).sort());
  });

  it('places every muscle on the movement ledger', () => {
    for (const muscle of Object.keys(WEEKLY_TARGET)) {
      expect(MOVEMENT[muscle]).toBeTruthy();
    }
  });
});

describe('muscleStatus', () => {
  it('flags a muscle well under its target', () => {
    const s = muscleStatus('chest', 3);
    expect(s.state).toBe(STATUS.LOW);
    expect(s.target).toBe(12);
  });

  it('calls a normal week on track', () => {
    expect(muscleStatus('chest', 10).state).toBe(STATUS.ON_TRACK);
    expect(muscleStatus('chest', 12).state).toBe(STATUS.ON_TRACK);
  });

  it('is generous before calling a week overcooked', () => {
    // A specialisation block is a choice, not a mistake.
    expect(muscleStatus('chest', 17).state).toBe(STATUS.ON_TRACK);
    expect(muscleStatus('chest', 19).state).toBe(STATUS.OVER);
  });

  it('treats an untrained muscle as low, not missing', () => {
    const s = muscleStatus('calves', 0);
    expect(s.sets).toBe(0);
    expect(s.state).toBe(STATUS.LOW);
  });

  it('survives an unknown muscle and junk counts', () => {
    expect(muscleStatus('tail', 4).target).toBeGreaterThan(0);
    expect(muscleStatus('chest', Number.NaN).sets).toBe(0);
    expect(muscleStatus('chest', -5).sets).toBe(0);
  });
});

describe('weeklyBreakdown', () => {
  it('includes muscles you did not train at all', () => {
    // The point is surfacing what is missing; an absent row cannot be noticed.
    const rows = weeklyBreakdown({ chest: 10 });
    expect(rows).toHaveLength(Object.keys(WEEKLY_TARGET).length);
    expect(rows.find((r) => r.muscle === 'calves').sets).toBe(0);
  });

  it('puts the hardest-worked first', () => {
    const rows = weeklyBreakdown({ chest: 4, biceps: 9 });
    expect(rows[0].muscle).toBe('biceps');
  });

  it('is stable for equal counts', () => {
    const a = weeklyBreakdown({}).map((r) => r.muscle);
    const b = weeklyBreakdown({}).map((r) => r.muscle);
    expect(a).toEqual(b);
  });

  it('survives no data', () => {
    expect(weeklyBreakdown(undefined)).toHaveLength(Object.keys(WEEKLY_TARGET).length);
  });
});

describe('pushPullBalance', () => {
  it('spots the common push-heavy week', () => {
    const b = pushPullBalance({ chest: 12, triceps: 6, biceps: 4, 'upper-back': 4 });
    expect(b.push).toBe(18);
    expect(b.pull).toBe(8);
    expect(b.verdict).toBe('pushHeavy');
  });

  it('spots the reverse', () => {
    expect(pushPullBalance({ 'upper-back': 12, biceps: 6, chest: 4 }).verdict).toBe('pullHeavy');
  });

  it('calls a reasonable spread balanced', () => {
    expect(pushPullBalance({ chest: 10, 'upper-back': 10 }).verdict).toBe('balanced');
  });

  it('says nothing on too small a sample', () => {
    // "Imbalanced" after three sets is noise, not insight.
    expect(pushPullBalance({ chest: 3 }).verdict).toBe('unknown');
    expect(pushPullBalance({}).verdict).toBe('unknown');
  });

  it('does not divide by zero on an all-push week', () => {
    const b = pushPullBalance({ chest: 12, triceps: 6 });
    expect(b.verdict).toBe('pushHeavy');
    expect(Number.isNaN(b.ratio)).toBe(false);
  });

  it('ignores legs and core', () => {
    const b = pushPullBalance({ chest: 8, 'upper-back': 8, quadriceps: 20, abs: 20 });
    expect(b.push).toBe(8);
    expect(b.pull).toBe(8);
  });
});

describe('balanceMessage', () => {
  it('says something only when there is something to say', () => {
    expect(balanceMessage(pushPullBalance({ chest: 12, biceps: 2 }))).toContain('Push-heavy');
    expect(balanceMessage(pushPullBalance({ chest: 3 }))).toBe('');
    expect(balanceMessage(undefined)).toBe('');
  });
});
