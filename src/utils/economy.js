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
// Iron price to buy one rest token in the Vault. A token is otherwise earned
// every 10 workouts (~250 Iron of sessions), so this is a modest sink that
// gives Iron a second use beyond cosmetics.
export const TOKEN_IRON_PRICE = 150;

// Iron earned by a single finished session (before PR bonuses), surfaced on the
// finish screen so the reward is legible.
export function sessionIron(prCount = 0) {
  return IRON_PER_SESSION + (prCount || 0) * IRON_PER_PR;
}

export function earnedIron({ workouts = 0, prCount = 0, questClaims = 0, bonusIron = 0 } = {}) {
  return (workouts || 0) * IRON_PER_SESSION + (prCount || 0) * IRON_PER_PR + (questClaims || 0) * IRON_PER_QUEST + (bonusIron || 0);
}

export function ironBalance(earned = 0, spent = 0) {
  return Math.max(0, Math.round(earned || 0) - Math.round(spent || 0));
}

export function canAfford(balance, price) {
  return (balance || 0) >= (price || 0);
}

// Cosmetics catalog. Only `titleFlair` is currently applied (an emoji beside
// your title on the Profile), so that's all the Vault sells — card themes and
// logo skins were removed because buying them changed nothing visible. New
// title flairs (emoji) can be added here and they work immediately.
export const COSMETICS = [
  { id: 'flair_ironclad', type: 'titleFlair', name: 'Ironclad', rarity: 'rare', price: 300, value: '⚔️' },
  { id: 'flair_ember', type: 'titleFlair', name: 'Ember', rarity: 'rare', price: 300, value: '🔥' },
  { id: 'flair_bolt', type: 'titleFlair', name: 'Charged', rarity: 'rare', price: 300, value: '⚡' },
  { id: 'flair_crown', type: 'titleFlair', name: 'Crowned', rarity: 'epic', price: 600, value: '👑' },
  { id: 'flair_skull', type: 'titleFlair', name: 'Reaper', rarity: 'rare', price: 300, value: '💀' },
  { id: 'flair_star', type: 'titleFlair', name: 'Star', rarity: 'common', price: 150, value: '⭐' },
  { id: 'flair_dragon', type: 'titleFlair', name: 'Dragon', rarity: 'legendary', price: 900, value: '🐉' },
  { id: 'flair_trophy', type: 'titleFlair', name: 'Champion', rarity: 'epic', price: 600, value: '🏆' },
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
  const weights = pool.map((c) => 1 / ((RARITY_ORDER[c.rarity] ?? 0) + 1) ** 2);
  const total = weights.reduce((a, b) => a + b, 0);
  let r = hashSeed(seed, 'chest') * total;
  for (let i = 0; i < pool.length; i++) {
    r -= weights[i];
    if (r <= 0) return pool[i];
  }
  return pool[pool.length - 1];
}
