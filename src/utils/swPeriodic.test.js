import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { scheduleStreak } from './scheduleStreak.js';
import { shiftKey } from './dateKey.js';

// The service worker cannot import from `src/` — it is a plain script loaded
// into a generated Workbox worker, with no bundler and no module graph. So it
// carries its own copy of the streak arithmetic, and a copy nobody tests is a
// copy that drifts. This loads the real file, injects a fake `self`, and pulls
// its internals out to exercise them.
//
// If this file starts failing after an edit to `utils/streak.js`, that is the
// point: the two have gone out of step.

const source = readFileSync(
  fileURLToPath(new URL('../../public/sw-periodic.js', import.meta.url)),
  'utf8'
);

function loadWorker(listeners = {}, clients = { matchAll: () => Promise.resolve([]), openWindow: () => Promise.resolve() }) {
  const self = {
    addEventListener: (type, fn) => { listeners[type] = fn; },
    registration: { showNotification: () => Promise.resolve() },
    clients,
    location: { origin: 'https://example.test' },
  };
  const factory = new Function(
    'self',
    'indexedDB',
    `${source}\nreturn { inQuietHours, daysBetween, effectiveLast, dayKey, OPUS_TAG, scheduleState, nudgeFor, planDays, targetUrl };`
  );
  return factory(self, { open: () => ({}) });
}

const w = loadWorker();

describe('the service worker listens for the right thing', () => {
  it('registers a periodicsync handler under the tag the app uses', () => {
    const listeners = {};
    const loaded = loadWorker(listeners);
    expect(typeof listeners.periodicsync).toBe('function');
    expect(typeof listeners.notificationclick).toBe('function');
    expect(loaded.OPUS_TAG).toBe('opus-streak-check');
  });
});

describe('worker copy of the streak arithmetic', () => {
  it('counts whole days and clamps a backwards clock to zero', () => {
    expect(w.daysBetween('2026-08-04', '2026-08-06')).toBe(2);
    expect(w.daysBetween('2026-08-06', '2026-08-06')).toBe(0);
    expect(w.daysBetween('2026-08-08', '2026-08-06')).toBe(0);
    expect(w.daysBetween('nonsense', '2026-08-06')).toBe(null);
  });

  it('counts the day after a spring-forward change as a day', () => {
    // 23 hours between local midnights; flooring it read "ends tonight" as
    // "already trained today" and the nudge never went out.
    expect(w.daysBetween('2026-03-08', '2026-03-09')).toBe(1);
    expect(w.daysBetween('2026-03-29', '2026-03-30')).toBe(1);
    expect(w.daysBetween('2026-10-25', '2026-10-26')).toBe(1);
  });

  it('honours a rescued lapse, so a paid-for streak is not nagged about', () => {
    const grace = { through: '2026-08-05', for: '2026-08-01' };
    expect(w.effectiveLast({ lastWorkoutDate: '2026-08-01', streakGrace: grace })).toBe('2026-08-05');
    // Stamped to a different lapse — training again must not revive it.
    expect(w.effectiveLast({ lastWorkoutDate: '2026-08-06', streakGrace: grace })).toBe('2026-08-06');
    expect(w.effectiveLast({})).toBe(null);
    expect(w.effectiveLast(null)).toBe(null);
  });

  it('writes local date keys, not UTC ones', () => {
    expect(w.dayKey(new Date(2026, 7, 6, 23, 30))).toBe('2026-08-06');
    expect(w.dayKey(new Date(2026, 0, 1, 0, 5))).toBe('2026-01-01');
  });
});

describe('quiet hours', () => {
  it('wraps midnight, which is the normal case', () => {
    // 22:00 → 07:00.
    expect(w.inQuietHours(23, 22, 7)).toBe(true);
    expect(w.inQuietHours(3, 22, 7)).toBe(true);
    expect(w.inQuietHours(7, 22, 7)).toBe(false);
    expect(w.inQuietHours(12, 22, 7)).toBe(false);
  });

  it('handles a window inside one day', () => {
    expect(w.inQuietHours(10, 9, 17)).toBe(true);
    expect(w.inQuietHours(18, 9, 17)).toBe(false);
  });

  it('treats a missing or empty window as no quiet hours', () => {
    expect(w.inQuietHours(3, null, null)).toBe(false);
    expect(w.inQuietHours(3, 22, 22)).toBe(false);
  });
});

describe('worker copy of the schedule streak', () => {
  // 2026-08-03 is a Monday.
  const MWF = new Set([1, 3, 5]);
  const dates = ['2026-07-27', '2026-07-29', '2026-07-31', '2026-08-03', '2026-08-04', '2026-08-07', '2026-08-12'];

  it('agrees with utils/scheduleStreak on every day of a month', () => {
    for (const plan of [MWF, new Set([0]), new Set([2, 4]), new Set([0, 1, 2, 3, 4, 5, 6])]) {
      for (let i = 0; i < 31; i += 1) {
        const today = shiftKey('2026-07-27', i);
        const real = scheduleStreak({ plan, dates, today });
        const copy = w.scheduleState(plan, dates, today);
        expect(copy.count).toBe(real.count);
        if (real.state === 'atRisk') {
          expect(copy.state).toBe('atRisk');
          expect(copy.nextDue).toBe(real.nextDue);
          expect(copy.deadline).toBe(real.deadline);
        } else {
          expect(copy.state).not.toBe('atRisk');
        }
      }
    }
  });

  it('reads the plan from routines the way the app does', () => {
    expect([...w.planDays([{ dayOfWeek: 1 }, { dayOfWeek: 1 }, { dayOfWeek: null }, { dayOfWeek: 9 }])]).toEqual([1]);
    expect(w.scheduleState(new Set(), dates, '2026-08-05')).toBe(null);
  });
});

