import { useState } from 'react';
import { assignTemplateToDay, clearDay } from '../../utils/templateActions.js';
import { planByDay, WEEK_ORDER, DAY_SHORT } from '../../utils/routineDays.js';
import { parseKey } from '../../utils/dateKey.js';
import { useTodayKey } from '../../hooks/useTodayKey.js';

const DAYS = WEEK_ORDER.map((v) => ({ v, l: DAY_SHORT[v] }));

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
    <div className="mb-6">
      <h2 className="mb-3 font-sans text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--color-text-secondary)' }}>
        Weekly plan
      </h2>
      <div className="grid grid-cols-7 gap-1.5">
        {DAYS.map((d) => {
          const t = byDay[d.v];
          const active = selected === d.v;
          const isToday = d.v === todayDow;
          return (
            <button
              type="button"
              key={d.v}
              onClick={() => setSelected(active ? null : d.v)}
              className="rounded-xl px-0.5 py-2 text-center"
              aria-label={`${d.l}: ${t ? t.name : 'rest'}`}
              aria-pressed={active}
              style={{
                background: active ? 'var(--color-gold)' : 'var(--color-chalk)',
                border: isToday ? '1px solid var(--color-gold)' : '1px solid var(--color-ivory)',
              }}
            >
              <p className="font-sans text-xs font-semibold" style={{ color: active ? 'var(--color-obsidian)' : 'var(--color-text-primary)' }}>
                {d.l}
              </p>
              <p
                className="mt-1 truncate font-sans"
                style={{ fontSize: 9, color: active ? 'var(--color-obsidian)' : t ? 'var(--color-gold)' : 'var(--color-text-secondary)' }}
              >
                {t ? t.name : '—'}
              </p>
            </button>
          );
        })}
      </div>

      {selected != null && (
        <div className="glass mt-3 rounded-2xl p-3" style={{ background: 'var(--color-ivory)' }}>
          <p className="mb-2 font-sans text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>
            Assign to {selLabel}
          </p>
          <div className="flex flex-col gap-1.5">
            {templates.map((t) => (
              <button
                type="button"
                key={t.id}
                onClick={() => assign(t.id)}
                className="rounded-lg px-3 py-2 text-left font-sans text-sm font-medium"
                style={{
                  background: 'var(--color-chalk)',
                  color: 'var(--color-text-primary)',
                  outline: byDay[selected]?.id === t.id ? '1px solid var(--color-gold)' : 'none',
                }}
              >
                {t.name}
              </button>
            ))}
            <button
              type="button"
              onClick={rest}
              className="rounded-lg px-3 py-2 text-left font-sans text-sm"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              Rest day (clear)
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
