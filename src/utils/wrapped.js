import { monthKeyOf } from './snapshots.js';

// Spotify-style "Wrapped" aggregation over a date range (a month or a year).
// Pure + unit-tested; the hook feeds in DB rows and an exerciseId→name map.

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function monthRange(monthKey) {
  const [y, m] = monthKey.split('-').map(Number);
  return { startMs: new Date(y, m - 1, 1).getTime(), endMs: new Date(y, m, 1).getTime(), label: `${MONTHS[m - 1]} ${y}` };
}

export function yearRange(year) {
  const y = Number(year);
  return { startMs: new Date(y, 0, 1).getTime(), endMs: new Date(y + 1, 0, 1).getTime(), label: String(y) };
}

export function rangeOf(period) {
  return period?.kind === 'year' ? yearRange(period.key) : monthRange(period.key);
}

// Selectable periods from the first workout to now: months (newest first) + years.
export function availablePeriods(workouts, now = new Date()) {
  const dates = workouts.map((w) => w.date).filter(Boolean).sort();
  const nowY = now.getFullYear();
  const nowM = now.getMonth();
  if (!dates.length) {
    const key = monthKeyOf(now);
    return { months: [{ kind: 'month', key, label: monthRange(key).label, current: true }], years: [{ kind: 'year', key: String(nowY), label: String(nowY), current: true }] };
  }
  const first = new Date(dates[0]);
  const firstY = first.getFullYear();
  const firstM = first.getMonth();

  const months = [];
  let y = nowY;
  let m = nowM;
  while (y > firstY || (y === firstY && m >= firstM)) {
    const key = `${y}-${String(m + 1).padStart(2, '0')}`;
    months.push({ kind: 'month', key, label: monthRange(key).label, current: y === nowY && m === nowM });
    m -= 1;
    if (m < 0) { m = 11; y -= 1; }
  }

  const years = [];
  for (let yr = nowY; yr >= firstY; yr -= 1) {
    years.push({ kind: 'year', key: String(yr), label: String(yr), current: yr === nowY });
  }
  return { months, years };
}

export function buildWrapped(workouts, sets, prs, range, exName = {}) {
  const inRange = (ms) => ms >= range.startMs && ms < range.endMs;
  const ws = workouts.filter((w) => w.status === 'completed' && inRange(new Date(w.date).getTime()));
  const wIds = new Set(ws.map((w) => w.id));
  const ss = sets.filter((s) => wIds.has(s.workoutId) && !s.isWarmup);
  const ps = prs.filter((p) => inRange(p.achievedAt ?? 0));

  const volByEx = {};
  for (const s of ss) volByEx[s.exerciseId] = (volByEx[s.exerciseId] ?? 0) + (s.weight || 0) * (s.reps || 0);
  let topExId = null;
  let topVol = 0;
  for (const [id, v] of Object.entries(volByEx)) if (v > topVol) { topVol = v; topExId = Number(id); }

  const byDay = [0, 0, 0, 0, 0, 0, 0];
  for (const w of ws) byDay[new Date(w.date).getDay()] += 1;
  let busiestDay = null;
  let maxDay = 0;
  byDay.forEach((c, i) => { if (c > maxDay) { maxDay = c; busiestDay = WEEKDAYS[i]; } });

  // Volume per ISO (Monday-aligned) week, oldest→newest — sparkline source.
  const byWeek = {};
  for (const w of ws) {
    const d = new Date(w.date);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
    const k = d.getTime();
    byWeek[k] = (byWeek[k] ?? 0) + (w.totalVolume || 0);
  }
  const series = Object.keys(byWeek).map(Number).sort((a, b) => a - b).map((k) => Math.round(byWeek[k]));

  return {
    label: range.label,
    sessions: ws.length,
    volumeKg: ws.reduce((a, w) => a + (w.totalVolume || 0), 0),
    sets: ss.length,
    prs: ps.length,
    xp: ws.reduce((a, w) => a + (w.xpEarned || 0), 0),
    hours: ws.reduce((a, w) => a + (w.duration || 0), 0) / 3600,
    topLift: topExId != null ? (exName[topExId] ?? null) : null,
    busiestDay,
    series,
    hasData: ws.length > 0,
  };
}
