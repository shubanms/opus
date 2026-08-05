// What to celebrate after a session, in what order, and for how long.
//
// A good session can trigger several things at once — a record, a level, a
// dungeon clear, an achievement. They used to fire simultaneously and stack on
// top of each other. Here they become an ordered queue, and because the
// cinematics deliberately have no skip button, the *total* length is the thing
// that has to stay honest: a rare four-event session plays as a faster montage
// rather than a longer slog.

export const KIND = {
  PR: 'pr',
  LEVEL: 'level',
  DUNGEON: 'dungeon',
  ACHIEVEMENT: 'achievement',
};

/** Full-length durations, ms. Deliberately short — these play every time. */
export const BASE_MS = {
  [KIND.PR]: 2200,
  [KIND.LEVEL]: 2400,
  [KIND.DUNGEON]: 2000,
  [KIND.ACHIEVEMENT]: 2600,
};

// Weight beats volume beats reps. A new best bench is the headline; a new best
// volume on cable curls is not, even if the percentage gain is larger.
const TYPE_RANK = { weight: 3, volume: 2, reps: 1 };

/** Relative improvement over the previous record; 0 for a first-ever record. */
function gain(pr) {
  if (!pr?.prev || pr.prev <= 0) return 0;
  return (pr.value - pr.prev) / pr.prev;
}

/**
 * The one record worth putting on screen.
 *
 * Three sets of three lifts can produce nine records at once; showing nine
 * cinematics would be absurd, and showing an arbitrary one would often pick
 * something trivial. The rest are counted, not played.
 */
export function headlinePR(prs) {
  if (!prs?.length) return null;
  return [...prs].sort((a, b) => {
    const rank = (TYPE_RANK[b.type] ?? 0) - (TYPE_RANK[a.type] ?? 0);
    if (rank !== 0) return rank;
    const byGain = gain(b) - gain(a);
    if (byGain !== 0) return byGain;
    return (b.value ?? 0) - (a.value ?? 0);
  })[0];
}

/**
 * Duration multiplier for a queue of `count` items.
 *
 * One or two events get their full length. Beyond that the session was
 * exceptional, and an exceptional session should feel like a fast highlight
 * reel — not eleven seconds of standing still holding a phone.
 */
export function pace(count) {
  if (count <= 2) return 1;
  if (count === 3) return 0.75;
  return 0.6;
}

/**
 * Build the play queue from a `completeWorkout` result.
 *
 * Returns `[]` for an ordinary session, which is the common case and should
 * cost nothing.
 */
export function queueForResult(result) {
  const items = [];

  const pr = headlinePR(result?.prs);
  if (pr) {
    items.push({ kind: KIND.PR, pr, extra: Math.max(0, (result.prs?.length ?? 1) - 1) });
  }

  if (result?.leveledUp) {
    items.push({ kind: KIND.LEVEL, level: result.newLevel, title: result.newTitle });
  }

  // `alreadyCleared` means the reward was banked on an earlier session today —
  // there is nothing new to celebrate, and a second fanfare would be a lie.
  const d = result?.dungeon;
  if (d?.cleared && !d.alreadyCleared) {
    items.push({ kind: KIND.DUNGEON, name: d.name, iron: d.iron ?? 0, xpBonus: d.xpBonus ?? 0 });
  }

  const achievements = result?.newAchievements ?? [];
  if (achievements.length) {
    items.push({ kind: KIND.ACHIEVEMENT, achievements });
  }

  const scale = pace(items.length);
  return items.map((item, i) => ({
    ...item,
    id: `${item.kind}-${i}`,
    duration: Math.round(BASE_MS[item.kind] * scale),
    // The cinematics stagger their content in on a delay schedule. Shortening
    // the screen without shortening that schedule means the last line arrives
    // as the screen is leaving — so the scale travels with the item.
    scale,
  }));
}

/** Total wall-clock of a queue, ms. */
export function totalDuration(queue) {
  return (queue ?? []).reduce((sum, item) => sum + (item.duration ?? 0), 0);
}

/**
 * One-line version of a cinematic, for when the user has effects switched off.
 *
 * The celebration is optional; the information is not. Someone who turned
 * effects off still needs to be told they levelled up.
 */
export function summarize(item) {
  if (!item) return '';
  switch (item.kind) {
    case KIND.PR: {
      const extra = item.extra > 0 ? ` (+${item.extra} more)` : '';
      return `New ${item.pr?.type ?? 'record'} record — ${item.pr?.name ?? 'lift'}${extra}`;
    }
    case KIND.LEVEL:
      return `Level ${item.level} — ${item.title}`;
    case KIND.DUNGEON:
      return `Dungeon cleared: ${item.name}${item.iron ? ` · +${item.iron} Iron` : ''}`;
    case KIND.ACHIEVEMENT: {
      const n = item.achievements?.length ?? 0;
      return n === 1
        ? `Achievement unlocked: ${item.achievements[0]?.title ?? ''}`
        : `${n} achievements unlocked`;
    }
    default:
      return '';
  }
}
