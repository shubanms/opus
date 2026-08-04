// Boss gates: hard milestone challenges. You cannot pass a gate level on XP
// alone — the boss's feat (verifiable from lifetime stats) must be cleared
// first. Pure + unit-tested; tests read the same stats shape as achievements
// (computeStats): { totalVolume, bestStreak, prCount, muscleVariety, ... }.

export const BOSSES = [
  { gate: 10, key: 'boss10', title: 'The Proving',  desc: 'Lift 25,000 kg in total',                 test: (s) => s.totalVolume >= 25000 },
  { gate: 20, key: 'boss20', title: 'The Gauntlet', desc: 'Reach a 7-day training streak',           test: (s) => s.bestStreak >= 7 },
  { gate: 30, key: 'boss30', title: 'The Crucible', desc: 'Set 10 personal records',                 test: (s) => s.prCount >= 10 },
  { gate: 40, key: 'boss40', title: 'The Titan',    desc: 'Lift 150,000 kg in total',                test: (s) => s.totalVolume >= 150000 },
  { gate: 50, key: 'boss50', title: 'The Apex',     desc: 'Train all 15 muscle groups + a 30-day streak', test: (s) => s.muscleVariety >= 15 && s.bestStreak >= 30 },
];

// Highest level reachable given the stats: capped at the first uncleared gate.
export function levelCap(stats) {
  for (const b of BOSSES) {
    if (!stats || !b.test(stats)) return b.gate;
  }
  return Number.POSITIVE_INFINITY;
}

export function cappedLevel(rawLevel, stats) {
  return Math.min(rawLevel, levelCap(stats));
}

// The boss currently blocking progress: the first uncleared boss whose gate the
// raw (XP-earned) level has reached. null if nothing is blocking.
export function activeBoss(rawLevel, stats) {
  for (const b of BOSSES) {
    if (!stats || !b.test(stats)) return rawLevel >= b.gate ? b : null;
  }
  return null;
}

// Each boss with its cleared flag (for the progression ladder).
export function bossList(stats) {
  return BOSSES.map((b) => ({ ...b, cleared: !!stats && b.test(stats) }));
}
