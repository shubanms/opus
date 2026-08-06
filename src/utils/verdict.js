// One honest paragraph about the session you just finished.
//
// The app rewarded the *act* of logging — XP, Iron, badges — and never said
// anything about what was logged. A brilliant session and a junk session earned
// roughly the same points, so the more data you fed it the more points came out
// and you learned nothing.
//
// A verdict always carries both halves: something that went well and something
// that did not. Praise alone is a slot machine; criticism alone is a nag. When
// there is genuinely nothing to flag it says so plainly rather than inventing a
// problem to look clever.

import { sessionEffort } from './effort.js';

/** Minimum prior sessions before "above/below your average" means anything. */
const MIN_HISTORY = 3;
/** How far from the average counts as a real move rather than noise. */
const NOTABLE = 0.12;

function pct(a, b) {
  if (!b) return 0;
  return Math.round(((a - b) / b) * 100);
}

/**
 * Everything the verdict needs, derived from rows the caller already has.
 *
 * `session` is a merged view of the finished workout: the stored row plus the
 * `prCount` that only the completion result knows. `recentVolumes` is previous
 * sessions only — the session being judged must not be in its own baseline.
 */
export function sessionSignals({ session, sets, recentVolumes } = {}) {
  const volume = Math.max(0, Math.round(session?.totalVolume ?? 0));
  // `?? []` rather than a default parameter: a default only covers `undefined`,
  // and a live query that has not resolved yet hands back `null`.
  const history = (recentVolumes ?? []).filter((v) => Number.isFinite(v) && v > 0).slice(0, 8);
  const avg = history.length ? history.reduce((a, b) => a + b, 0) / history.length : null;

  return {
    volume,
    avgVolume: avg,
    hasBaseline: history.length >= MIN_HISTORY,
    volumeDelta: avg ? pct(volume, avg) : 0,
    prCount: Math.max(0, session?.prCount ?? 0),
    sets: Math.max(0, session?.totalSets ?? 0),
    effort: sessionEffort(sets),
  };
}

/**
 * The good half. Returns null when nothing stands out — an invented compliment
 * is worse than silence, because it teaches you to stop reading.
 */
export function pickPraise(s) {
  if (s.prCount > 0) {
    return {
      key: 'records',
      text: `${s.prCount} new record${s.prCount === 1 ? '' : 's'}.`,
    };
  }
  if (s.hasBaseline && s.volumeDelta >= NOTABLE * 100) {
    return { key: 'volumeUp', text: `Volume ${s.volumeDelta}% above your recent average.` };
  }
  if (s.effort.maxSets >= 2) {
    return { key: 'intensity', text: `${s.effort.maxSets} sets taken to failure.` };
  }
  if (s.sets >= 12) {
    return { key: 'workRate', text: `${s.sets} working sets — a full session.` };
  }
  return null;
}

/**
 * The other half, and the part that has to earn its place.
 *
 * Each check is gated on having enough data to be fair: no baseline means no
 * "below average", and an unrated session gets asked for ratings rather than
 * judged on intensity it never reported.
 */
export function pickConcern(s) {
  if (s.hasBaseline && s.volumeDelta <= -NOTABLE * 100 && s.prCount === 0) {
    return {
      key: 'volumeDown',
      text: `Volume was ${Math.abs(s.volumeDelta)}% below your recent average.`,
      // What the loop-closer will check next time.
      metric: 'volume',
      target: Math.round(s.avgVolume),
    };
  }
  if (s.effort.total >= 4 && s.effort.coverage === 0) {
    return {
      key: 'unrated',
      text: 'Nothing was rated, so this session can only be counted, not judged.',
      metric: 'coverage',
      target: 0.5,
    };
  }
  if (s.effort.rated >= 3 && s.effort.avgRpe !== null && s.effort.avgRpe < 7.5) {
    return {
      key: 'easy',
      text: 'Every set felt easy — there is room to add weight.',
      metric: 'avgRpe',
      target: 8,
    };
  }
  return null;
}

/**
 * Read whatever metric an open piece of advice was about.
 *
 * Returns null for a metric this version no longer knows how to measure, so
 * advice stored by an older build ages out quietly instead of throwing.
 */
function readMetric(metric, s) {
  switch (metric) {
    case 'volume':
      return s.volume;
    case 'coverage':
      return s.effort.coverage;
    case 'avgRpe':
      return s.effort.avgRpe;
    default:
      return null;
  }
}

const RESOLVED = {
  volumeDown: (a, actual) =>
    `You brought the volume back — ${actual.toLocaleString()} against the ${a.target.toLocaleString()} you were averaging.`,
  unrated: () => 'You rated this one, so there is finally something to judge it on.',
  easy: () => 'That was harder than last time — exactly the adjustment.',
};

/**
 * Did the thing the last verdict asked for actually happen?
 *
 * This is the beat almost no fitness app has: the app remembers what it said,
 * notices you acted on it, and says so. Silence when it did *not* happen is
 * deliberate — repeating the same criticism every session is nagging, and the
 * new session's own concern will raise it again on its own merits if it still
 * applies.
 */
export function checkAdvice(advice, signals) {
  if (!advice?.metric || !RESOLVED[advice.key]) return null;
  const actual = readMetric(advice.metric, signals);
  if (actual === null || !Number.isFinite(actual)) return null;
  if (actual < advice.target) return null;
  return { key: advice.key, text: RESOLVED[advice.key](advice, actual) };
}

/**
 * The verdict itself.
 *
 * `advice` is the concern in a form the next session can check. It is separate
 * from the prose on purpose: the text is for a person, the advice is for the
 * loop-closer, and neither should be parsed out of the other.
 */
export function buildVerdict(input) {
  const s = sessionSignals(input);
  const closed = checkAdvice(input?.openAdvice, s);
  const praise = pickPraise(s);
  const concern = pickConcern(s);

  const parts = [];
  // The acknowledgement leads, and it replaces the praise rather than stacking
  // with it — "you did the thing I asked" *is* the compliment, and three
  // clauses is a paragraph nobody finishes.
  if (closed) parts.push(closed.text);
  else if (praise) parts.push(praise.text);
  if (concern) parts.push(concern.text);
  if (!parts.length) parts.push('Solid, unremarkable session — those are most of them.');

  return {
    text: parts.join(' '),
    closedKey: closed?.key ?? null,
    praiseKey: closed ? null : (praise?.key ?? null),
    concernKey: concern?.key ?? null,
    advice: concern?.metric
      ? { key: concern.key, metric: concern.metric, target: concern.target }
      : null,
    signals: s,
  };
}
