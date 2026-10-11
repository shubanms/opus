import { describe, it, expect } from 'vitest';
import { monthLabel, dowLabels, monthGrid, monthStats, stepMonth, heatmapWeeks } from './calendar.js';

describe('monthLabel', () => {
  it('names the month and year', () => {
    expect(monthLabel(2026, 0)).toBe('January 2026');
    expect(monthLabel(2026, 6)).toBe('July 2026');
  });
});

describe('dowLabels', () => {
  it('starts on Monday by default', () => {
    expect(dowLabels()).toEqual(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']);
  });
  it('can start on Sunday', () => {
    expect(dowLabels(0)).toEqual(['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']);
  });
});

describe('monthGrid', () => {
  it('lays out July 2026 with correct Monday lead + day count', () => {
    // July 1 2026 is a Wednesday. Monday-start → 2 blank lead cells.
    const weeks = monthGrid(2026, 6, new Set());
    expect(weeks[0].slice(0, 2)).toEqual([null, null]);
    expect(weeks[0][2].day).toBe(1);
    const days = weeks.flat().filter(Boolean);
    expect(days).toHaveLength(31);
    expect(days[days.length - 1].day).toBe(31);
  });
  it('rows are always 7 wide and padded with nulls', () => {
    const weeks = monthGrid(2026, 6, new Set());
    for (const w of weeks) expect(w).toHaveLength(7);
  });
  it('marks trained days and today', () => {
    const weeks = monthGrid(2026, 6, new Set(['2026-07-04', '2026-07-17']), { todayKey: '2026-07-17' });
    const d4 = weeks.flat().find((c) => c && c.day === 4);
    const d17 = weeks.flat().find((c) => c && c.day === 17);
    const d5 = weeks.flat().find((c) => c && c.day === 5);
    expect(d4.trained).toBe(true);
    expect(d17.trained).toBe(true);
    expect(d17.isToday).toBe(true);
    expect(d5.trained).toBe(false);
    expect(d5.isToday).toBe(false);
  });
  it('builds date keys from integers (zero-padded, no TZ drift)', () => {
    const weeks = monthGrid(2026, 0, new Set()); // January
    expect(weeks.flat().find((c) => c && c.day === 3).dateKey).toBe('2026-01-03');
  });
  it('handles a Sunday-start layout', () => {
    // July 1 2026 = Wednesday → Sunday-start lead is 3 blanks.
    const weeks = monthGrid(2026, 6, new Set(), { firstDay: 0 });
    expect(weeks[0].slice(0, 3)).toEqual([null, null, null]);
    expect(weeks[0][3].day).toBe(1);
  });
  it('handles February in a leap year (2028 → 29 days)', () => {
    const days = monthGrid(2028, 1, new Set()).flat().filter(Boolean);
    expect(days).toHaveLength(29);
  });
});

describe('monthStats', () => {
  it('counts trained days within the month only', () => {
    const trained = new Set(['2026-07-04', '2026-07-17', '2026-08-01']);
    expect(monthStats(2026, 6, trained)).toEqual({ trained: 2, days: 31 });
  });
});

describe('stepMonth', () => {
  it('advances within a year', () => {
    expect(stepMonth(2026, 6, 1)).toEqual({ year: 2026, month: 7 });
  });
  it('wraps forward across December', () => {
    expect(stepMonth(2026, 11, 1)).toEqual({ year: 2027, month: 0 });
  });
  it('wraps backward across January', () => {
    expect(stepMonth(2026, 0, -1)).toEqual({ year: 2025, month: 11 });
  });
});

describe('heatmapWeeks', () => {
  // Wednesday 7 Oct 2026; Mon/Wed/Fri trained.
  const trained = new Set(['2026-09-28', '2026-09-30', '2026-10-02', '2026-10-05', '2026-10-07']);

  it('puts each session on its own weekday row', () => {
    const cols = heatmapWeeks('2026-10-07', trained, 2);
    // Rows are Monday-first: 0 = Mon, 2 = Wed, 4 = Fri.
    const litRows = cols.flatMap((col) => col.map((c, row) => (c.trained ? row : null)).filter((r) => r !== null));
    expect(litRows).toEqual([0, 2, 4, 0, 2]);
  });

  it("lights today's session on today's cell and blanks only the days after it", () => {
    const thisWeek = heatmapWeeks('2026-10-07', trained, 1)[0];
    expect(thisWeek.map((c) => c.key)).toEqual([
      '2026-10-05', '2026-10-06', '2026-10-07', '2026-10-08', '2026-10-09', '2026-10-10', '2026-10-11',
    ]);
    expect(thisWeek[2]).toEqual({ key: '2026-10-07', trained: true, future: false });
    expect(thisWeek.slice(3).every((c) => c.future)).toBe(true);
    expect(thisWeek.slice(0, 3).some((c) => c.future)).toBe(false);
  });

  it('spans 12 weeks by default, oldest first', () => {
    const cols = heatmapWeeks('2026-10-07', trained);
    expect(cols).toHaveLength(12);
    expect(cols[0][0].key).toBe('2026-07-20');
    expect(cols[11][0].key).toBe('2026-10-05');
  });

  it('keeps seven distinct days per column across a clock change', () => {
    const col = heatmapWeeks('2026-11-04', new Set(), 2)[0];
    expect(col.map((c) => c.key)).toEqual([
      '2026-10-26', '2026-10-27', '2026-10-28', '2026-10-29', '2026-10-30', '2026-10-31', '2026-11-01',
    ]);
  });
});
