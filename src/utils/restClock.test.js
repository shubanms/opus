import { describe, it, expect } from 'vitest';
import {
  startRest,
  restRemaining,
  restProgress,
  adjustRest,
  retargetRest,
  restDurationFor,
  restOutcome,
  formatRest,
  presetLabel,
  LATE_CUE_MS,
} from './restClock.js';

const T = 1_700_000_000_000;

describe('startRest / restRemaining', () => {
  it('counts down from a deadline', () => {
    const r = startRest(90, T);
    expect(r).toEqual({ startedAt: T, endsAt: T + 90_000, duration: 90 });
    expect(restRemaining(r, T)).toBe(90);
    expect(restRemaining(r, T + 30_500)).toBe(60); // rounds up
    expect(restRemaining(r, T + 90_000)).toBe(0);
  });

  it('a locked phone does not stretch the rest', () => {
    // The old timer counted ticks; timers freeze while the screen is off, so
    // 2 minutes in a pocket came back as most of the rest still to go.
    const r = startRest(120, T);
    expect(restRemaining(r, T + 125_000)).toBe(0);
    expect(restRemaining(r, T + 100_000)).toBe(20);
  });

  it('never goes negative, and survives no rest at all', () => {
    expect(restRemaining(startRest(60, T), T + 10 * 60_000)).toBe(0);
    expect(restRemaining(null, T)).toBe(0);
  });

  it('keeps a sensible minimum', () => {
    expect(startRest(0, T).duration).toBe(5);
    expect(startRest(-30, T).duration).toBe(5);
  });
});

describe('restProgress', () => {
  it('runs from 1 to 0', () => {
    const r = startRest(100, T);
    expect(restProgress(r, T)).toBe(1);
    expect(restProgress(r, T + 25_000)).toBeCloseTo(0.75);
    expect(restProgress(r, T + 200_000)).toBe(0);
    expect(restProgress(null, T)).toBe(0);
  });
});

describe('adjustRest', () => {
  it('moves the deadline and the total together', () => {
    const r = adjustRest(startRest(90, T), 15, T + 10_000);
    expect(r.endsAt).toBe(T + 105_000);
    expect(r.duration).toBe(105);
    const back = adjustRest(r, -15, T + 10_000);
    expect(back.endsAt).toBe(T + 90_000);
  });

  it('cutting past zero ends the rest now', () => {
    const r = adjustRest(startRest(60, T), -15, T + 55_000);
    expect(r.endsAt).toBe(T + 55_000);
    expect(restRemaining(r, T + 55_000)).toBe(0);
  });

  it('passes no rest through', () => {
    expect(adjustRest(null, 15, T)).toBe(null);
  });
});

describe('retargetRest', () => {
  it('keeps the seconds already rested', () => {
    // Logged at T, rated "Max" 20 s later: 90 → 155 total, 135 to go.
    const r = retargetRest(startRest(90, T), 155, T + 20_000);
    expect(r.duration).toBe(155);
    expect(restRemaining(r, T + 20_000)).toBe(135);
  });

  it('a shorter target that has already passed ends the rest', () => {
    const r = retargetRest(startRest(120, T), 60, T + 80_000);
    expect(restRemaining(r, T + 80_000)).toBe(0);
  });

  it('works on an old rest saved without a start time', () => {
    const r = retargetRest({ endsAt: T + 90_000, duration: 90 }, 120, T + 30_000);
    expect(r.startedAt).toBe(T);
    expect(restRemaining(r, T + 30_000)).toBe(90);
  });
});

describe('restDurationFor', () => {
  it("prefers the routine's rest for the exercise", () => {
    expect(restDurationFor({ targetRest: 180, rpe: 7, defaultSecs: 90 })).toBe(180);
  });
  it('then the effort-suggested rest', () => {
    expect(restDurationFor({ rpe: 10, defaultSecs: 90 })).toBe(160);
    expect(restDurationFor({ rpe: 7, defaultSecs: 90 })).toBe(70);
  });
  it('then your default', () => {
    expect(restDurationFor({ defaultSecs: 120 })).toBe(120);
    expect(restDurationFor({})).toBe(90);
    expect(restDurationFor({ targetRest: 0, defaultSecs: 75 })).toBe(75);
  });
});

describe('restOutcome', () => {
  const r = startRest(60, T);
  it('says nothing while the rest is running', () => {
    expect(restOutcome(r, T + 30_000)).toBe(null);
    expect(restOutcome(null, T)).toBe(null);
  });
  it('cues once, right when it ends', () => {
    expect(restOutcome(r, T + 60_200)).toBe('cue');
    expect(restOutcome(r, T + 60_200, r.endsAt)).toBe(null);
  });
  it('ends quietly when the phone was locked through the end', () => {
    expect(restOutcome(r, T + 60_000 + LATE_CUE_MS + 1)).toBe('quiet');
  });
});

describe('formatRest / presetLabel', () => {
  it('formats the countdown', () => {
    expect(formatRest(90)).toBe('1:30');
    expect(formatRest(45)).toBe('45s');
    expect(formatRest(0)).toBe('0s');
    expect(formatRest(-3)).toBe('0s');
    expect(formatRest(600)).toBe('10:00');
  });
  it('formats a preset chip', () => {
    expect(presetLabel(60)).toBe('1:00');
    expect(presetLabel(90)).toBe('1:30');
    expect(presetLabel(180)).toBe('3:00');
  });
});
