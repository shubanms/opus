import { heatmapWeeks } from '../../utils/calendar.js';
import { friendlyDate } from '../../utils/dateKey.js';
import { useTodayKey } from '../../hooks/useTodayKey.js';

// Row captions, Monday first. Every other day, like GitHub's grid: enough to
// read a row by, without a letter crowding every 12-pixel cell.
const ROWS = [
  { day: 'mon', label: 'Mon' }, { day: 'tue', label: '' }, { day: 'wed', label: 'Wed' },
  { day: 'thu', label: '' }, { day: 'fri', label: 'Fri' }, { day: 'sat', label: '' }, { day: 'sun', label: 'Sun' },
];

// 12-week training frequency grid (GitHub-style). The cells are local date
// keys (utils/calendar.js heatmapWeeks) — they were UTC days, which put every
// session one row late in India and today's on tomorrow's blank cell.
export default function Heatmap({ days }) {
  const today = useTodayKey();
  const cols = heatmapWeeks(today, days);

  return (
    <div className="flex gap-2">
      <div className="flex shrink-0 flex-col gap-1" aria-hidden>
        {ROWS.map((r) => (
          <span key={r.day} className="h-3 font-mono text-[9px] leading-3" style={{ color: 'var(--color-ash)' }}>
            {r.label}
          </span>
        ))}
      </div>
      <div className="flex gap-1 overflow-x-auto">
        {cols.map((col) => (
          <div key={col[0].key} className="flex flex-col gap-1">
            {col.map((cell) => (
              <div
                key={cell.key}
                title={friendlyDate(cell.key)}
                data-date={cell.key}
                data-trained={cell.trained ? 'true' : undefined}
                className="h-3 w-3 shrink-0 rounded-sm"
                style={{
                  background: cell.future
                    ? 'transparent'
                    : cell.trained
                    ? 'var(--color-gold)'
                    : 'var(--color-ivory)',
                  boxShadow: cell.key === today ? 'inset 0 0 0 1px var(--color-ash)' : 'none',
                }}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
