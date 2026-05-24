import { describe, it, expect } from 'vitest';
import { MASCOT_NAME, CLIP, pickLine, clipForKind } from './mascot.js';

const first = () => 0; // deterministic: always pick the first candidate

describe('mascot', () => {
  it('is named Magnus', () => {
    expect(MASCOT_NAME).toBe('Magnus');
  });

  it('returns a non-empty string for every kind', () => {
    for (const kind of ['greet', 'hype', 'firstMeet', 'rest', 'unknown']) {
      const line = pickLine({ kind, rng: first });
      expect(typeof line).toBe('string');
      expect(line.length).toBeGreaterThan(0);
    }
  });

  it('greets with the streak when on a streak', () => {
    expect(pickLine({ kind: 'greet', streak: 7, rng: first })).toContain('7');
  });

  it('greets by time of day when no streak', () => {
    expect(pickLine({ kind: 'greet', streak: 0, hour: 8, rng: first })).toMatch(/Morning/);
    expect(pickLine({ kind: 'greet', streak: 0, hour: 21, rng: first })).toMatch(/Late session/);
  });

  it('first meet introduces Magnus by name', () => {
    expect(pickLine({ kind: 'firstMeet', rng: first })).toContain(MASCOT_NAME);
  });

  it('maps greet/firstMeet to a wave and hype to a known clip', () => {
    expect(clipForKind('greet')).toBe(CLIP.wave);
    expect(clipForKind('firstMeet')).toBe(CLIP.wave);
    const clips = new Set(Object.values(CLIP));
    expect(clips.has(clipForKind('hype', first))).toBe(true);
    expect(clipForKind('whatever')).toBe(CLIP.idle);
  });
});
