import { describe, it, expect } from 'vitest';
import { sceneParams } from './ambient.js';

describe('sceneParams', () => {
  it('is calm at baseline (level 1, no streak/prestige)', () => {
    const s = sceneParams({ level: 1, streak: 0, prestige: 0 });
    expect(s.intensity).toBe(0);
    expect(s.glowAlpha).toBeCloseTo(0.05, 5);
    expect(s.motionSpeed).toBe(0);
  });

  it('grows monotonically with level, streak and prestige', () => {
    const low = sceneParams({ level: 2, streak: 1, prestige: 0 });
    const high = sceneParams({ level: 9, streak: 20, prestige: 3 });
    expect(high.intensity).toBeGreaterThan(low.intensity);
    expect(high.glowAlpha).toBeGreaterThan(low.glowAlpha);
    expect(high.glowBlur).toBeGreaterThan(low.glowBlur);
    expect(high.goldShade).toBeGreaterThan(low.goldShade);
    expect(high.motionSpeed).toBeGreaterThan(low.motionSpeed);
  });

  it('clamps at the top end', () => {
    const max = sceneParams({ level: 10, streak: 999, prestige: 999 });
    expect(max.intensity).toBeCloseTo(1, 5);
    expect(max.glowAlpha).toBeCloseTo(0.4, 5);
    expect(max.goldShade).toBeCloseTo(0.65, 5);
    expect(max.motionSpeed).toBeCloseTo(1, 5);
  });

  it('reduced motion stills the scene but keeps the glow', () => {
    const s = sceneParams({ level: 10, streak: 30, prestige: 5, reducedMotion: true });
    expect(s.motionSpeed).toBe(0);
    expect(s.glowAlpha).toBeGreaterThan(0.05);
  });
});
