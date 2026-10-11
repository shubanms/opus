import { describe, it, expect } from 'vitest';
import {
  BODY_FIELDS,
  SLEEP_FIELDS,
  ACTIVITY_FIELDS,
  parseDecimal,
  parseCount,
  readField,
  rangeHint,
  fieldText,
  formFromRow,
  buildPatch,
  carryOver,
  isEmptyEntry,
  latestByField,
  latestPerDay,
  lengthToDisplay,
  lengthToCm,
  lengthUnit,
  rollingAverage,
  weightTrend,
} from './health.js';

describe('parseDecimal', () => {
  it('reads plain and comma-decimal numbers', () => {
    expect(parseDecimal('72.5')).toBe(72.5);
    expect(parseDecimal('72,5')).toBe(72.5);
    expect(parseDecimal(' 80 ')).toBe(80);
    expect(parseDecimal('.5')).toBe(0.5);
  });
  it('is null when blank and NaN when not a number', () => {
    expect(parseDecimal('')).toBeNull();
    expect(parseDecimal(null)).toBeNull();
    expect(Number.isNaN(parseDecimal('abc'))).toBe(true);
    expect(Number.isNaN(parseDecimal('1,000.5'))).toBe(true);
  });
});

describe('parseCount', () => {
  it('reads grouped step counts the way people type them', () => {
    // parseInt("8,000") is 8 — and the button then set the day's total to it.
    expect(parseCount('8,000')).toBe(8000);
    expect(parseCount('8 000')).toBe(8000);
    expect(parseCount('8.000')).toBe(8000);
    expect(parseCount('12,345')).toBe(12345);
    expect(parseCount('8k')).toBe(8000);
    expect(parseCount('12.5K')).toBe(12500);
  });
  it('rejects anything that is not a count instead of truncating it', () => {
    expect(Number.isNaN(parseCount('8000 steps'))).toBe(true);
    expect(Number.isNaN(parseCount('-500'))).toBe(true);
    expect(parseCount('')).toBeNull();
  });
  it('keeps fractions fractions where grouping makes no sense', () => {
    expect(Number.isNaN(parseCount('8.5', { grouped: false }))).toBe(true);
    expect(parseCount('8', { grouped: false })).toBe(8);
  });
});

describe('readField', () => {
  it('converts weight to kg and rejects the impossible', () => {
    expect(readField('weight', '80', 'kg')).toEqual({ value: 80, error: null });
    expect(readField('weight', '176.4', 'lbs').value).toBeCloseTo(80, 1);
    expect(readField('weight', '-80', 'kg').error).toBe('Enter 20–400 kg');
    expect(readField('weight', '800', 'kg').error).toBeTruthy();
    expect(readField('weight', '10', 'lbs').error).toBe('Enter 45–881 lbs');
  });
  it('bounds body fat, sleep, steps and water', () => {
    expect(readField('bodyFat', '16.3').value).toBe(16.3);
    expect(readField('bodyFat', '90').error).toBe('Enter 2–70%');
    expect(readField('hours', '7.5').value).toBe(7.5);
    expect(readField('hours', '-3').error).toBe('Enter 0–24 h');
    expect(readField('hours', '30').error).toBeTruthy();
    expect(readField('steps', '8,000').value).toBe(8000);
    expect(readField('steps', '250000').error).toBe('Enter up to 100,000');
    expect(readField('steps', 'lots').error).toBe('Whole numbers only');
    expect(readField('water', '41').error).toBe('Enter 0–40 glasses');
  });
  it('stores measurements in cm whatever the display unit', () => {
    expect(readField('waist', '32', 'lbs').value).toBeCloseTo(81.28, 2);
    expect(readField('waist', '82', 'kg').value).toBe(82);
    expect(readField('arms', '500', 'kg').error).toBe('Enter 10–100 cm');
  });
  it('treats blank as "no value", not as zero', () => {
    expect(readField('weight', '')).toEqual({ value: null, error: null });
    expect(readField('steps', '')).toEqual({ value: null, error: null });
  });
  it('reads star ratings', () => {
    expect(readField('quality', '4').value).toBe(4);
    expect(readField('quality', '').value).toBeNull();
  });
});

