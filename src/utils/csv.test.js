import { describe, it, expect } from 'vitest';
import { escapeCsv, toCsv, setsToCsv } from './csv.js';

describe('escapeCsv', () => {
  it('leaves plain values unquoted', () => {
    expect(escapeCsv('Squat')).toBe('Squat');
    expect(escapeCsv(42)).toBe('42');
    expect(escapeCsv(null)).toBe('');
  });
  it('quotes and escapes commas, quotes, newlines', () => {
    expect(escapeCsv('a,b')).toBe('"a,b"');
    expect(escapeCsv('say "hi"')).toBe('"say ""hi"""');
    expect(escapeCsv('line1\nline2')).toBe('"line1\nline2"');
  });
});

describe('toCsv', () => {
  it('writes a header then rows', () => {
    expect(toCsv(['A', 'B'], [[1, 2], ['x,y', 3]])).toBe('A,B\n1,2\n"x,y",3');
  });
});

describe('setsToCsv', () => {
  const rows = [{ date: '2026-05-20', workout: 'Push', exercise: 'Bench', setNumber: 1, weightKg: 100, reps: 5, rpe: 8, isWarmup: false, note: 'felt strong' }];
  it('includes a unit-labelled weight header and converts', () => {
    const kg = setsToCsv(rows, 'kg');
    expect(kg.split('\n')[0]).toContain('Weight (kg)');
    expect(kg.split('\n')[1]).toContain('100');
    const lb = setsToCsv(rows, 'lbs');
    expect(lb.split('\n')[0]).toContain('Weight (lbs)');
    expect(lb).toContain('220.46'); // 100kg → lbs
  });
  it('warmup renders as yes/blank and empty set → header only', () => {
    expect(setsToCsv([{ ...rows[0], isWarmup: true }], 'kg').split('\n')[1]).toContain('yes');
    expect(setsToCsv([], 'kg').split('\n')).toHaveLength(1);
  });
});
