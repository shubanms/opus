// "vs last time" — compare each set you log against the matching set from your
// previous session for this exercise, so the logger can show whether you went
// up, held, or dropped. Pure + unit-tested. Volume (weight×reps) decides the
// arrow; bodyweight sets (no external load) rank by reps alone.

export function setVolume(s) {
  if (!s) return 0;
  const w = s.weight > 0 ? s.weight : 1; // bodyweight: rank by reps
  return w * (s.reps || 0);
}

// Direction + per-metric deltas of a current set vs the matching prior set.
// No prior set → { dir: 'new' } (a set you didn't do last time).
export function diffSet(cur, prev) {
  if (!prev) return { dir: 'new', weightDelta: 0, repsDelta: 0, volumeDelta: 0 };
  const weightDelta = (cur.weight || 0) - (prev.weight || 0);
  const repsDelta = (cur.reps || 0) - (prev.reps || 0);
  const volumeDelta = setVolume(cur) - setVolume(prev);
  let dir = 'same';
  if (volumeDelta > 0) dir = 'up';
  else if (volumeDelta < 0) dir = 'down';
  return { dir, weightDelta, repsDelta, volumeDelta };
}

// Align current working sets to the previous session's working sets by order,
// returning one entry per current working set. Warmups are stripped from both
// sides by default so set N maps to working set N, not "the Nth row".
export function alignSets(currentSets = [], prevSets = [], onlyWorking = true) {
  const cur = onlyWorking ? currentSets.filter((s) => !s.isWarmup) : currentSets.slice();
  const prev = onlyWorking ? prevSets.filter((s) => !s.isWarmup) : prevSets.slice();
  return cur.map((s, i) => ({ set: s, prev: prev[i] ?? null, diff: diffSet(s, prev[i] ?? null) }));
}

// Map of setNumber → diff, convenient for a render loop over mixed warmup/working
// rows (warmup rows simply won't have an entry).
export function diffsBySetNumber(currentSets = [], prevSets = []) {
  const out = {};
  for (const a of alignSets(currentSets, prevSets)) out[a.set.setNumber] = a.diff;
  return out;
}
