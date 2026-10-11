import { useState } from 'react';
import { assignTemplateToDay, clearDay } from '../../utils/templateActions.js';
import { planByDay, WEEK_ORDER, DAY_SHORT } from '../../utils/routineDays.js';
import { parseKey } from '../../utils/dateKey.js';
import { WEEKDAY_KANJI } from '../../utils/kanji.js';
import { SectionLabel } from '../ink/index.js';
import { useTodayKey } from '../../hooks/useTodayKey.js';
import '../../styles/ink-journal.css';

const DAYS = WEEK_ORDER.map((v) => ({ v, l: DAY_SHORT[v] }));

// The week as seven ink tiles: weekday kanji over the routine that owns the day.
export default function WeeklyPlanner({ templates }) {
  const [selected, setSelected] = useState(null);

  // One routine per day, resolved the same way Home and the calendar export do.
  const byDay = planByDay(templates);
  const todayDow = parseKey(useTodayKey())?.getDay();

  async function assign(templateId) {
    await assignTemplateToDay(templateId, selected);
    setSelected(null);
  }
  async function rest() {
    await clearDay(selected);
    setSelected(null);
  }

  const selLabel = DAYS.find((d) => d.v === selected)?.l;

  return (
    <div className="jr-week">
      <SectionLabel as="h2" rule>Weekly plan</SectionLabel>
      <div className="jr-week__grid">
        {DAYS.map((d) => {
          const t = byDay[d.v];
          const active = selected === d.v;
          return (
            <button
              type="button"
              key={d.v}
              onClick={() => setSelected(active ? null : d.v)}
              className={`jr-day ${active ? 'is-active' : ''} ${d.v === todayDow ? 'is-today' : ''} ${t ? 'has-plan' : ''}`}
              aria-label={`${d.l}: ${t ? t.name : 'rest'}`}
              aria-pressed={active}
            >
              <span className="jr-day__k" lang="ja" aria-hidden>{WEEKDAY_KANJI[d.l] ?? ''}</span>
              <span className="jr-day__l">{d.l}</span>
              <span className="jr-day__n">{t ? t.name : '—'}</span>
            </button>
          );
        })}
      </div>

      {selected != null && (
        <div className="jr-assign washi">
          <p className="jr-assign__t">Assign to {selLabel}</p>
          <div className="jr-assign__list">
            {templates.map((t) => (
              <button type="button" key={t.id} onClick={() => assign(t.id)} className={`jr-assign__opt ${byDay[selected]?.id === t.id ? 'is-on' : ''}`}>
                {t.name}
              </button>
            ))}
            <button type="button" onClick={rest} className="jr-assign__opt jr-assign__opt--rest">
              Rest day (clear)
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
