// The weekly plan as calendar events.
//
// This is the only reminder path with no platform gaps, no permission prompt
// and no server. The v5 research killed the alternatives: Notification Triggers
// is dead (two origin trials, never shipped), no scheduled-local-notification
// API exists on the web at all, and Periodic Background Sync is Chromium-only,
// installed-only and least likely to fire exactly when it matters. A calendar,
// meanwhile, already has a scheduler, already syncs across your devices, and
// already knows how to nag you.
//
// Events are written as *floating* local times — `20260810T180000` with no Z
// and no TZID — which is what a recurring gym session actually is: six in the
// evening wherever you happen to be, not six in the evening in the timezone you
// exported from. It also means no VTIMEZONE block to get wrong.
//
// Pure + unit-tested.

/** RFC 5545 BYDAY codes, indexed by JS `getDay()`. */
export const BYDAY = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];

/**
 * Escape a TEXT value. Backslash first — escaping it after the others would
 * double-escape the backslashes they just inserted.
 */
export function escapeText(value) {
  return String(value ?? '')
    .replace(/\\/g, '\\\\')
    .replace(/\r?\n/g, '\\n')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,');
}

/**
 * Fold to 75 octets per line, continuations prefixed with a single space.
 *
 * Counted in octets, not characters: the limit is on bytes, and a routine named
 * with an emoji or an accent would otherwise produce lines that are legal by
 * character count and rejected by strict parsers.
 */
export function foldLine(line) {
  const enc = new TextEncoder();
  if (enc.encode(line).length <= 75) return line;

  const out = [];
  let current = '';
  let bytes = 0;
  for (const ch of line) {
    const size = enc.encode(ch).length;
    // 74 on continuation lines, because the leading space costs an octet too.
    const limit = out.length === 0 ? 75 : 74;
    if (bytes + size > limit) {
      out.push(current);
      current = '';
      bytes = 0;
    }
    current += ch;
    bytes += size;
  }
  if (current) out.push(current);
  return out.map((part, i) => (i === 0 ? part : ` ${part}`)).join('\r\n');
}

/** `YYYYMMDDTHHMMSS` in local time — deliberately no Z, no timezone. */
export function formatLocal(date) {
  const p = (n) => String(n).padStart(2, '0');
  return (
    `${date.getFullYear()}${p(date.getMonth() + 1)}${p(date.getDate())}` +
    `T${p(date.getHours())}${p(date.getMinutes())}${p(date.getSeconds())}`
  );
}

/** UTC stamp, which DTSTAMP does have to be. */
export function formatUtc(date) {
  return `${date.toISOString().replace(/[-:]/g, '').slice(0, 15)}Z`;
}

/**
 * The next time this weekday comes round, at `hour`.
 *
 * Today counts only if the hour has not already passed — starting a weekly
 * series in the past means the first reminder never fires.
 */
export function nextOccurrence(dayOfWeek, hour, from = new Date()) {
  const d = new Date(from.getFullYear(), from.getMonth(), from.getDate(), hour, 0, 0, 0);
  let delta = (dayOfWeek - d.getDay() + 7) % 7;
  if (delta === 0 && d <= from) delta = 7;
  d.setDate(d.getDate() + delta);
  return d;
}

/**
 * A weekly recurring VEVENT per scheduled routine, each with a reminder.
 *
 * Returns null when no routine has a day assigned — an empty calendar file is a
 * confusing thing to hand someone.
 */
export function buildIcs({ templates = [], hour = 18, durationMin = 60, alarmMin = 30, now = new Date() } = {}) {
  const scheduled = (templates ?? []).filter(
    (t) => Number.isInteger(t?.dayOfWeek) && t.dayOfWeek >= 0 && t.dayOfWeek <= 6
  );
  if (!scheduled.length) return null;

  const stamp = formatUtc(now);
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//OPUS//Training Plan//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:OPUS training plan',
  ];

  for (const t of scheduled) {
    const start = nextOccurrence(t.dayOfWeek, hour, now);
    const end = new Date(start.getTime() + durationMin * 60000);
    lines.push(
      'BEGIN:VEVENT',
      // Stable per routine, so re-importing updates the same series instead of
      // stacking a second copy of every session on the calendar.
      `UID:opus-routine-${t.id}@opus.local`,
      `DTSTAMP:${stamp}`,
      `DTSTART:${formatLocal(start)}`,
      `DTEND:${formatLocal(end)}`,
      `RRULE:FREQ=WEEKLY;BYDAY=${BYDAY[t.dayOfWeek]}`,
      `SUMMARY:${escapeText(t.name || 'Training')}`,
      'DESCRIPTION:Scheduled in OPUS.',
      'TRANSP:TRANSPARENT',
      'BEGIN:VALARM',
      `TRIGGER:-PT${alarmMin}M`,
      'ACTION:DISPLAY',
      `DESCRIPTION:${escapeText(t.name || 'Training')} in ${alarmMin} minutes`,
      'END:VALARM',
      'END:VEVENT'
    );
  }

  lines.push('END:VCALENDAR');
  // CRLF is not a style choice here — RFC 5545 requires it, and parsers that
  // accept bare LF are being generous rather than correct.
  return `${lines.map(foldLine).join('\r\n')}\r\n`;
}
