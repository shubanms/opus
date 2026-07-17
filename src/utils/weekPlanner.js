// Split-aware WEEK planner. Turns a chosen split + days/week + level + session
// length + rest preference into a full week of day-routines, composing the
// single-day generateRoutine() per day. Pure (seeded rng, no DB/Date) so it's
// unit-testable and shared by web + native. Each day is ready for the platform's
// createTemplate: { name, dayOfWeek, autoKey, groups, exercises:[{exerciseId,
// targetSets, targetReps, targetWeight, targetRest}] }.
import { generateRoutine, LEVEL_DEFAULTS } from './routineGenerator.js';

// Muscle buckets over the 15-token taxonomy (matches routineName's grouping).
const PUSH = ['chest', 'front-deltoids', 'triceps'];
const PULL = ['upper-back', 'lower-back', 'trapezius', 'back-deltoids', 'biceps', 'forearm'];
const LEGS = ['quadriceps', 'hamstring', 'gluteal', 'calves'];
const CORE = ['abs', 'obliques'];
const CHEST = ['chest'];
const BACK = ['upper-back', 'lower-back', 'trapezius'];
const SHOULDERS = ['front-deltoids', 'back-deltoids'];
const ARMS = ['biceps', 'triceps', 'forearm'];
const UPPER = [...PUSH, ...PULL];
const LOWER = [...LEGS, ...CORE];
const FULL = [...PUSH, ...PULL, ...LEGS];
const CHEST_BACK = [...CHEST, ...BACK];
const SHOULDER_ARMS = [...SHOULDERS, ...ARMS];

// Append A/B/C… when a day name repeats within the week (Push A / Push B).
function letterize(blueprints) {
  const counts = {};
  for (const b of blueprints) counts[b.name] = (counts[b.name] || 0) + 1;
  const seen = {};
  return blueprints.map((b) => {
    if (counts[b.name] > 1) {
      seen[b.name] = (seen[b.name] || 0) + 1;
      return { ...b, name: `${b.name} ${String.fromCharCode(64 + seen[b.name])}` };
    }
    return b;
  });
}

// Each split: allowed days-per-week + a layout(days) → ordered day blueprints
// ({ key, name, groups }). key becomes the day's autoKey (day-of-week re-match).
export const SPLITS = {
  ppl: {
    key: 'ppl', label: 'Push · Pull · Legs',
    blurb: 'The classic. Push, pull and legs on rotation — great balance of frequency and recovery.',
    days: [3, 6],
    layout: (d) => {
      const base = [
        { key: 'push', name: 'Push', groups: PUSH },
        { key: 'pull', name: 'Pull', groups: PULL },
        { key: 'legs', name: 'Legs', groups: LEGS },
      ];
      return letterize(d >= 6 ? [...base, ...base] : base);
    },
  },
  arnold: {
    key: 'arnold', label: 'Arnold',
    blurb: 'Opposing groups together — Chest/Back, Shoulders/Arms, Legs. High volume, big pumps.',
    days: [6],
    layout: () => letterize([
      { key: 'chest-back', name: 'Chest & Back', groups: CHEST_BACK },
      { key: 'shoulders-arms', name: 'Shoulders & Arms', groups: SHOULDER_ARMS },
      { key: 'legs', name: 'Legs', groups: LEGS },
      { key: 'chest-back', name: 'Chest & Back', groups: CHEST_BACK },
      { key: 'shoulders-arms', name: 'Shoulders & Arms', groups: SHOULDER_ARMS },
      { key: 'legs', name: 'Legs', groups: LEGS },
    ]),
  },
  upperLower: {
    key: 'upperLower', label: 'Upper · Lower',
    blurb: 'Every muscle 2–3×/week. Alternate upper- and lower-body days.',
    days: [4, 6],
    layout: (d) => {
      const pair = [
        { key: 'upper', name: 'Upper', groups: UPPER },
        { key: 'lower', name: 'Lower', groups: LOWER },
      ];
      return letterize(d >= 6 ? [...pair, ...pair, ...pair] : [...pair, ...pair]);
    },
  },
  ulppl: {
    key: 'ulppl', label: 'Upper · Lower · PPL',
    blurb: 'Two heavy strength days, then three PPL hypertrophy days. Two rest days a week.',
    days: [5],
    layout: () => [
      { key: 'upper', name: 'Upper', groups: UPPER },
      { key: 'lower', name: 'Lower', groups: LOWER },
      { key: 'push', name: 'Push', groups: PUSH },
      { key: 'pull', name: 'Pull', groups: PULL },
      { key: 'legs', name: 'Legs', groups: LEGS },
    ],
  },
  bro: {
    key: 'bro', label: 'Body-part (Bro)',
    blurb: 'One muscle group a day — obliterate it, then a full week to recover.',
    days: [5],
    layout: () => [
      { key: 'chest', name: 'Chest', groups: CHEST },
      { key: 'back', name: 'Back', groups: BACK },
      { key: 'legs', name: 'Legs', groups: LEGS },
      { key: 'shoulders', name: 'Shoulders', groups: SHOULDERS },
      { key: 'arms', name: 'Arms', groups: ARMS },
    ],
  },
  fullBody: {
    key: 'fullBody', label: 'Full Body',
    blurb: 'Whole body each session while fresh. Ideal for 3–5 focused days a week.',
    days: [3, 4, 5],
    layout: (d) => letterize(Array.from({ length: d }, () => ({ key: 'full-body', name: 'Full Body', groups: FULL }))),
  },
};

