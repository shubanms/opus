import { describe, it, expect } from 'vitest';
import { todaysDungeon, DUNGEON_THEMES, AFFIXES, DUNGEON_MUSCLES, affixEffects, dungeonObjective, isDungeonCleared, dungeonReward } from './dungeon.js';

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
  it('exposes a theme id + real muscle groups', () => {
    const d = todaysDungeon('2026-07-17');
    expect(DUNGEON_MUSCLES[d.id]).toBeTruthy();
    expect(d.muscles.length).toBeGreaterThan(0);
  });
});

describe('affixEffects', () => {
  it('defaults to no modifiers', () => {
    expect(affixEffects([])).toEqual({ xpMult: 1, ironMult: 1, critBonus: 0, extraSets: 0, perPrIron: 0 });
  });
  it('maps each affix to its effect', () => {
    expect(affixEffects([{ id: 'ironwill' }]).xpMult).toBeCloseTo(1.2);
    expect(affixEffects([{ id: 'glass' }]).ironMult).toBe(2);
    expect(affixEffects([{ id: 'volatile' }]).critBonus).toBeCloseTo(0.2);
    expect(affixEffects([{ id: 'endurance' }]).extraSets).toBe(1);
    expect(affixEffects([{ id: 'berserk' }]).perPrIron).toBe(30);
  });
});

describe('dungeonObjective', () => {
  it('is the base set count, +2 with endurance', () => {
    expect(dungeonObjective({ affixes: [] }).minSets).toBe(6);
    expect(dungeonObjective({ affixes: [{ id: 'endurance' }] }).minSets).toBe(8);
  });
});

describe('isDungeonCleared', () => {
  const d = { affixes: [] };
  it('needs the dungeon session AND enough working sets', () => {
    expect(isDungeonCleared(d, { isDungeonSession: true, workingSets: 6 })).toBe(true);
    expect(isDungeonCleared(d, { isDungeonSession: true, workingSets: 5 })).toBe(false);
    expect(isDungeonCleared(d, { isDungeonSession: false, workingSets: 20 })).toBe(false);
    expect(isDungeonCleared(null, { isDungeonSession: true, workingSets: 20 })).toBe(false);
  });
});

describe('dungeonReward', () => {
  it('is the base reward, doubled by Glass Cannon', () => {
    expect(dungeonReward({ ironReward: 150, affixes: [] })).toBe(150);
    expect(dungeonReward({ ironReward: 150, affixes: [{ id: 'glass' }] })).toBe(300);
  });
  it('adds a per-PR bonus under Berserk', () => {
    expect(dungeonReward({ ironReward: 150, affixes: [{ id: 'berserk' }] }, { prCount: 2 })).toBe(150 + 60);
  });
});
