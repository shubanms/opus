import { useState } from 'react';
import { assignTemplateToDay, clearDay } from '../../utils/templateActions.js';

const DAYS = [
  { v: 1, l: 'Mon' }, { v: 2, l: 'Tue' }, { v: 3, l: 'Wed' }, { v: 4, l: 'Thu' },
  { v: 5, l: 'Fri' }, { v: 6, l: 'Sat' }, { v: 0, l: 'Sun' },
];

export default function WeeklyPlanner({ templates }) {
  const [selected, setSelected] = useState(null);

  const byDay = {};
  for (const t of templates) if (t.dayOfWeek != null) byDay[t.dayOfWeek] = t;

  const todayDow = new Date().getDay();

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
              key={d.v}
              onClick={() => setSelected(active ? null : d.v)}
              className="rounded-xl px-0.5 py-2 text-center"
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
        <div className="mt-3 rounded-2xl p-3" style={{ background: 'var(--color-ivory)' }}>
          <p className="mb-2 font-sans text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>
            Assign to {selLabel}
          </p>
          <div className="flex flex-col gap-1.5">
            {templates.map((t) => (
              <button
                key={t.id}
                onClick={() => assign(t.id)}
                className="rounded-lg px-3 py-2 text-left font-sans text-sm font-medium"
                style={{ background: 'var(--color-chalk)', color: 'var(--color-text-primary)' }}
              >
                {t.name}
              </button>
            ))}
            <button
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
