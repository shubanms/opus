import { create } from 'zustand';

import { applyTheme } from '../utils/theme.js';

const KEY = 'opus_prefs';
const DEFAULTS = {
  barWeight: 20, unit: 'kg', onboarded: false, effects: true, sound: false, theme: 'system', themeOnOpen: true,
  tourSeen: false, restDuration: 90, stepGoal: 8000, waterGoal: 8, recapDismissedWeek: '', coachMarksSeen: {},
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
    const { barWeight, unit, onboarded, effects, sound, theme, themeOnOpen, tourSeen, restDuration, stepGoal, waterGoal, recapDismissedWeek, coachMarksSeen, inventory } = get();
    localStorage.setItem(KEY, JSON.stringify({ barWeight, unit, onboarded, effects, sound, theme, themeOnOpen, tourSeen, restDuration, stepGoal, waterGoal, recapDismissedWeek, coachMarksSeen, inventory }));
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
