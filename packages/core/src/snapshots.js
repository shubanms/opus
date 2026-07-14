// Pure helpers for monthly character-stat snapshots (the "this month vs last
// month" radar overlay). The web util (src/utils/snapshots.js) also does the
// localStorage read/write — that storage half stays platform-specific; only the
// pure logic lives here so web + native agree on month keys and merging.

export function monthKeyOf(date = new Date()) {
  const d = new Date(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

// The snapshot from the latest month strictly before `monthKey`, or null.
export function previousSnapshot(snapshots, monthKey) {
  const keys = Object.keys(snapshots || {}).filter((k) => k < monthKey).sort();
  return keys.length ? snapshots[keys[keys.length - 1]] : null;
}

// Align a previous snapshot's stats onto the current radar dataset by axis.
// Returns [{axis, value, valuePrev}] (valuePrev null when missing).
export function mergeRadarSeries(current, prev) {
  const prevByAxis = Object.fromEntries((prev?.stats ?? []).map((s) => [s.axis, s.value]));
  return (current ?? []).map((s) => ({
    axis: s.axis,
    value: s.value,
    valuePrev: prevByAxis[s.axis] ?? null,
  }));
}
