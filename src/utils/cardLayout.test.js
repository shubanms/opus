import { describe, it, expect } from 'vitest';
import {
  CARD,
  THEMES,
  ACCENTS,
  resolveTheme,
  formatShareDate,
  formatDuration,
  groupNumber,
  pluralize,
  columns,
  fitFontSize,
  truncateToWidth,
  sparkBars,
  muscleLine,
} from './cardLayout.js';

describe('CARD', () => {
  it('exposes a square canvas with symmetric padding', () => {
    expect(CARD.size).toBe(1080);
    expect(CARD.inner).toBe(1080 - 88 * 2);
  });
});

describe('resolveTheme', () => {
  it('resolves a known theme + accent pair', () => {
    const t = resolveTheme('chalk', 'sage');
    expect(t.bg).toBe('#F7F5F2');
    expect(t.accent).toBe('#6B8F71');
  });

  it('falls back to the first theme and accent for unknown ids', () => {
    const t = resolveTheme('nope', 'nope');
    expect(t.id).toBe(THEMES[0].id);
    expect(t.accent).toBe(ACCENTS[0].color);
  });

  it('always returns bg, text, sub and accent', () => {
    for (const theme of THEMES) {
      for (const accent of ACCENTS) {
        const t = resolveTheme(theme.id, accent.id);
        expect(t.bg && t.text && t.sub && t.accent).toBeTruthy();
      }
    }
  });
});

describe('formatShareDate', () => {
  it('formats a date locale-independently', () => {
    expect(formatShareDate('2026-03-09T10:00:00.000Z')).toMatch(/^Mar \d+, 2026$/);
  });

  it('accepts a Date instance', () => {
    expect(formatShareDate(new Date(2026, 0, 5))).toBe('Jan 5, 2026');
  });

  it('returns empty for missing or invalid input', () => {
    expect(formatShareDate(null)).toBe('');
    expect(formatShareDate(undefined)).toBe('');
    expect(formatShareDate('not-a-date')).toBe('');
  });
});

describe('formatDuration', () => {
  it('renders minutes under an hour', () => {
    expect(formatDuration(45 * 60)).toBe('45m');
  });

  it('renders hours and minutes past an hour', () => {
    expect(formatDuration(65 * 60)).toBe('1h 5m');
    expect(formatDuration(120 * 60)).toBe('2h 0m');
  });

  it('treats missing duration as zero', () => {
    expect(formatDuration(undefined)).toBe('0m');
    expect(formatDuration(null)).toBe('0m');
  });
});

describe('groupNumber', () => {
  it('groups thousands with commas', () => {
    expect(groupNumber(1234)).toBe('1,234');
    expect(groupNumber(1234567)).toBe('1,234,567');
  });

  it('leaves short numbers alone and rounds', () => {
    expect(groupNumber(999)).toBe('999');
    expect(groupNumber(12.6)).toBe('13');
  });

  it('handles negatives', () => {
    expect(groupNumber(-4321)).toBe('-4,321');
  });

  it('never renders NaN on a card', () => {
    expect(groupNumber(Number.NaN)).toBe('0');
    expect(groupNumber(undefined)).toBe('0');
    expect(groupNumber(Number.POSITIVE_INFINITY)).toBe('0');
  });
});

describe('pluralize', () => {
  it('uses the singular only for exactly one', () => {
    expect(pluralize(1, 'session')).toBe('session');
    expect(pluralize(0, 'session')).toBe('sessions');
    expect(pluralize(2, 'session')).toBe('sessions');
  });

  it('accepts an irregular plural', () => {
    expect(pluralize(3, 'entry', 'entries')).toBe('entries');
  });
});

describe('columns', () => {
  it('splits the inner width evenly', () => {
    const cols = columns(3);
    expect(cols).toHaveLength(3);
    expect(cols[0].x).toBe(CARD.pad);
    expect(cols[0].width).toBeCloseTo(CARD.inner / 3);
    expect(cols[2].x).toBeCloseTo(CARD.pad + (CARD.inner / 3) * 2);
  });

  it('spans exactly the requested width', () => {
    const cols = columns(4, 0, 400);
    expect(cols[3].x + cols[3].width).toBe(400);
  });

  it('returns nothing for a non-positive count', () => {
    expect(columns(0)).toEqual([]);
    expect(columns(-2)).toEqual([]);
  });
});

