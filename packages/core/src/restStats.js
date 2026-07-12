// Rest analysis derived from set `completedAt` timestamps. The gap between two
// consecutive set completions is used as a proxy for rest between sets.

export function restGaps(sets) {
  const ordered = [...sets]
    .filter((s) => s.completedAt != null)
    .sort((a, b) => a.completedAt - b.completedAt);
  const gaps = [];
  for (let i = 1; i < ordered.length; i++) {
    gaps.push(Math.round((ordered[i].completedAt - ordered[i - 1].completedAt) / 1000));
  }
  return gaps;
}

export function avgRest(sets) {
  const gaps = restGaps(sets);
  if (!gaps.length) return null;
  return Math.round(gaps.reduce((a, b) => a + b, 0) / gaps.length);
}

// Average rest across multiple exercises (each an array of sets).
export function avgRestAcross(exerciseSetLists) {
  const all = exerciseSetLists.flatMap((sets) => restGaps(sets));
  if (!all.length) return null;
  return Math.round(all.reduce((a, b) => a + b, 0) / all.length);
}

export function formatRest(sec) {
  if (sec == null) return '—';
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return m > 0 ? `${m}:${String(s).padStart(2, '0')}` : `${s}s`;
}
