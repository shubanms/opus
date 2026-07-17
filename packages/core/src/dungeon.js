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
  { id: 'ironwill', name: 'Iron Will', desc: '+20% XP, push through with no long rests' },
  { id: 'volatile', name: 'Volatile', desc: 'Crit chance runs hot today' },
  { id: 'glass', name: 'Glass Cannon', desc: 'Double Iron — but leave nothing in the tank' },
  { id: 'endurance', name: 'Endurance Trial', desc: 'One extra set on every lift' },
  { id: 'precision', name: 'Precision', desc: 'Hit your rep targets exactly' },
  { id: 'berserk', name: 'Berserk', desc: 'Bonus Iron on every PR' },
];

const IRON_BASE = 120;

// The dungeon for a given local date key (YYYY-MM-DD).
export function todaysDungeon(dateKey = '') {
  const theme = DUNGEON_THEMES[Math.floor(hashSeed(dateKey, 'theme') * DUNGEON_THEMES.length)];
  const count = 1 + Math.floor(hashSeed(dateKey, 'count') * 3); // 1–3 affixes
  const affixes = AFFIXES
    .map((a, i) => ({ a, w: hashSeed(dateKey, 'affix', i) }))
    .sort((x, y) => y.w - x.w)
    .slice(0, count)
    .map((x) => x.a);
  const ironReward = IRON_BASE + Math.round(hashSeed(dateKey, 'iron') * 80);
  return { dateKey, name: theme.name, group: theme.group, boss: theme.boss, affixes, ironReward };
}
