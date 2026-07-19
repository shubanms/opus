import { describe, it, expect } from 'vitest';
import { earnedIron, ironBalance, canAfford, COSMETICS, cosmeticById, rollChest, CHEST_PRICE, TOKEN_IRON_PRICE, sessionIron } from './economy.js';

describe('earnedIron', () => {
  it('sums sessions, PRs and quests', () => {
    expect(earnedIron({ workouts: 4, prCount: 2, questClaims: 1 })).toBe(4 * 25 + 2 * 10 + 40);
  });
  it('is 0 with no history', () => { expect(earnedIron({})).toBe(0); });
});

describe('ironBalance', () => {
  it('is earned minus spent', () => { expect(ironBalance(500, 200)).toBe(300); });
  it('never goes negative', () => { expect(ironBalance(100, 400)).toBe(0); });
});

describe('canAfford', () => {
  it('checks the price against balance', () => {
    expect(canAfford(300, 300)).toBe(true);
    expect(canAfford(299, 300)).toBe(false);
  });
});

describe('sessionIron', () => {
  it('is the flat session base plus per-PR bonus', () => {
    expect(sessionIron(0)).toBe(25);
    expect(sessionIron(3)).toBe(25 + 3 * 10);
  });
  it('handles missing prCount', () => { expect(sessionIron()).toBe(25); });
});

describe('token exchange', () => {
  it('has a positive Iron price', () => { expect(TOKEN_IRON_PRICE).toBeGreaterThan(0); });
});

describe('cosmetics', () => {
  it('every cosmetic has id/type/price/rarity', () => {
    for (const c of COSMETICS) {
      expect(c.id && c.type && c.rarity).toBeTruthy();
      expect(c.price).toBeGreaterThan(0);
    }
  });
  it('only sells title flair (the one cosmetic type that is applied)', () => {
    expect(COSMETICS.every((c) => c.type === 'titleFlair')).toBe(true);
  });
  it('cosmeticById finds and misses correctly', () => {
    expect(cosmeticById('flair_crown').name).toBe('Crowned');
    expect(cosmeticById('nope')).toBeNull();
  });
});

describe('rollChest', () => {
  it('is deterministic for a seed', () => {
    expect(rollChest(123, []).id).toBe(rollChest(123, []).id);
  });
  it('never returns an already-owned cosmetic', () => {
    const owned = COSMETICS.slice(0, COSMETICS.length - 1).map((c) => c.id);
    expect(rollChest(7, owned).id).toBe(COSMETICS[COSMETICS.length - 1].id);
  });
  it('returns null when everything is owned', () => {
    expect(rollChest(1, COSMETICS.map((c) => c.id))).toBeNull();
  });
  it('has a sane chest price', () => { expect(CHEST_PRICE).toBeGreaterThan(0); });
});
