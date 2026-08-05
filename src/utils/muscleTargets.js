// Weekly working sets per muscle group, against a target.
//
// Volume is the lever that actually drives growth, and it is the one thing the
// app collected diligently and never reported back. Total sets tells you
// nothing — twenty sets is a great week if they are spread across the body and
// a wasted one if they are all curls.
//
// The targets are weekly *working* sets per muscle, in the range most training
// literature converges on for growth. They are a reference point, not a
// prescription: being under on a deload week is fine, and the app says "low",
// never "wrong".

/**
 * Display names for the anatomical groups the app tracks.
 *
 * Lives here rather than in RecoveryMap because it is shared data, not a
 * component's business — and a component is not somewhere a node-env unit test
 * can import from without dragging the whole render tree along.
 */
export const MUSCLE_LABEL = {
  chest: 'Chest', triceps: 'Triceps', biceps: 'Biceps', 'front-deltoids': 'Front Delts',
  'back-deltoids': 'Rear Delts', 'upper-back': 'Upper Back', 'lower-back': 'Lower Back',
  trapezius: 'Traps', abs: 'Abs', obliques: 'Obliques', quadriceps: 'Quads',
  hamstring: 'Hamstrings', gluteal: 'Glutes', calves: 'Calves', forearm: 'Forearms',
};

const LARGE = 12;
const MEDIUM = 8;
const SMALL = 6;

export const WEEKLY_TARGET = {
  chest: LARGE,
  'upper-back': LARGE,
  quadriceps: LARGE,
  hamstring: LARGE,
  gluteal: LARGE,
  'front-deltoids': MEDIUM,
  'back-deltoids': MEDIUM,
  'lower-back': MEDIUM,
  trapezius: MEDIUM,
  biceps: MEDIUM,
  triceps: MEDIUM,
  abs: MEDIUM,
  calves: SMALL,
  forearm: SMALL,
  obliques: SMALL,
};

/** Which half of the push/pull ledger each muscle sits on. Legs and core are neither. */
export const MOVEMENT = {
  chest: 'push',
  triceps: 'push',
  'front-deltoids': 'push',
  'upper-back': 'pull',
  'lower-back': 'pull',
  trapezius: 'pull',
  'back-deltoids': 'pull',
  biceps: 'pull',
  forearm: 'pull',
  quadriceps: 'legs',
  hamstring: 'legs',
  gluteal: 'legs',
  calves: 'legs',
  abs: 'core',
  obliques: 'core',
};

export const STATUS = { LOW: 'low', ON_TRACK: 'onTrack', OVER: 'over' };

/**
 * One muscle's week.
 *
 * `over` is deliberately generous — 150% of target — because a hard specialised
 * block is a choice, not a mistake, and an app that scolds you for training
 * chest hard is an app you stop reading.
 */
export function muscleStatus(muscle, sets) {
  const target = WEEKLY_TARGET[muscle] ?? MEDIUM;
  const done = Math.max(0, Math.round(Number(sets) || 0));
  const ratio = target > 0 ? done / target : 0;
  let state = STATUS.ON_TRACK;
  if (ratio < 0.6) state = STATUS.LOW;
  else if (ratio > 1.5) state = STATUS.OVER;
  return { muscle, sets: done, target, ratio, state };
}

/**
 * Every tracked muscle's week, hardest-worked first.
 *
 * Untrained muscles are included on purpose: the whole point is to surface what
 * you are *not* doing, and something absent from the list cannot be noticed.
 */
export function weeklyBreakdown(byMuscle) {
  const counts = byMuscle ?? {};
  return Object.keys(WEEKLY_TARGET)
    .map((m) => muscleStatus(m, counts[m] ?? 0))
    .sort((a, b) => b.sets - a.sets || a.muscle.localeCompare(b.muscle));
}

/**
 * Push vs pull, and whether it's lopsided.
 *
 * Most people push far more than they pull and never notice; the shoulders
 * notice eventually. Needs a real sample before it says anything — calling a
 * 3-set week "imbalanced" is noise.
 */
export function pushPullBalance(byMuscle, { minSets = 6 } = {}) {
  const counts = byMuscle ?? {};
  let push = 0;
  let pull = 0;
  for (const [muscle, n] of Object.entries(counts)) {
    const sets = Math.max(0, Number(n) || 0);
    if (MOVEMENT[muscle] === 'push') push += sets;
    if (MOVEMENT[muscle] === 'pull') pull += sets;
  }

  const total = push + pull;
  if (total < minSets) return { push, pull, ratio: null, verdict: 'unknown' };

  // Guard the divide: an all-push week has zero pull.
  const ratio = pull > 0 ? push / pull : Number.POSITIVE_INFINITY;
  let verdict = 'balanced';
  if (ratio > 1.6) verdict = 'pushHeavy';
  else if (ratio < 0.625) verdict = 'pullHeavy';
  return { push, pull, ratio, verdict };
}

/** The one line worth showing about balance, or '' when there's nothing to say. */
export function balanceMessage(balance) {
  switch (balance?.verdict) {
    case 'pushHeavy':
      return `Push-heavy week — ${balance.push} pushing sets to ${balance.pull} pulling.`;
    case 'pullHeavy':
      return `Pull-heavy week — ${balance.pull} pulling sets to ${balance.push} pushing.`;
    case 'balanced':
      return `Push and pull are balanced — ${balance.push} to ${balance.pull}.`;
    default:
      return '';
  }
}
