import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

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

function loadWorker(listeners = {}) {
  const self = {
    addEventListener: (type, fn) => { listeners[type] = fn; },
    registration: { showNotification: () => Promise.resolve() },
    clients: { matchAll: () => Promise.resolve([]), openWindow: () => Promise.resolve() },
  };
  const factory = new Function(
    'self',
    'indexedDB',
    `${source}\nreturn { inQuietHours, daysBetween, effectiveLast, dayKey, OPUS_TAG };`
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
