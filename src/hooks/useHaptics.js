import useSettingsStore from '../store/settingsStore.js';

const PATTERNS = {
  tap: 12,
  success: [25, 40, 50],
  pr: [60, 50, 120],
  levelup: [80, 50, 160],
};

// Returns a fire(kind) function that vibrates (when effects are enabled).
export function useHaptics() {
  const effects = useSettingsStore((s) => s.effects);
  return (kind = 'tap') => {
    if (!effects) return;
    navigator.vibrate?.(PATTERNS[kind] ?? PATTERNS.tap);
  };
}
