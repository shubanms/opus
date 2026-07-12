// Group an active workout's exercises into contiguous superset runs: exercises
// sharing a supersetId with the one directly above them belong to the same run.
// A run of length 1 is a plain standalone exercise (even if it carries a stale
// id), which keeps rendering robust through links/unlinks/removals.
export function supersetRuns(exercises) {
  const runs = [];
  for (const ex of exercises) {
    const last = runs[runs.length - 1];
    if (last && ex.supersetId != null && ex.supersetId === last[last.length - 1].supersetId) last.push(ex);
    else runs.push([ex]);
  }
  return runs;
}

// Exercise ids that should NOT trigger a rest timer — every superset member
// except the last, since you rest once after the whole group.
export function noRestIds(exercises) {
  const ids = new Set();
  for (const run of supersetRuns(exercises)) {
    if (run.length >= 2) run.slice(0, -1).forEach((ex) => ids.add(ex.exerciseId));
  }
  return ids;
}
