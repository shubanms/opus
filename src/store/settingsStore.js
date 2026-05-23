import { create } from 'zustand';

const KEY = 'opus_prefs';
const DEFAULTS = { barWeight: 20, onboarded: false };

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
    const { barWeight, onboarded } = get();
    localStorage.setItem(KEY, JSON.stringify({ barWeight, onboarded }));
  },
  setBarWeight(barWeight) {
    set({ barWeight });
    get().persist();
  },
  completeOnboarding() {
    set({ onboarded: true });
    get().persist();
  },
}));

export default useSettingsStore;
