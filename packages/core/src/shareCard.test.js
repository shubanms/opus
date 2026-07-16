import { describe, it, expect } from 'vitest';
import {
  THEMES,
  ACCENTS,
  DEFAULT_THEME,
  formatDuration,
  formatShareDate,
  resolveTheme,
} from './shareCard.js';

describe('shareCard themes', () => {
  it('exposes three backgrounds and three accents', () => {
    expect(THEMES).toHaveLength(3);
    expect(ACCENTS).toHaveLength(3);
    expect(THEMES.map((t) => t.id)).toEqual(['slate', 'obsidian', 'chalk']);
    expect(ACCENTS.map((a) => a.id)).toEqual(['gold', 'ember', 'sage']);
  });

  it('every theme carries bg/text/sub colors', () => {
    for (const t of THEMES) {
      expect(t.bg).toMatch(/^#[0-9A-F]{6}$/i);
      expect(t.text).toMatch(/^#[0-9A-F]{6}$/i);
      expect(t.sub).toMatch(/^#[0-9A-F]{6}$/i);
    }
  });

  it('DEFAULT_THEME is slate + gold', () => {
    expect(DEFAULT_THEME.id).toBe('slate');
    expect(DEFAULT_THEME.accent).toBe('#C9A84C');
  });

  it('resolveTheme merges a background + accent by index and clamps bad indexes', () => {
    expect(resolveTheme(1, 2)).toEqual({ ...THEMES[1], accent: ACCENTS[2].color });
    // out-of-range falls back to the first entry
    expect(resolveTheme(99, 99)).toEqual({ ...THEMES[0], accent: ACCENTS[0].color });
    expect(resolveTheme()).toEqual(DEFAULT_THEME);
  });
});

describe('formatDuration', () => {
  it('renders minutes under an hour', () => {
    expect(formatDuration(0)).toBe('0m');
    expect(formatDuration(59)).toBe('0m');
    expect(formatDuration(60)).toBe('1m');
    expect(formatDuration(45 * 60)).toBe('45m');
  });

  it('renders hours + minutes past an hour', () => {
    expect(formatDuration(60 * 60)).toBe('1h 0m');
    expect(formatDuration(65 * 60)).toBe('1h 5m');
    expect(formatDuration(2 * 3600 + 30 * 60)).toBe('2h 30m');
  });

  it('treats nullish as zero', () => {
    expect(formatDuration(null)).toBe('0m');
    expect(formatDuration(undefined)).toBe('0m');
  });
});

describe('formatShareDate', () => {
  it('formats a YYYY-MM-DD key without leading zeros on the day', () => {
    expect(formatShareDate('2026-07-02')).toBe('Jul 2, 2026');
    expect(formatShareDate('2026-12-25')).toBe('Dec 25, 2026');
    expect(formatShareDate('2026-01-01')).toBe('Jan 1, 2026');
  });

  it('accepts a full ISO string by using its date half', () => {
    expect(formatShareDate('2026-03-15T09:30:00.000Z')).toBe('Mar 15, 2026');
  });

  it('returns empty string for missing/invalid input', () => {
    expect(formatShareDate('')).toBe('');
    expect(formatShareDate(null)).toBe('');
    expect(formatShareDate('not-a-date')).toBe('');
    expect(formatShareDate('2026-13-40')).toBe('');
  });
});
