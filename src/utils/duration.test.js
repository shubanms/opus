import { describe, it, expect } from 'vitest';
import { formatDuration, formatClock } from './duration.js';

describe('formatDuration', () => {
  it('reads as prose', () => {
    expect(formatDuration(0)).toBe('0m');
    expect(formatDuration(59)).toBe('0m');
    expect(formatDuration(60)).toBe('1m');
    expect(formatDuration(2700)).toBe('45m');
    expect(formatDuration(3600)).toBe('1h 0m');
    expect(formatDuration(4320)).toBe('1h 12m');
  });

  it('does not round a partial minute up', () => {
    // 119s is one minute of training, not two.
    expect(formatDuration(119)).toBe('1m');
  });

  it('survives junk and negatives', () => {
    expect(formatDuration(-10)).toBe('0m');
    expect(formatDuration(undefined)).toBe('0m');
    expect(formatDuration(Number.NaN)).toBe('0m');
    expect(formatDuration('900')).toBe('15m');
  });
});

describe('formatClock', () => {
  it('counts like a stopwatch', () => {
    expect(formatClock(0)).toBe('0:00');
    expect(formatClock(9)).toBe('0:09');
    expect(formatClock(64)).toBe('1:04');
    expect(formatClock(600)).toBe('10:00');
  });

  it('adds hours only once there are hours', () => {
    expect(formatClock(3599)).toBe('59:59');
    expect(formatClock(3600)).toBe('1:00:00');
    expect(formatClock(4322)).toBe('1:12:02');
  });

  it('pads minutes only when hours are showing', () => {
    // "08:04" makes an eight-minute session look like an eight-hour one.
    expect(formatClock(484)).toBe('8:04');
    expect(formatClock(3844)).toBe('1:04:04');
  });

  it('survives junk and negatives', () => {
    expect(formatClock(-5)).toBe('0:00');
    expect(formatClock(undefined)).toBe('0:00');
    expect(formatClock(Number.NaN)).toBe('0:00');
  });
});
