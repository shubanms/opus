import { describe, it, expect } from 'vitest';
import { todaysDungeon, DUNGEON_THEMES, AFFIXES } from './dungeon.js';

describe('todaysDungeon', () => {
  it('is deterministic for a date key', () => {
    const a = todaysDungeon('2026-07-17');
    const b = todaysDungeon('2026-07-17');
    expect(a).toEqual(b);
  });
  it('picks a real theme and boss', () => {
    const d = todaysDungeon('2026-07-17');
    expect(DUNGEON_THEMES.some((t) => t.name === d.name && t.boss === d.boss)).toBe(true);
  });
  it('has 1–3 distinct affixes', () => {
    for (const key of ['2026-07-17', '2026-07-18', '2026-01-01', '2025-12-31']) {
      const d = todaysDungeon(key);
      expect(d.affixes.length).toBeGreaterThanOrEqual(1);
      expect(d.affixes.length).toBeLessThanOrEqual(3);
      const ids = d.affixes.map((a) => a.id);
      expect(new Set(ids).size).toBe(ids.length); // distinct
      for (const a of d.affixes) expect(AFFIXES.some((x) => x.id === a.id)).toBe(true);
    }
  });
  it('rewards Iron in a sane range', () => {
    const d = todaysDungeon('2026-07-17');
    expect(d.ironReward).toBeGreaterThanOrEqual(120);
    expect(d.ironReward).toBeLessThanOrEqual(200);
  });
  it('varies across days', () => {
    const names = new Set(['2026-07-17', '2026-07-18', '2026-07-19', '2026-07-20', '2026-07-21'].map((k) => todaysDungeon(k).name));
    expect(names.size).toBeGreaterThan(1);
  });
});
