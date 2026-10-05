import { describe, it, expect } from 'vitest';
import { earnedIron, earnedIronFrom, ironBalance, canAfford, COSMETICS, cosmeticById, rollChest, CHEST_PRICE, TOKEN_IRON_PRICE, sessionIron, IRON_PER_SESSION, IRON_PER_PR, IRON_PER_QUEST } from './economy.js';

describe('earnedIron', () => {
  it('sums sessions, PRs and quests', () => {
    expect(earnedIron({ workouts: 4, prCount: 2, questClaims: 1 })).toBe(4 * 25 + 2 * 10 + 40);
  });
  it('is 0 with no history', () => { expect(earnedIron({})).toBe(0); });
});

describe('ironBalance', () => {
  it('is earned minus spent', () => { expect(ironBalance(500, 200)).toBe(300); });
  it('never goes negative', () => { expect(ironBalance(100, 400)).toBe(0); });
});

describe('canAfford', () => {
  it('checks the price against balance', () => {
    expect(canAfford(300, 300)).toBe(true);
    expect(canAfford(299, 300)).toBe(false);
  });
});

describe('sessionIron', () => {
  it('is the flat session base plus per-PR bonus', () => {
    expect(sessionIron(0)).toBe(25);
    expect(sessionIron(3)).toBe(25 + 3 * 10);
  });
  it('handles missing prCount', () => { expect(sessionIron()).toBe(25); });
});

describe('token exchange', () => {
  it('has a positive Iron price', () => { expect(TOKEN_IRON_PRICE).toBeGreaterThan(0); });
});

describe('cosmetics', () => {
  it('every cosmetic has id/type/price/rarity', () => {
    for (const c of COSMETICS) {
      expect(c.id && c.type && c.rarity).toBeTruthy();
      expect(c.price).toBeGreaterThan(0);
    }
  });
  it('only sells title flair (the one cosmetic type that is applied)', () => {
    expect(COSMETICS.every((c) => c.type === 'titleFlair')).toBe(true);
  });
  it('cosmeticById finds and misses correctly', () => {
    expect(cosmeticById('flair_crown').name).toBe('Crowned');
    expect(cosmeticById('nope')).toBeNull();
  });
});

describe('rollChest', () => {
  it('is deterministic for a seed', () => {
    expect(rollChest(123, []).id).toBe(rollChest(123, []).id);
  });
  it('never returns an already-owned cosmetic', () => {
    const owned = COSMETICS.slice(0, COSMETICS.length - 1).map((c) => c.id);
    expect(rollChest(7, owned).id).toBe(COSMETICS[COSMETICS.length - 1].id);
  });
  it('returns null when everything is owned', () => {
    expect(rollChest(1, COSMETICS.map((c) => c.id))).toBeNull();
  });
  it('has a sane chest price', () => { expect(CHEST_PRICE).toBeGreaterThan(0); });
});

describe('earnedIronFrom', () => {
  // Legacy history: two workouts from before `ironEarned` existed, with three
  // record rows between them (bench weight + reps from #1, squat from #2).
  const legacyWorkouts = [{ id: 1 }, { id: 2 }];
  const legacySets = [
    { workoutId: 1, exerciseId: 10, isWarmup: false },
    { workoutId: 1, exerciseId: 11, isWarmup: true },
    { workoutId: 2, exerciseId: 20, isWarmup: false },
  ];
  const legacyPrs = [
    { exerciseId: 10, type: 'weight', workoutId: 1 },
    { exerciseId: 10, type: 'reps', workoutId: 1 },
    { exerciseId: 20, type: 'weight', workoutId: 2 },
  ];

  it('gives an untouched legacy history exactly what the old formula did', () => {
    const before = earnedIron({ workouts: 2, prCount: 3, questClaims: 1 });
    expect(earnedIronFrom({ workouts: legacyWorkouts, prs: legacyPrs, sets: legacySets, questClaims: 1 })).toBe(before);
  });

  it('pays what the finish screen promised when a record row is overwritten', () => {
    // The bug: beating two existing records rewrites those two rows in place,
    // so the row count does not move and "+45" paid 25. Now the new session's
    // own `ironEarned` (25 + 2 × 10) is what it adds — and the old records,
    // whose rows now point at the new workout, still count for the old ones.
    const before = earnedIronFrom({ workouts: legacyWorkouts, prs: legacyPrs, sets: legacySets });
    const after = earnedIronFrom({
      workouts: [...legacyWorkouts, { id: 3, ironEarned: IRON_PER_SESSION + 2 * IRON_PER_PR }],
      prs: [
        { exerciseId: 10, type: 'weight', workoutId: 3 },
        { exerciseId: 10, type: 'reps', workoutId: 1 },
        { exerciseId: 20, type: 'weight', workoutId: 3 },
      ],
      sets: legacySets,
    });
    expect(after - before).toBe(45);
  });

  it('does not double-pay a first-ever record set after the change', () => {
    // Exercise 30 was never trained before: its record row is new, and its
    // Iron is already inside the session's `ironEarned`.
    const after = earnedIronFrom({
      workouts: [...legacyWorkouts, { id: 3, ironEarned: 35 }],
      prs: [...legacyPrs, { exerciseId: 30, type: 'weight', workoutId: 3 }],
      sets: legacySets,
    });
    const before = earnedIronFrom({ workouts: legacyWorkouts, prs: legacyPrs, sets: legacySets });
    expect(after - before).toBe(35);
  });

  it('takes dungeon Iron away with the workout that earned it', () => {
    const rows = [{ id: 5, ironEarned: 25, dungeonIron: 160 }, { id: 6, ironEarned: 45, dungeonIron: 0 }];
    expect(earnedIronFrom({ workouts: rows })).toBe(25 + 160 + 45);
    expect(earnedIronFrom({ workouts: rows.slice(1) })).toBe(45);
  });

  it('reverts a deleted legacy workout and its records', () => {
    const remaining = earnedIronFrom({
      workouts: [{ id: 2 }],
      prs: [{ exerciseId: 20, type: 'weight', workoutId: 2 }],
      sets: legacySets.filter((x) => x.workoutId === 2),
    });
    expect(remaining).toBe(IRON_PER_SESSION + IRON_PER_PR);
  });

  it('counts a legacy record whose row lost its workout id', () => {
    // Older rebuilds stamped workoutId: null. The exercise still proves the
    // record is from a legacy session.
    const prs = [{ exerciseId: 10, type: 'weight', workoutId: null }];
    expect(earnedIronFrom({ workouts: [{ id: 1 }], prs, sets: legacySets })).toBe(IRON_PER_SESSION + IRON_PER_PR);
  });

  it('pays quests at the flat rate', () => {
    expect(earnedIronFrom({ questClaims: 3 })).toBe(3 * IRON_PER_QUEST);
  });

  it('is zero for nothing, and survives junk', () => {
    expect(earnedIronFrom()).toBe(0);
    expect(earnedIronFrom({ workouts: [null, { id: 1, ironEarned: 'NaN' }], prs: [null], sets: [null], questClaims: -2 })).toBe(IRON_PER_SESSION);
    expect(earnedIronFrom({ workouts: [{ id: 1, ironEarned: -40, dungeonIron: -5 }] })).toBe(0);
  });

  it('treats a zero ironEarned as priced, not as legacy', () => {
    expect(earnedIronFrom({ workouts: [{ id: 1, ironEarned: 0 }], prs: [{ exerciseId: 1, workoutId: 1 }] })).toBe(0);
  });
});
