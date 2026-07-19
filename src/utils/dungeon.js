// Daily Dungeon — a deterministic themed session with random affixes that
// rotates each day. Pure + unit-tested; a function of the date key alone, so
// every device shows the same dungeon and it can't be re-rolled.
import { hashSeed } from './crit.js';

export const DUNGEON_THEMES = [
  { id: 'legs', name: 'Leg Day Labyrinth', group: 'Legs', boss: 'The Quad Colossus' },
  { id: 'push', name: 'Hall of Presses', group: 'Chest', boss: 'The Iron Warden' },
  { id: 'pull', name: 'Vault of Chains', group: 'Back', boss: 'The Lat Leviathan' },
  { id: 'arms', name: 'Gauntlet of Steel', group: 'Arms', boss: 'The Curl Fiend' },
  { id: 'shoulders', name: 'Atlas Ascent', group: 'Shoulders', boss: 'The Deltoid Titan' },
  { id: 'full', name: 'The Crucible', group: 'Full Body', boss: 'The Ironmonger' },
];

export const AFFIXES = [
  { id: 'ironwill', name: 'Iron Will', desc: '+20% XP for clearing the dungeon' },
  { id: 'volatile', name: 'Volatile', desc: 'Crit chance runs hot — more crit sets today' },
  { id: 'glass', name: 'Glass Cannon', desc: 'Double the Iron reward' },
  { id: 'endurance', name: 'Endurance Trial', desc: 'One extra set on every lift — and a longer clear' },
  { id: 'precision', name: 'Precision', desc: 'Hold your form — a steady, focused session' },
  { id: 'berserk', name: 'Berserk', desc: '+30 bonus Iron for every PR you set' },
];

const IRON_BASE = 120;
const BASE_MIN_SETS = 6; // working sets needed to clear the dungeon

// Which stored muscleGroups each theme covers, so "Enter" can auto-generate a
// themed workout from the exercise library instead of an empty session.
export const DUNGEON_MUSCLES = {
  legs: ['quadriceps', 'hamstring', 'gluteal', 'calves'],
  push: ['chest', 'triceps', 'front-deltoids'],
  pull: ['upper-back', 'lower-back', 'trapezius', 'biceps'],
  arms: ['biceps', 'triceps', 'forearm'],
  shoulders: ['front-deltoids', 'back-deltoids', 'trapezius'],
  full: ['chest', 'upper-back', 'quadriceps', 'front-deltoids', 'biceps', 'triceps', 'hamstring'],
};

// Mechanical modifiers derived from the day's affixes. Pure.
export function affixEffects(affixes = []) {
  const ids = new Set((affixes || []).map((a) => a.id));
  return {
    xpMult: ids.has('ironwill') ? 1.2 : 1,
    ironMult: ids.has('glass') ? 2 : 1,
    critBonus: ids.has('volatile') ? 0.2 : 0, // added to the base per-set crit chance
    extraSets: ids.has('endurance') ? 1 : 0,
    perPrIron: ids.has('berserk') ? 30 : 0,
  };
}

// Working sets needed to clear (endurance makes it a longer haul).
export function dungeonObjective(dungeon) {
  const fx = affixEffects(dungeon?.affixes);
  return { minSets: BASE_MIN_SETS + (fx.extraSets ? 2 : 0) };
}

// Whether a finished session clears the dungeon: it must be the dungeon session
// (started via Enter, so themed) and hit the working-set objective.
export function isDungeonCleared(dungeon, { isDungeonSession = false, workingSets = 0 } = {}) {
  if (!dungeon || !isDungeonSession) return false;
  return workingSets >= dungeonObjective(dungeon).minSets;
}

// Total Iron awarded for a clear: base reward × affix Iron multiplier, plus a
// per-PR bonus when Berserk is active.
export function dungeonReward(dungeon, { prCount = 0 } = {}) {
  if (!dungeon) return 0;
  const fx = affixEffects(dungeon.affixes);
  return Math.round((dungeon.ironReward || 0) * fx.ironMult) + fx.perPrIron * (prCount || 0);
}

// The dungeon for a given local date key (YYYY-MM-DD).
export function todaysDungeon(dateKey = '') {
  const idx = Math.floor(hashSeed(dateKey, 'theme') * DUNGEON_THEMES.length);
  const theme = DUNGEON_THEMES[idx];
  const count = 1 + Math.floor(hashSeed(dateKey, 'count') * 3); // 1–3 affixes
  const affixes = AFFIXES
    .map((a, i) => ({ a, w: hashSeed(dateKey, 'affix', i) }))
    .sort((x, y) => y.w - x.w)
    .slice(0, count)
    .map((x) => x.a);
  const ironReward = IRON_BASE + Math.round(hashSeed(dateKey, 'iron') * 80);
  return { dateKey, id: theme.id, name: theme.name, group: theme.group, boss: theme.boss, muscles: DUNGEON_MUSCLES[theme.id] ?? [], affixes, ironReward };
}
