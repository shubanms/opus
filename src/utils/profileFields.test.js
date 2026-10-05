import { describe, it, expect } from 'vitest';
import {
  ageFromBirthYear, changedFrom, defaultBar, parseAge, parseBar, parseBodyweight, parseHeight,
} from './profileFields.js';
import { LB_PER_KG } from './units.js';

describe('defaultBar', () => {
  it('is the bar people actually load in each unit', () => {
    // Onboarding saved "20" in lbs — a 9 kg bar — and every plate count after
    // it was wrong.
    expect(defaultBar('kg')).toBe(20);
    expect(defaultBar('lbs')).toBe(45);
  });
});

describe('parseAge', () => {
  it('turns an age into a birth year', () => {
    expect(parseAge('30', 2026)).toEqual({ ok: true, value: 1996 });
  });

  it('rejects zero, negatives and junk instead of saving them', () => {
    // "-5" used to become a birth year in the future: "-5 yrs" on Profile.
    expect(parseAge('-5', 2026).ok).toBe(false);
    expect(parseAge('0', 2026).ok).toBe(false);
    expect(parseAge('abc', 2026).ok).toBe(false);
  });

  it('clamps the implausible and treats blank as cleared', () => {
    expect(parseAge('300', 2026).value).toBe(2026 - 100);
    expect(parseAge('5', 2026).value).toBe(2026 - 13);
    expect(parseAge('', 2026)).toEqual({ ok: true, value: null });
    expect(parseAge('  ', 2026)).toEqual({ ok: true, value: null });
  });
});

describe('ageFromBirthYear', () => {
  it('shows an age only when there is a sensible one', () => {
    expect(ageFromBirthYear(1996, 2026)).toBe(30);
    expect(ageFromBirthYear(2031, 2026)).toBe('');
    expect(ageFromBirthYear(null, 2026)).toBe('');
  });
});

describe('parseHeight', () => {
  it('accepts a height, clamps the implausible, rejects nonsense', () => {
    expect(parseHeight('182')).toEqual({ ok: true, value: 182 });
    expect(parseHeight('1820').value).toBe(250);
    expect(parseHeight('-170').ok).toBe(false);
    expect(parseHeight('')).toEqual({ ok: true, value: null });
  });
});

describe('parseBodyweight', () => {
  it('converts from the display unit', () => {
    expect(parseBodyweight('80', 'kg')).toEqual({ ok: true, value: 80 });
    expect(parseBodyweight('176', 'lbs').value).toBeCloseTo(176 / LB_PER_KG, 6);
  });

  it('is no answer at all when blank, zero or negative', () => {
    expect(parseBodyweight('', 'kg').ok).toBe(false);
    expect(parseBodyweight('0', 'kg').ok).toBe(false);
    expect(parseBodyweight('-80', 'lbs').ok).toBe(false);
  });

  it('clamps to a human range in either unit', () => {
    expect(parseBodyweight('5', 'kg').value).toBe(20);
    expect(parseBodyweight('2000', 'lbs').value).toBeCloseTo(400, 6);
  });
});

describe('parseBar', () => {
  it('saves the unit default for a cleared field, not a 0 kg bar', () => {
    expect(parseBar('', 'kg')).toEqual({ ok: true, value: 20 });
    expect(parseBar('', 'lbs').value).toBeCloseTo(45 / LB_PER_KG, 6);
  });

  it('converts a typed bar and keeps it plausible', () => {
    expect(parseBar('15', 'kg').value).toBe(15);
    expect(parseBar('45', 'lbs').value).toBeCloseTo(20.41, 2);
    expect(parseBar('500', 'kg').value).toBe(50);
    expect(parseBar('0', 'kg').ok).toBe(false);
    expect(parseBar('x', 'kg').ok).toBe(false);
  });
});

describe('changedFrom', () => {
  it('ignores a blur that changed nothing', () => {
    expect(changedFrom('80', 80)).toBe(false);
    expect(changedFrom(' 176.37 ', 176.37)).toBe(false);
  });

  it('notices a real change, or a first value', () => {
    expect(changedFrom('81', 80)).toBe(true);
    expect(changedFrom('80', null)).toBe(true);
    expect(changedFrom('80', '')).toBe(true);
  });

  it('never treats a blank or junk field as a change', () => {
    expect(changedFrom('', 80)).toBe(false);
    expect(changedFrom('abc', 80)).toBe(false);
  });
});
