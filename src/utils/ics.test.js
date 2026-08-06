import { describe, it, expect } from 'vitest';
import { BYDAY, buildIcs, escapeText, foldLine, formatLocal, formatUtc, nextOccurrence } from './ics.js';

// 2026-08-06 is a Thursday.
const NOW = new Date(2026, 7, 6, 9, 30, 0);
const routine = (id, dayOfWeek, name = 'Push') => ({ id, dayOfWeek, name });

describe('escapeText', () => {
  it('escapes the four things RFC 5545 cares about', () => {
    expect(escapeText('a;b,c')).toBe('a\\;b\\,c');
    expect(escapeText('line\nbreak')).toBe('line\\nbreak');
    expect(escapeText('back\\slash')).toBe('back\\\\slash');
  });

  it('escapes the backslash first', () => {
    // Doing it last would double-escape the backslashes the other rules just
    // inserted, and "a\;b" would come out as "a\\;b".
    expect(escapeText('a\\;')).toBe('a\\\\\\;');
  });

  it('survives junk', () => {
    expect(escapeText(null)).toBe('');
    expect(escapeText(undefined)).toBe('');
  });
});

describe('foldLine', () => {
  it('leaves short lines alone', () => {
    expect(foldLine('SUMMARY:Push')).toBe('SUMMARY:Push');
  });

  it('folds at 75 octets with a leading space on continuations', () => {
    const folded = foldLine(`SUMMARY:${'x'.repeat(200)}`);
    const parts = folded.split('\r\n');
    expect(parts.length).toBeGreaterThan(1);
    expect(parts[0].length).toBe(75);
    for (const p of parts.slice(1)) expect(p.startsWith(' ')).toBe(true);
  });

  it('counts octets, not characters', () => {
    // The limit is on bytes. A name full of emoji is legal by character count
    // and rejected by a strict parser if folded on characters.
    const folded = foldLine(`SUMMARY:${'💪'.repeat(40)}`);
    const enc = new TextEncoder();
    for (const p of folded.split('\r\n')) expect(enc.encode(p).length).toBeLessThanOrEqual(75);
  });

  it('never splits a multi-byte character', () => {
    const folded = foldLine(`SUMMARY:${'💪'.repeat(40)}`);
    expect(folded).not.toContain('�');
    expect(folded.replace(/\r\n /g, '')).toBe(`SUMMARY:${'💪'.repeat(40)}`);
  });
});

describe('formatLocal / formatUtc', () => {
  it('writes a floating local time with no zone marker', () => {
    // Six in the evening wherever you are, not six in the evening in the
    // timezone the file was exported from.
    expect(formatLocal(new Date(2026, 7, 10, 18, 0, 0))).toBe('20260810T180000');
    expect(formatLocal(new Date(2026, 0, 1, 6, 5, 9))).toBe('20260101T060509');
  });

  it('writes DTSTAMP in UTC, which it has to be', () => {
    expect(formatUtc(new Date(Date.UTC(2026, 7, 6, 9, 30, 0)))).toBe('20260806T093000Z');
  });
});

describe('nextOccurrence', () => {
  it('finds the next time that weekday comes round', () => {
    // Thursday 06 Aug → next Monday is the 10th.
    expect(formatLocal(nextOccurrence(1, 18, NOW))).toBe('20260810T180000');
    expect(formatLocal(nextOccurrence(5, 18, NOW))).toBe('20260807T180000');
  });

  it('uses today when the hour has not passed yet', () => {
    expect(formatLocal(nextOccurrence(4, 18, NOW))).toBe('20260806T180000');
  });

  it('skips to next week when today has already gone', () => {
    // Starting a weekly series in the past means the first reminder never
    // fires, which is exactly the thing this feature exists to do.
    const evening = new Date(2026, 7, 6, 20, 0, 0);
    expect(formatLocal(nextOccurrence(4, 18, evening))).toBe('20260813T180000');
  });
});

describe('buildIcs', () => {
  const ics = (templates, opts) => buildIcs({ templates, now: NOW, ...opts });

  it('says nothing when nothing is scheduled', () => {
    // An empty calendar file is a confusing thing to hand someone.
    expect(ics([])).toBe(null);
    expect(ics([{ id: 1, name: 'Ad hoc', dayOfWeek: null }])).toBe(null);
    expect(buildIcs()).toBe(null);
  });

  it('writes one weekly recurring event per scheduled routine', () => {
    const out = ics([routine(1, 1, 'Push'), routine(2, 3, 'Pull')]);
    expect(out.match(/BEGIN:VEVENT/g).length).toBe(2);
    expect(out).toContain('RRULE:FREQ=WEEKLY;BYDAY=MO');
    expect(out).toContain('RRULE:FREQ=WEEKLY;BYDAY=WE');
    expect(out).toContain('SUMMARY:Push');
  });

  it('gives each routine a stable UID', () => {
    // Re-importing has to update the same series, not stack a second copy of
    // every session onto the calendar.
    expect(ics([routine(7, 2)])).toContain('UID:opus-routine-7@opus.local');
    expect(ics([routine(7, 2)])).toBe(ics([routine(7, 2)]));
  });

  it('carries a reminder, which is the entire point', () => {
    const out = ics([routine(1, 1)], { alarmMin: 45 });
    expect(out).toContain('BEGIN:VALARM');
    expect(out).toContain('TRIGGER:-PT45M');
  });

  it('honours the hour and the duration', () => {
    const out = ics([routine(1, 1)], { hour: 7, durationMin: 90 });
    expect(out).toContain('DTSTART:20260810T070000');
    expect(out).toContain('DTEND:20260810T083000');
  });

  it('uses CRLF throughout, as the spec requires', () => {
    const out = ics([routine(1, 1)]);
    expect(out.split('\n').every((l, i, a) => i === a.length - 1 || l.endsWith('\r'))).toBe(true);
    expect(out.endsWith('\r\n')).toBe(true);
  });

  it('escapes a routine name that would otherwise break the file', () => {
    const out = ics([routine(1, 1, 'Legs; heavy, long')]);
    expect(out).toContain('SUMMARY:Legs\\; heavy\\, long');
  });

  it('opens and closes the calendar exactly once', () => {
    const out = ics([routine(1, 1), routine(2, 2)]);
    expect(out.match(/BEGIN:VCALENDAR/g).length).toBe(1);
    expect(out.match(/END:VCALENDAR/g).length).toBe(1);
    expect(out.match(/END:VEVENT/g).length).toBe(2);
  });

  it('maps every weekday to its BYDAY code', () => {
    expect(BYDAY.length).toBe(7);
    for (let d = 0; d < 7; d += 1) {
      expect(ics([routine(1, d)])).toContain(`BYDAY=${BYDAY[d]}`);
    }
  });
});
