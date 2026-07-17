// Month-grid calendar of training days. Pure + unit-tested. Builds a weeks×days
// grid for a given month, marking which days were trained (from a Set of local
// YYYY-MM-DD date keys — same keys `todayKey()` writes onto workouts) and today.
// Day strings are built from integers, never via toISOString, so there is no
// timezone drift.

const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export function monthLabel(year, month) {
  return `${MONTHS[month]} ${year}`;
}

// Weekday headers, ordered for the chosen week start (1 = Monday, 0 = Sunday).
export function dowLabels(firstDay = 1) {
  return Array.from({ length: 7 }, (_, i) => DOW[(firstDay + i) % 7]);
}

function key(y, m, d) {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

// weeks[] of 7 cells; leading/trailing blanks are null. month is 0-based.
export function monthGrid(year, month, trainedDays = new Set(), { firstDay = 1, todayKey = null } = {}) {
  const startDow = new Date(year, month, 1).getDay(); // 0=Sun (local wall date)
  const lead = (startDow - firstDay + 7) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < lead; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    const k = key(year, month, d);
    cells.push({ day: d, dateKey: k, trained: trainedDays.has(k), isToday: k === todayKey });
  }
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

// Trained-day count for a month (for the header stat).
export function monthStats(year, month, trainedDays = new Set()) {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  let trained = 0;
  for (let d = 1; d <= daysInMonth; d++) if (trainedDays.has(key(year, month, d))) trained++;
  return { trained, days: daysInMonth };
}

// Step a {year, month} by a signed number of months, wrapping the year.
export function stepMonth(year, month, delta) {
  const t = month + delta;
  const y = year + Math.floor(t / 12);
  const m = ((t % 12) + 12) % 12;
  return { year: y, month: m };
}
