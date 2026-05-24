// Monthly character-stat snapshots, persisted locally, so the radar can show
// "this month vs last month". Pure helpers (monthKeyOf, previousSnapshot,
// mergeRadarSeries) are unit-tested; the localStorage read/write are not.

const KEY = 'opus_snapshots';

export function monthKeyOf(date = new Date()) {
  const d = new Date(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

function load() {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '{}');
  } catch {
    return {};
  }
}

export function getSnapshots() {
  return load();
}

// Save (overwrite) the current month's snapshot. stats = [{axis, value}, ...].
export function saveSnapshot(stats, date = new Date()) {
  if (!stats?.length) return;
  const all = load();
  all[monthKeyOf(date)] = { savedAt: Date.now(), stats };
  try {
    localStorage.setItem(KEY, JSON.stringify(all));
  } catch {
    /* ignore */
  }
}

// Pure: the snapshot from the latest month strictly before `monthKey`, or null.
export function previousSnapshot(snapshots, monthKey) {
  const keys = Object.keys(snapshots || {}).filter((k) => k < monthKey).sort();
  return keys.length ? snapshots[keys[keys.length - 1]] : null;
}

// Pure: align a previous snapshot's stats onto the current radar dataset by
// axis. Returns [{axis, value, valuePrev}] (valuePrev null when missing).
export function mergeRadarSeries(current, prev) {
  const prevByAxis = Object.fromEntries((prev?.stats ?? []).map((s) => [s.axis, s.value]));
  return (current ?? []).map((s) => ({
    axis: s.axis,
    value: s.value,
    valuePrev: prevByAxis[s.axis] ?? null,
  }));
}
