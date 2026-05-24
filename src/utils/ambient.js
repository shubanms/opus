// Pure mapping from progression (streak / level / prestige) to "living scene"
// visual parameters for the Home aura. Higher progression → warmer, brighter,
// livelier. Reduced motion (or effects off) zeroes motionSpeed. Unit-tested.

const clamp01 = (n) => Math.max(0, Math.min(1, n));

export function sceneParams({ streak = 0, level = 1, prestige = 0, reducedMotion = false } = {}) {
  const lv = Math.max(1, Math.min(level, 10));
  const s = Math.max(0, streak);
  const p = Math.max(0, prestige);

  // 0..1 overall energy: level dominates, streak adds, prestige tops it off.
  const intensity = clamp01(
    ((lv - 1) / 9) * 0.6 + (Math.min(s, 30) / 30) * 0.3 + (Math.min(p, 5) / 5) * 0.1
  );

  return {
    intensity,
    glowAlpha: Math.min(0.05 + intensity * 0.35, 0.4),   // outer glow opacity
    goldShade: Math.min(0.15 + intensity * 0.5, 0.65),   // core gold opacity
    glowBlur: Math.round(12 + intensity * 48),           // px blur radius
    motionSpeed: reducedMotion ? 0 : intensity,          // 0..1 liveliness (0 = still)
  };
}
