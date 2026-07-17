// Personal-record detection, shared by web and native. A workout can set three
// kinds of PR per exercise, each measured on a single working set:
//   weight  — heaviest load lifted
//   reps    — most reps in one set
//   volume  — highest weight×reps in one set
// Warmups never count. This mirrors the web workoutStore PR logic so both apps
// award the same records.

export const PR_TYPES = ['weight', 'reps', 'volume'];

// Per-set maxes across a session's working sets. Returns { weight, reps, volume }.
export function bestOfSession(workingSets = []) {
  let weight = 0, reps = 0, volume = 0;
  for (const s of workingSets) {
    if (s.isWarmup) continue;
    const w = Number(s.weight) || 0;
    const r = Number(s.reps) || 0;
    if (w > weight) weight = w;
    if (r > reps) reps = r;
    const v = w * r;
    if (v > volume) volume = v;
  }
  return { weight, reps, volume };
}

// Given the exercise's existing PR rows (`[{type, value}]`) and this session's
// working sets, return the PRs that were beaten as `[{type, value}]`. A value
// only counts when it strictly exceeds the stored record (or there is none).
export function detectPRs(existing = [], workingSets = []) {
  const best = bestOfSession(workingSets);
  const prevOf = (type) => {
    const row = existing.find((p) => p.type === type);
    return row ? Number(row.value) || 0 : 0;
  };
  const out = [];
  for (const type of PR_TYPES) {
    const value = best[type];
    if (value > 0 && value > prevOf(type)) out.push({ type, value });
  }
  return out;
}

// Human label for a PR type (matches the web Hall of Records wording).
export function prTypeLabel(type) {
  if (type === 'weight') return 'Heaviest weight';
  if (type === 'reps') return 'Most reps';
  if (type === 'volume') return 'Best volume';
  return type;
}