describe('what the nudge says', () => {
  const MWF = new Set([1, 3, 5]);
  const trained = ['2026-07-29', '2026-07-31', '2026-08-03'];

  it('never nags a plan follower on a planned rest day', () => {
    // Tuesday after a Monday session: the day streak would say "ends tonight";
    // the plan says Tuesday is rest.
    const profile = { streak: 1, lastWorkoutDate: '2026-08-03' };
    expect(w.nudgeFor({ profile, plan: MWF, dates: trained, today: '2026-08-04' })).toBe(null);
  });

  it('says a session is due on the scheduled day, and "ends tonight" on the last day', () => {
    const due = w.nudgeFor({ profile: {}, plan: MWF, dates: trained, today: '2026-08-05' });
    expect(due.title).toBe('Session day');
    expect(due.body).toContain('3 sessions');
    const last = w.nudgeFor({ profile: {}, plan: MWF, dates: trained, today: '2026-08-06' });
    expect(last.title).toBe('Your streak ends tonight');
    expect(last.body).toBe('3 sessions. One session keeps it.');
  });

  it('stays quiet once the session is in, or the streak is gone', () => {
    expect(w.nudgeFor({ profile: {}, plan: MWF, dates: [...trained, '2026-08-05'], today: '2026-08-05' })).toBe(null);
    expect(w.nudgeFor({ profile: {}, plan: MWF, dates: trained, today: '2026-08-10' })).toBe(null);
  });

  it('counts sessions bought back with rest tokens', () => {
    const profile = { creditedDays: ['2026-08-05'] };
    const n = w.nudgeFor({ profile, plan: MWF, dates: trained, today: '2026-08-07' });
    expect(n.title).toBe('Session day');
    expect(n.body).toContain('4 sessions');
  });

  it('nudges a day streak only on its one deadline, and pluralises properly', () => {
    const one = w.nudgeFor({ profile: { streak: 1, lastWorkoutDate: '2026-08-03' }, plan: new Set(), dates: [], today: '2026-08-04' });
    expect(one.body).toBe('1 day. One session keeps it.');
    const many = w.nudgeFor({ profile: { streak: 6, lastWorkoutDate: '2026-08-03' }, plan: new Set(), dates: [], today: '2026-08-04' });
    expect(many.body).toBe('6 days. One session keeps it.');
    expect(w.nudgeFor({ profile: { streak: 6, lastWorkoutDate: '2026-08-03' }, plan: new Set(), dates: [], today: '2026-08-03' })).toBe(null);
    expect(w.nudgeFor({ profile: { streak: 6, lastWorkoutDate: '2026-08-03' }, plan: new Set(), dates: [], today: '2026-08-05' })).toBe(null);
    expect(w.nudgeFor({ profile: null, plan: new Set(), dates: [], today: '2026-08-05' })).toBe(null);
  });
});

describe('tapping the notification', () => {
  it('keeps the destination inside the app', () => {
    expect(w.targetUrl({ url: '/opus/workout?start=today' })).toBe('/opus/workout?start=today');
    expect(w.targetUrl({ url: 'https://evil.example/' })).toBe('/opus/');
    expect(w.targetUrl(null)).toBe('/opus/');
  });

  it('takes an open app to the notification\'s page instead of just focusing it', async () => {
    const navigated = [];
    const client = {
      url: 'https://example.test/opus/history',
      focus() { return Promise.resolve(client); },
      navigate(u) { navigated.push(u); return Promise.resolve(client); },
    };
    const listeners = {};
    loadWorker(listeners, { matchAll: () => Promise.resolve([client]), openWindow: () => Promise.resolve() });
    let pending;
    listeners.notificationclick({
      notification: { data: { url: '/opus/workout?start=today' }, close() {} },
      waitUntil(p) { pending = p; },
    });
    await pending;
    expect(navigated).toEqual(['https://example.test/opus/workout?start=today']);
  });

  it('opens a window when the app is not running', async () => {
    const opened = [];
    const listeners = {};
    loadWorker(listeners, { matchAll: () => Promise.resolve([]), openWindow: (u) => { opened.push(u); return Promise.resolve(); } });
    let pending;
    listeners.notificationclick({ notification: { data: { url: '/opus/workout?start=today' }, close() {} }, waitUntil(p) { pending = p; } });
    await pending;
    expect(opened).toEqual(['/opus/workout?start=today']);
  });
});
