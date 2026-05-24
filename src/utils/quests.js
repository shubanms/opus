// Deterministic weekly quests — no backend. Seeded by the Monday-aligned week
// index (whole weeks since the Unix epoch) so the same week always shows the
// same rotating set, and it changes every Monday. Volume targets are stored in
// kg (the internal unit); the UI converts them for display.

export const QUEST_POOL = [
  { id: 'sessions3', metric: 'sessions',     target: 3,     xp: 120, icon: 'dumbbell',   title: 'Showed Up',       desc: 'Complete 3 workouts' },
  { id: 'pr1',       metric: 'prs',          target: 1,     xp: 100, icon: 'trophy',     title: 'New Heights',     desc: 'Set a personal record' },
  { id: 'vol5k',     metric: 'volumeKg',     target: 5000,  xp: 140, icon: 'weight',     title: 'Tonnage',         desc: '', volume: true },
  { id: 'legs2',     metric: 'legsSessions', target: 2,     xp: 120, icon: 'footprints', title: "Don't Skip Legs", desc: 'Train legs twice' },
  { id: 'sets25',    metric: 'sets',         target: 25,    xp: 110, icon: 'listChecks', title: 'Grind',           desc: 'Log 25 working sets' },
  { id: 'variety4',  metric: 'muscleVariety',target: 4,     xp: 120, icon: 'layers',     title: 'Well Rounded',    desc: 'Train 4 muscle groups' },
  { id: 'sessions4', metric: 'sessions',     target: 4,     xp: 180, icon: 'flame',      title: 'Relentless',      desc: 'Complete 4 workouts' },
  { id: 'vol10k',    metric: 'volumeKg',     target: 10000, xp: 220, icon: 'mountain',   title: 'Heavy Week',      desc: '', volume: true },
];

// Muscle groups that count as "legs" for the legs quest.
export const LEG_GROUPS = new Set(['quadriceps', 'hamstring', 'gluteal', 'calves']);

const WEEK_MS = 7 * 86400000;

function mondayOf(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = (d.getDay() + 6) % 7; // 0 = Monday
  d.setDate(d.getDate() - day);
  return d;
}

// Stable per-week key (the Monday's local date, YYYY-MM-DD) used to scope claims.
export function weekKeyOf(date = new Date()) {
  const m = mondayOf(date);
  const y = m.getFullYear();
  const mo = String(m.getMonth() + 1).padStart(2, '0');
  const da = String(m.getDate()).padStart(2, '0');
  return `${y}-${mo}-${da}`;
}

// Epoch-ms of this week's Monday (for filtering timestamped records like PRs).
export function weekStartMs(date = new Date()) {
  return mondayOf(date).getTime();
}

// Monotonic integer week counter, used to seed the rotation.
export function weekIndex(date = new Date()) {
  return Math.floor(mondayOf(date).getTime() / WEEK_MS);
}

// Deterministically pick `count` distinct-metric quests for the given week.
export function weeklyQuests(date = new Date(), count = 3) {
  const len = QUEST_POOL.length;
  const start = ((weekIndex(date) % len) + len) % len;
  const picked = [];
  const seenMetrics = new Set();
  for (let i = 0; i < len && picked.length < count; i++) {
    const def = QUEST_POOL[(start + i) % len];
    if (seenMetrics.has(def.metric)) continue;
    seenMetrics.add(def.metric);
    picked.push(def);
  }
  return picked;
}