describe('fitFontSize', () => {
  // Pretend each character is 0.5em wide.
  const measureFor = (text) => (size) => text.length * size * 0.5;

  it('keeps the max size when the text already fits', () => {
    expect(fitFontSize({ measure: measureFor('hi'), maxWidth: 900, max: 100 })).toBe(100);
  });

  it('steps down until the text fits', () => {
    const size = fitFontSize({ measure: measureFor('a'.repeat(20)), maxWidth: 500, max: 100 });
    expect(size).toBeLessThan(100);
    expect(measureFor('a'.repeat(20))(size)).toBeLessThanOrEqual(500);
  });

  it('never goes below the floor', () => {
    const size = fitFontSize({ measure: measureFor('a'.repeat(500)), maxWidth: 10, max: 100, min: 24 });
    expect(size).toBe(24);
  });
});

describe('truncateToWidth', () => {
  const measure = (s) => s.length * 10;

  it('returns the text untouched when it fits', () => {
    expect(truncateToWidth({ measure, text: 'short', maxWidth: 1000 })).toBe('short');
  });

  it('truncates with an ellipsis and respects the budget', () => {
    const out = truncateToWidth({ measure, text: 'abcdefghij', maxWidth: 50 });
    expect(out.endsWith('…')).toBe(true);
    expect(measure(out)).toBeLessThanOrEqual(50);
  });

  it('degrades to a bare ellipsis when nothing fits', () => {
    expect(truncateToWidth({ measure, text: 'abcdef', maxWidth: 5 })).toBe('…');
  });

  it('handles empty and nullish input', () => {
    expect(truncateToWidth({ measure, text: '', maxWidth: 100 })).toBe('');
    expect(truncateToWidth({ measure, text: null, maxWidth: 100 })).toBe('');
  });
});

describe('sparkBars', () => {
  const box = { x: 0, y: 0, width: 300, height: 100, gap: 10 };

  it('returns one bar per value, bottom-aligned within the band', () => {
    const bars = sparkBars([1, 2, 3], box);
    expect(bars).toHaveLength(3);
    for (const b of bars) expect(b.y + b.height).toBeCloseTo(box.y + box.height);
  });

  it('scales the tallest bar to the full band height', () => {
    const bars = sparkBars([1, 4], box);
    expect(bars[1].height).toBeCloseTo(100);
  });

  it('spans the requested width including gaps', () => {
    const bars = sparkBars([1, 2, 3], box);
    const last = bars[2];
    expect(last.x + last.width).toBeCloseTo(300);
  });

  it('gives zero values a visible minimum height', () => {
    const bars = sparkBars([0, 10], { ...box, minHeight: 6 });
    expect(bars[0].height).toBe(6);
  });

  it('needs at least two points to draw', () => {
    expect(sparkBars([5], box)).toEqual([]);
    expect(sparkBars([], box)).toEqual([]);
    expect(sparkBars(undefined, box)).toEqual([]);
  });

  it('ignores non-finite values', () => {
    expect(sparkBars([1, Number.NaN, 3], box)).toHaveLength(2);
  });

  it('survives an all-zero series without dividing by zero', () => {
    const bars = sparkBars([0, 0, 0], box);
    expect(bars).toHaveLength(3);
    for (const b of bars) expect(Number.isFinite(b.height)).toBe(true);
  });
});

describe('muscleLine', () => {
  it('joins and de-hyphenates muscle names', () => {
    expect(muscleLine(['chest', 'upper-back'])).toBe('chest  ·  upper back');
  });

  it('caps the number of entries', () => {
    expect(muscleLine(['a', 'b', 'c', 'd', 'e'], 3).split('·')).toHaveLength(3);
  });

  it('returns empty for no muscles', () => {
    expect(muscleLine([])).toBe('');
    expect(muscleLine(undefined)).toBe('');
  });
});