describe('rangeHint', () => {
  it('speaks the user\'s units', () => {
    expect(rangeHint('weight', 'kg')).toBe('20–400 kg');
    expect(rangeHint('chest', 'lbs')).toBe('16–98 in');
  });
});

describe('lengths', () => {
  it('shows inches to imperial users and stores cm', () => {
    expect(lengthUnit('lbs')).toBe('in');
    expect(lengthUnit('kg')).toBe('cm');
    expect(lengthToDisplay(81.28, 'lbs')).toBe(32);
    expect(lengthToDisplay(81.28, 'kg')).toBe(81.3);
    expect(lengthToCm(32, 'lbs')).toBeCloseTo(81.28, 5);
    expect(lengthToDisplay(null, 'kg')).toBeNull();
  });
});

describe('fieldText / formFromRow', () => {
  it('renders a stored row in the user\'s units', () => {
    const row = { weight: 80, bodyFat: 16.32, waist: 81.28, chest: null };
    expect(formFromRow(row, BODY_FIELDS, 'lbs')).toMatchObject({ weight: '176.4', bodyFat: '16.3', waist: '32', chest: '' });
    expect(fieldText('steps', 8000)).toBe('8000');
    expect(fieldText('quality', 0)).toBe('');
  });
});

describe('buildPatch', () => {
  it('writes only what changed — a re-save keeps the hours you did not touch', () => {
    const row = { date: '2026-10-05', hours: 7, quality: 3 };
    const form = { ...formFromRow(row, SLEEP_FIELDS), quality: '4' };
    expect(buildPatch(row, form, SLEEP_FIELDS)).toEqual({ patch: { quality: 4 }, errors: {}, changed: true });
  });
  it('does not turn blank water into zero glasses', () => {
    const row = { date: '2026-10-05', steps: 0, water: 6 };
    const form = { steps: '9,500', water: '6' };
    expect(buildPatch(row, form, ACTIVITY_FIELDS).patch).toEqual({ steps: 9500 });
  });
  it('clears a field the person emptied', () => {
    const row = { date: '2026-10-05', weight: 80, waist: 82 };
    const form = { ...formFromRow(row, BODY_FIELDS), waist: '' };
    expect(buildPatch(row, form, BODY_FIELDS).patch).toEqual({ waist: null });
  });
  it('round-trips an untouched imperial weight without drifting it', () => {
    const row = { weight: 72.5748 }; // 160 lbs
    const form = formFromRow(row, BODY_FIELDS, 'lbs');
    expect(buildPatch(row, form, BODY_FIELDS, 'lbs').changed).toBe(false);
  });
  it('reports errors and writes nothing for an invalid field', () => {
    const r = buildPatch({}, { weight: '-80', bodyFat: '18' }, BODY_FIELDS, 'kg');
    expect(r.errors).toEqual({ weight: 'Enter 20–400 kg' });
    expect(r.patch).toEqual({ bodyFat: 18 });
  });
  it('fills a new day from scratch', () => {
    expect(buildPatch(null, { hours: '8', quality: '' }, SLEEP_FIELDS).patch).toEqual({ hours: 8 });
  });
});

describe('carryOver', () => {
  it('opens on the chosen day\'s row', () => {
    expect(carryOver({ hours: '9', quality: '2' }, undefined, { hours: 7, quality: 4 }, SLEEP_FIELDS)).toEqual({ hours: '7', quality: '4' });
    expect(carryOver({}, undefined, null, SLEEP_FIELDS)).toEqual({ hours: '', quality: '' });
  });
  it('keeps what was typed when the date changes, and refills the rest', () => {
    const before = { date: '2026-10-05', hours: 7, quality: 3 };
    const typed = { hours: '7', quality: '5' }; // quality edited, hours untouched
    const other = { date: '2026-10-04', hours: 6.5, quality: 2 };
    expect(carryOver(typed, before, other, SLEEP_FIELDS)).toEqual({ hours: '6.5', quality: '5' });
  });
});

