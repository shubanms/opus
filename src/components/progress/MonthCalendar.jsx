import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { monthGrid, monthLabel, dowLabels, monthStats, stepMonth } from '../../utils/calendar.js';
import { todayKey } from '../../utils/dateKey.js';
import { useHaptics } from '../../hooks/useHaptics.js';

// Tappable month grid of training days (richer than the 12-week heatmap).
// `days` is a Set of YYYY-MM-DD keys; onSelect(dateKey|null) fires on tap.
export default function MonthCalendar({ days, selected, onSelect }) {
  const now = new Date();
  const [{ year, month }, setYM] = useState({ year: now.getFullYear(), month: now.getMonth() });
  const haptic = useHaptics();
  const tk = todayKey();
  const weeks = monthGrid(year, month, days, { todayKey: tk });
  const stats = monthStats(year, month, days);
  const labels = dowLabels();

  function tap(cell) {
    if (!cell) return;
    haptic('tap');
    onSelect?.(selected === cell.dateKey ? null : cell.dateKey);
  }

  return (
    <div className="glass rounded-2xl p-4" style={{ background: 'var(--color-ivory)' }}>
      <div className="mb-3 flex items-center justify-between">
        <button
          onClick={() => { setYM(stepMonth(year, month, -1)); onSelect?.(null); }}
          aria-label="Previous month"
          className="flex h-8 w-8 items-center justify-center rounded-full"
          style={{ background: 'var(--color-chalk)' }}
        >
          <ChevronLeft size={16} style={{ color: 'var(--color-text-primary)' }} />
        </button>
        <div className="text-center">
          <p className="font-display text-base font-bold" style={{ color: 'var(--color-text-primary)' }}>
            {monthLabel(year, month)}
          </p>
          <p className="font-mono text-xs" style={{ color: 'var(--color-text-secondary)' }}>
            {stats.trained} training {stats.trained === 1 ? 'day' : 'days'}
          </p>
        </div>
        <button
          onClick={() => { setYM(stepMonth(year, month, 1)); onSelect?.(null); }}
          aria-label="Next month"
          className="flex h-8 w-8 items-center justify-center rounded-full"
          style={{ background: 'var(--color-chalk)' }}
        >
          <ChevronRight size={16} style={{ color: 'var(--color-text-primary)' }} />
        </button>
      </div>

      <div className="mb-1 grid grid-cols-7 gap-1">
        {labels.map((l) => (
          <span key={l} className="text-center font-mono text-[10px] uppercase" style={{ color: 'var(--color-ash)' }}>
            {l}
          </span>
        ))}
      </div>

      <div className="flex flex-col gap-1">
        {weeks.map((w, i) => (
          <div key={i} className="grid grid-cols-7 gap-1">
            {w.map((cell, j) => {
              if (!cell) return <span key={j} />;
              const isSel = selected === cell.dateKey;
              return (
                <button
                  key={j}
                  onClick={() => tap(cell)}
                  className="flex aspect-square items-center justify-center rounded-lg font-mono text-xs transition-transform active:scale-90"
                  style={{
                    background: cell.trained ? 'var(--color-gold)' : 'var(--color-chalk)',
                    color: cell.trained ? 'var(--color-obsidian)' : 'var(--color-text-secondary)',
                    boxShadow: isSel ? '0 0 0 2px var(--color-gold)' : cell.isToday ? '0 0 0 2px var(--color-ash)' : 'none',
                    fontWeight: cell.trained ? 700 : 400,
                  }}
                >
                  {cell.day}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