// Ordered list for pickers.
export const SPLIT_LIST = Object.values(SPLITS);

// Which weekdays (1=Mon … 7=Sun) the N training days land on, spreading rest.
export function weekdayLayout(days) {
  const MAP = { 1: [1], 2: [1, 4], 3: [1, 3, 5], 4: [1, 2, 4, 5], 5: [1, 2, 3, 4, 5], 6: [1, 2, 3, 4, 5, 6], 7: [1, 2, 3, 4, 5, 6, 7] };
  return MAP[days] || MAP[Math.min(6, Math.max(1, days))];
}

// Rest between sets (seconds), by preference and whether the lift is a big
// compound. Mirrors typical guidance (compounds rest longer than isolation).
export const REST_PREFS = ['short', 'standard', 'long'];
export function restFor(pref, isCompound) {
  const T = { short: [90, 45], standard: [150, 75], long: [210, 105] };
  const [comp, iso] = T[pref] || T.standard;
  return isCompound ? comp : iso;
}

// Barbell (and heavy bodyweight) lifts read as compounds for rest purposes.
function isCompound(ex) {
  if (!ex) return false;
  return ex.equipment === 'barbell';
}

// Exercises per day from the time budget (falls back to the level default).
export function sessionCount(sessionMinutes, level) {
  const base = (LEVEL_DEFAULTS[level] || LEVEL_DEFAULTS.beginner).count;
  if (!sessionMinutes) return base;
  const m = Number(sessionMinutes);
  const n = m <= 30 ? 4 : m <= 45 ? 5 : m <= 60 ? 6 : m <= 75 ? 7 : 8;
  return Math.max(3, Math.min(8, n));
}

// Nearest allowed days-per-week for a split.
export function resolveDays(split, days) {
  const def = SPLITS[split];
  if (!def) return days;
  if (def.days.includes(days)) return days;
  return def.days.reduce((best, d) => (Math.abs(d - days) < Math.abs(best - days) ? d : best), def.days[0]);
}

// Plan a whole week. Returns an array of day objects ready for createTemplate.
export function planWeek({ split, days, level = 'intermediate', sessionMinutes = 0, rest = 'standard', exercises = [], rng }) {
  const def = SPLITS[split];
  if (!def) return [];
  const dayCount = resolveDays(split, days);
  const blueprints = def.layout(dayCount);
  const weekdays = weekdayLayout(blueprints.length);
  const count = sessionCount(sessionMinutes, level);
  const byId = new Map(exercises.map((e) => [e.id, e]));

  return blueprints.map((bp, i) => {
    const slots = generateRoutine({ exercises, groups: bp.groups, level, count, rng });
    const withRest = slots.map((sl) => ({
      exerciseId: sl.exerciseId,
      targetSets: sl.targetSets,
      targetReps: sl.targetReps,
      targetWeight: sl.targetWeight ?? null,
      targetRest: restFor(rest, isCompound(byId.get(sl.exerciseId))),
    }));
    return { name: bp.name, dayOfWeek: weekdays[i] ?? null, autoKey: bp.key, groups: bp.groups, exercises: withRest };
  });
}