describe('isEmptyEntry', () => {
  it('is true only when nothing is left', () => {
    expect(isEmptyEntry({ steps: 0, water: 0 }, ACTIVITY_FIELDS)).toBe(true);
    expect(isEmptyEntry({ hours: null, quality: null }, SLEEP_FIELDS)).toBe(true);
    expect(isEmptyEntry({ hours: 7 }, SLEEP_FIELDS)).toBe(false);
  });
});

describe('latestByField', () => {
  it('takes each field from the newest row that has it', () => {
    const rows = [
      { date: '2026-10-05', weight: 80.2 },
      { date: '2026-10-04', weight: 80.4, bodyFat: null },
      { date: '2026-09-01', weight: 82, waist: 84, bodyFat: 18.5 },
      { date: '2026-08-01', waist: 86 },
    ];
    const l = latestByField(rows, ['weight', 'waist', 'bodyFat', 'chest']);
    expect(l.weight).toEqual({ value: 80.2, date: '2026-10-05' });
    expect(l.waist).toEqual({ value: 84, date: '2026-09-01' });
    expect(l.bodyFat).toEqual({ value: 18.5, date: '2026-09-01' });
    expect(l.chest).toBeNull();
  });
  it('does not depend on the order rows arrive in', () => {
    const rows = [{ date: '2026-08-01', waist: 86 }, { date: '2026-09-01', waist: 84 }];
    expect(latestByField(rows, ['waist']).waist.value).toBe(84);
  });
});

describe('latestPerDay', () => {
  it('keeps the last-written row of each day', () => {
    const rows = [
      { id: 1, date: '2026-10-05', weight: 80 },
      { id: 7, date: '2026-10-05', weight: 79.2 },
      { id: 3, date: '2026-10-01', weight: 79.4 },
      { id: 9, date: '', weight: 70 },
    ];
    expect(latestPerDay(rows).map((r) => r.id).sort()).toEqual([3, 7]);
    expect(latestPerDay(undefined)).toEqual([]);
  });
});

describe('rollingAverage', () => {
  it('averages the trailing calendar week, not the trailing N entries', () => {
    const pts = [
      { date: '2026-09-01', value: 90 }, // far behind: never in a later window
      { date: '2026-09-20', value: 82 },
      { date: '2026-09-23', value: 80 },
      { date: '2026-09-26', value: 81 },
    ];
    const out = rollingAverage(pts, 7);
    expect(out.map((p) => p.avg)).toEqual([90, 82, 81, 81]);
  });
  it('sorts its input and skips junk', () => {
    const out = rollingAverage([{ date: '2026-09-02', value: 2 }, { date: '2026-09-01', value: 4 }, { date: '', value: 1 }], 7);
    expect(out).toEqual([
      { date: '2026-09-01', value: 4, avg: 4 },
      { date: '2026-09-02', value: 2, avg: 3 },
    ]);
  });
});

describe('weightTrend', () => {
  const daily = (start, n, from, step) =>
    Array.from({ length: n }, (_, i) => {
      const d = new Date(2026, 8, start + i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      return { date: key, value: from + i * step };
    });

  it('reports the smoothed change over the last 30 days', () => {
    const pts = daily(1, 40, 82, -0.05); // 1 Sep → 10 Oct, losing 50 g a day
    const t = weightTrend(pts);
    expect(t.days).toBe(30);
    expect(t.to).toBe('2026-10-10');
    expect(t.delta).toBeCloseTo(-1.5, 5);
  });
  it('states the real span when there is less history', () => {
    const t = weightTrend(daily(1, 12, 80, 0.1));
    expect(t.days).toBe(11);
    expect(t.delta).toBeGreaterThan(0);
  });
  it('says nothing about less than a week', () => {
    expect(weightTrend(daily(1, 5, 80, -0.2))).toBeNull();
    expect(weightTrend([{ date: '2026-09-01', value: 80 }])).toBeNull();
    expect(weightTrend([])).toBeNull();
  });
});
