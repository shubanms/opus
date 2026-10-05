import { describe, it, expect } from 'vitest';
import { todayPlan, runBefore, REST_AFTER_DAYS } from './todayPlan.js';
import { todayKey } from './dateKey.js';

// These run under whatever TZ the process has; CI runs them in UTC and the
// fix was verified with TZ=Asia/Kolkata and TZ=America/New_York as well. The
// keys are built from LOCAL wall-clock times, exactly as the hook builds them.
const at = (y, m, d, h = 12, min = 30) => todayKey(new Date(y, m - 1, d, h, min));

describe('runBefore', () => {
  it('counts consecutive days ending yesterday', () => {
    expect(runBefore(['2026-10-02', '2026-10-03', '2026-10-04'], '2026-10-05')).toBe(3);
    expect(runBefore(['2026-10-03', '2026-10-04'], '2026-10-05')).toBe(2);
    expect(runBefore(['2026-10-02', '2026-10-04'], '2026-10-05')).toBe(1);
    expect(runBefore([], '2026-10-05')).toBe(0);
  });

  it('does not count today', () => {
    expect(runBefore(['2026-10-04', '2026-10-05'], '2026-10-05')).toBe(1);
  });

  it('walks across a month end and the US DST change (1 Nov 2026)', () => {
    expect(runBefore(['2026-10-30', '2026-10-31', '2026-11-01'], '2026-11-02')).toBe(3);
    expect(runBefore(['2026-09-29', '2026-09-30'], '2026-10-01')).toBe(2);
  });
});

describe('todayPlan', () => {
  const templates = [
    { id: 1, name: 'Push', dayOfWeek: 1, createdAt: 1 },
    { id: 2, name: 'Pull', dayOfWeek: 3, createdAt: 2 },
  ];
  const fri = '2026-10-02';
  const sat = '2026-10-03';
  const sun = '2026-10-04';
  // Monday 5 Oct 2026.

  it('suggests rest the morning after three days in a row — at any hour', () => {
    for (const h of [0, 3, 5, 6, 12, 18, 21, 23]) {
      const today = at(2026, 10, 5, h);
      expect(today).toBe('2026-10-05');
      const plan = todayPlan({ dates: [fri, sat, sun], today, templates });
      expect(plan.type).toBe('rest');
      expect(plan.reason).toMatch(/^3 days trained in a row/);
    }
  });

  it('does not suggest rest right after the third session (today trained)', () => {
    const plan = todayPlan({ dates: [sat, sun, '2026-10-05'], today: '2026-10-05', templates });
    expect(plan.type).toBe('template');
    expect(plan.template.name).toBe('Push');
  });

  it('a rest day stops being suggested once you train anyway', () => {
    const plan = todayPlan({ dates: [fri, sat, sun, '2026-10-05'], today: '2026-10-05', templates });
    expect(plan.type).not.toBe('rest');
  });

  it('two days in a row is not enough', () => {
    expect(REST_AFTER_DAYS).toBe(3);
    expect(todayPlan({ dates: [sat, sun], today: '2026-10-05', templates }).type).toBe('template');
  });

  it('picks the routine for the LOCAL weekday', () => {
    // Wednesday 7 Oct, late evening local — a UTC key would already be Thursday
    // in New York; early morning — a UTC key would still be Tuesday in India.
    for (const h of [0, 4, 23]) {
      const plan = todayPlan({ dates: [], today: at(2026, 10, 7, h), templates });
      expect(plan.type).toBe('template');
      expect(plan.template.name).toBe('Pull');
    }
  });

  it('the newest routine wins a shared weekday', () => {
    const plan = todayPlan({
      dates: [],
      today: '2026-10-05',
      templates: [...templates, { id: 3, name: 'Workout A', dayOfWeek: 1, createdAt: 99 }],
    });
    expect(plan.template.name).toBe('Workout A');
  });

  it('falls back to a fresh start when nothing is planned', () => {
    expect(todayPlan({ dates: [], today: '2026-10-06', templates }).type).toBe('fresh');
  });
});
