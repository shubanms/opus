import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { monthGrid, monthLabel, dowLabels, monthStats, stepMonth } from '../../utils/calendar.js';
import { friendlyDate } from '../../utils/dateKey.js';
import { useHaptics } from '../../hooks/useHaptics.js';
import { useTodayKey } from '../../hooks/useTodayKey.js';
import { SectionLabel } from '../ink/index.js';
import useInkMotion from '../ink/useInkMotion.js';
import '../../styles/ink-chronicle.css';

// "The month · sealed days": tappable month grid. Sealed days are vermilion
// stamped squares, today is a dashed pulsing outline, future days plain.
// `days` is a Set of YYYY-MM-DD keys; onSelect(dateKey|null) fires on tap.
export default function MonthCalendar({ days, selected, onSelect }) {
  const [{ year, month }, setYM] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });
  const haptic = useHaptics();
  const tk = useTodayKey();
  const motionOn = useInkMotion();
  const weeks = monthGrid(year, month, days, { todayKey: tk });
  const stats = monthStats(year, month, days);
  const labels = dowLabels();

  function tap(cell) {
    haptic('tap');
    onSelect?.(selected === cell.dateKey ? null : cell.dateKey);
  }
  const step = (d) => {
    setYM(stepMonth(year, month, d));
    onSelect?.(null);
  };

  return (
    <div className={`chr-cal ${motionOn ? 'chr-cal--motion' : ''}`}>
      <SectionLabel meta={`${stats.trained} sealed`}>The month · sealed days</SectionLabel>
      <div className="chr-cal__nav">
        <button type="button" className="chr-cal__btn" aria-label="Previous month" onClick={() => step(-1)}>
          <ChevronLeft size={16} />
        </button>
        <span>{monthLabel(year, month)}</span>
        <button type="button" className="chr-cal__btn" aria-label="Next month" onClick={() => step(1)}>
          <ChevronRight size={16} />
        </button>
      </div>

      <div className="chr-cal__dow" aria-hidden>
        {labels.map((l) => (
          <span key={l}>{l[0]}</span>
        ))}
      </div>

      {weeks.map((w) => {
        const weekId = w.find(Boolean)?.dateKey;
        return (
          <div key={weekId} className="chr-cal__row">
            {w.map((cell, j) => {
              if (!cell) return <span key={`${weekId}-blank-${labels[j]}`} />;
              const cls = [
                'chr-cal__cell',
                cell.trained && 'chr-cal__cell--sealed',
                cell.isToday && 'chr-cal__cell--today',
                cell.dateKey > tk && 'chr-cal__cell--future',
                selected === cell.dateKey && 'chr-cal__cell--sel',
              ]
                .filter(Boolean)
                .join(' ');
              return (
                <button
                  type="button"
                  key={cell.dateKey}
                  onClick={() => tap(cell)}
                  aria-label={`${friendlyDate(cell.dateKey)}${cell.trained ? ', trained' : ''}`}
                  aria-pressed={selected === cell.dateKey}
                  className={cls}
                >
                  <span className="chr-cal__num"><span>{cell.day}</span></span>
                </button>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
