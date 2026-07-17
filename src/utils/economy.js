// Iron economy — a soft currency earned from training and spent in the Vault on
// cosmetics. Earned Iron is *derived from history* (finished workouts + PRs +
// claimed quests), so existing users already have a fair balance with no
// migration and deletes re-derive it. Spending (ironSpent) + owned/equipped
// cosmetics live in settings. Pure + unit-tested.
import { hashSeed } from './crit.js';

export const IRON_PER_SESSION = 25;
export const IRON_PER_PR = 10;
export const IRON_PER_QUEST = 40;
export const CHEST_PRICE = 200;

export function earnedIron({ workouts = 0, prCount = 0, questClaims = 0, bonusIron = 0 } = {}) {
  return (workouts || 0) * IRON_PER_SESSION + (prCount || 0) * IRON_PER_PR + (questClaims || 0) * IRON_PER_QUEST + (bonusIron || 0);
}

export function ironBalance(earned = 0, spent = 0) {
  return Math.max(0, Math.round(earned || 0) - Math.round(spent || 0));
}

export function canAfford(balance, price) {
  return (balance || 0) >= (price || 0);
}

// Cosmetics catalog. `type`: 'cardTheme' | 'logoSkin' | 'titleFlair'.
export const COSMETICS = [
  { id: 'flair_ironclad', type: 'titleFlair', name: 'Ironclad', rarity: 'rare', price: 300, value: '⚔️' },
  { id: 'flair_ember', type: 'titleFlair', name: 'Ember', rarity: 'rare', price: 300, value: '🔥' },
  { id: 'flair_bolt', type: 'titleFlair', name: 'Charged', rarity: 'rare', price: 300, value: '⚡' },
  { id: 'flair_crown', type: 'titleFlair', name: 'Crowned', rarity: 'epic', price: 600, value: '👑' },
  { id: 'theme_slate', type: 'cardTheme', name: 'Slate', rarity: 'common', price: 150, value: 'slate' },
  { id: 'theme_amethyst', type: 'cardTheme', name: 'Amethyst', rarity: 'epic', price: 600, value: 'amethyst' },
  { id: 'theme_obsidian', type: 'cardTheme', name: 'Obsidian', rarity: 'legendary', price: 900, value: 'obsidian' },
  { id: 'skin_frost', type: 'logoSkin', name: 'Frost Mark', rarity: 'rare', price: 300, value: 'frost' },
  { id: 'skin_gilded', type: 'logoSkin', name: 'Gilded Mark', rarity: 'epic', price: 600, value: 'gilded' },
];

export const RARITY_ORDER = { common: 0, rare: 1, epic: 2, legendary: 3 };

export function cosmeticById(id) {
  return COSMETICS.find((c) => c.id === id) || null;
}

// Deterministic chest roll: pick an un-owned cosmetic, rarer items far less
// likely. Returns the cosmetic or null if everything is already owned.
export function rollChest(seed, ownedIds = []) {
  const owned = new Set(ownedIds);
  const pool = COSMETICS.filter((c) => !owned.has(c.id));
  if (!pool.length) return null;
  const weights = pool.map((c) => 1 / Math.pow((RARITY_ORDER[c.rarity] ?? 0) + 1, 2));
  const total = weights.reduce((a, b) => a + b, 0);
  let r = hashSeed(seed, 'chest') * total;
  for (let i = 0; i < pool.length; i++) {
    r -= weights[i];
    if (r <= 0) return pool[i];
  }
  return pool[pool.length - 1];
}
