import { create } from 'zustand';

import { applyTheme } from '../utils/theme.js';

// Mirror the effects setting onto <html> so CSS can gate the expensive material
// (backdrop-filter) centrally, in one selector, instead of every glass surface
// needing to read the store.
export function applyEffects(on) {
  if (typeof document === 'undefined') return;
  document.documentElement.dataset.fx = on ? 'on' : 'off';
}

const KEY = 'opus_prefs';
const DEFAULTS = {
  barWeight: 20, unit: 'kg', onboarded: false, effects: true, sound: false, theme: 'system', themeOnOpen: true,
  tourSeen: false, restDuration: 90, stepGoal: 8000, waterGoal: 8, recapDismissedWeek: '', coachMarksSeen: {},
  // Streak shield / rest token: tokens spent, tokens bought with Iron, and the
  // lapse date a shield protects. Balance = earned-from-history + bought − spent.
  tokensSpent: 0, tokensPurchased: 0, shieldedLapseDate: null,
  // The lapse a streak-rescue offer was turned down for, so declining once does
  // not re-prompt on every app open until you train again.
  rescueDeclinedFor: null,
  // Iron economy: spent Iron + owned/equipped cosmetics (balance is derived).
  ironSpent: 0, ownedCosmetics: [], equipped: { titleFlair: null, cardTheme: null, logoSkin: null },
  // Daily dungeon: claimed bonus Iron + the date key of the last claim.
  dungeonIron: 0, lastDungeonClaim: '',
  // Equipment per location. barKg null → use global barWeight; plates null → standard
  // set for the current unit; plates are display-unit numbers stamped with `unit`.
  inventory: {
    active: 'gym',
    gym: { barKg: null, plates: null, unit: null },
    home: { barKg: null, plates: null, unit: null },
  },
};

function load() {
  try {
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) || '{}') };
  } catch {
    return { ...DEFAULTS };
  }
}

const useSettingsStore = create((set, get) => ({
  ...load(),
  persist() {
    const { barWeight, unit, onboarded, effects, sound, theme, themeOnOpen, tourSeen, restDuration, stepGoal, waterGoal, recapDismissedWeek, coachMarksSeen, inventory, tokensSpent, tokensPurchased, shieldedLapseDate, rescueDeclinedFor, ironSpent, ownedCosmetics, equipped, dungeonIron, lastDungeonClaim } = get();
    localStorage.setItem(KEY, JSON.stringify({ barWeight, unit, onboarded, effects, sound, theme, themeOnOpen, tourSeen, restDuration, stepGoal, waterGoal, recapDismissedWeek, coachMarksSeen, inventory, tokensSpent, tokensPurchased, shieldedLapseDate, rescueDeclinedFor, ironSpent, ownedCosmetics, equipped, dungeonIron, lastDungeonClaim }));
  },
  claimDungeon(amount, dateKey) {
    set((s) => (s.lastDungeonClaim === dateKey ? s : { dungeonIron: (s.dungeonIron || 0) + amount, lastDungeonClaim: dateKey }));
    get().persist();
  },
  // `count` because a streak rescue costs one token per day missed, while the
  // XP shield has always cost exactly one.
  spendShield(lapseDate, count = 1) {
    set((s) => ({ tokensSpent: (s.tokensSpent || 0) + Math.max(1, count), shieldedLapseDate: lapseDate ?? null }));
    get().persist();
  },
  declineRescue(lapseDate) {
    set({ rescueDeclinedFor: lapseDate ?? null });
    get().persist();
  },
  // Buy a rest token with Iron: record the Iron spend + one purchased token.
  buyToken(price) {
    set((s) => ({ ironSpent: (s.ironSpent || 0) + price, tokensPurchased: (s.tokensPurchased || 0) + 1 }));
    get().persist();
  },
  // Buy a cosmetic: record the spend + add it to owned (idempotent on id).
  buyCosmetic(id, price) {
    set((s) => (s.ownedCosmetics.includes(id) ? s : { ironSpent: (s.ironSpent || 0) + price, ownedCosmetics: [...s.ownedCosmetics, id] }));
    get().persist();
  },
  equipCosmetic(type, id) {
    set((s) => ({ equipped: { ...s.equipped, [type]: s.equipped?.[type] === id ? null : id } }));
    get().persist();
  },
  // Open a chest: spend the chest price and add the rolled cosmetic to owned.
  openChest(price, cosmeticId) {
    set((s) => ({ ironSpent: (s.ironSpent || 0) + price, ownedCosmetics: cosmeticId && !s.ownedCosmetics.includes(cosmeticId) ? [...s.ownedCosmetics, cosmeticId] : s.ownedCosmetics }));
    get().persist();
  },
  setInventoryActive(active) {
    set((s) => ({ inventory: { ...s.inventory, active } }));
    get().persist();
  },
  setInventoryBar(loc, barKg) {
    set((s) => ({ inventory: { ...s.inventory, [loc]: { ...s.inventory[loc], barKg } } }));
    get().persist();
  },
  setInventoryPlates(loc, plates, unit) {
    set((s) => ({ inventory: { ...s.inventory, [loc]: { ...s.inventory[loc], plates, unit } } }));
    get().persist();
  },
  setRecapDismissedWeek(recapDismissedWeek) {
    set({ recapDismissedWeek });
    get().persist();
  },
  markCoachSeen(route) {
    set((s) => ({ coachMarksSeen: { ...s.coachMarksSeen, [route]: true } }));
    get().persist();
  },
  resetCoachMarks() {
    set({ coachMarksSeen: {} });
    get().persist();
  },
  setTourSeen(tourSeen) {
    set({ tourSeen });
    get().persist();
  },
  setRestDuration(restDuration) {
    set({ restDuration });
    get().persist();
  },
  setStepGoal(stepGoal) {
    set({ stepGoal });
    get().persist();
  },
  setWaterGoal(waterGoal) {
    set({ waterGoal });
    get().persist();
  },
  setTheme(theme) {
    set({ theme });
    get().persist();
    applyTheme(theme);
  },
  setBarWeight(barWeight) {
    set({ barWeight });
    get().persist();
  },
  setUnit(unit) {
    set({ unit });
    get().persist();
  },
  setEffects(effects) {
    set({ effects });
    applyEffects(effects);
    get().persist();
  },
  setSound(sound) {
    set({ sound });
    get().persist();
  },
  setThemeOnOpen(themeOnOpen) {
    set({ themeOnOpen });
    get().persist();
  },
  completeOnboarding() {
    set({ onboarded: true });
    get().persist();
  },
}));

export default useSettingsStore;
