import { create } from 'zustand';

import { applyTheme } from '../utils/theme.js';

const KEY = 'opus_prefs';
const DEFAULTS = { barWeight: 20, unit: 'kg', onboarded: false, effects: true, sound: false, theme: 'system', tourSeen: false, restDuration: 90, stepGoal: 8000, waterGoal: 8 };

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
    const { barWeight, unit, onboarded, effects, sound, theme, tourSeen, restDuration, stepGoal, waterGoal } = get();
    localStorage.setItem(KEY, JSON.stringify({ barWeight, unit, onboarded, effects, sound, theme, tourSeen, restDuration, stepGoal, waterGoal }));
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
  completeOnboarding() {
    set({ onboarded: true });
    get().persist();
  },
}));

export default useSettingsStore;
