import { create } from 'zustand';

const KEY = 'opus_prefs';
const DEFAULTS = { barWeight: 20, unit: 'kg', onboarded: false, effects: true, sound: false };

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
    const { barWeight, unit, onboarded, effects, sound } = get();
    localStorage.setItem(KEY, JSON.stringify({ barWeight, unit, onboarded, effects, sound }));
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
