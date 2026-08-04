import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Trophy } from 'lucide-react';
import { useAllPRs } from '../hooks/useProgress.js';
import useSettingsStore from '../store/settingsStore.js';
import { toDisplay, unitLabel } from '../utils/units.js';

const TYPE_LABEL = { weight: 'Heaviest weight', reps: 'Most reps', volume: 'Best volume' };

export default function HallOfRecordsPage() {
  const navigate = useNavigate();
  const prs = useAllPRs();
  const unit = useSettingsStore((s) => s.unit);
  const u = unitLabel(unit);

  const fmt = (p) => (p.type === 'reps' ? `${p.value} reps` : `${Math.round(toDisplay(p.value, unit))} ${u}`);
  const dateOf = (p) => new Date(p.achievedAt).toISOString().slice(0, 10);

  // Group reverse-chronologically by date (prs already come newest-first).
  const groups = [];
  const byDate = {};
  for (const p of prs) {
    const d = dateOf(p);
    if (!byDate[d]) {
      byDate[d] = { date: d, items: [] };
      groups.push(byDate[d]);
    }
    byDate[d].items.push(p);
  }

  return (
    <div className="anim-fade-slide-up px-5 pb-8 pt-8">
      <button onClick={() => navigate(-1)} className="mb-5 flex items-center gap-2">
        <ArrowLeft size={18} style={{ color: 'var(--color-text-secondary)' }} />
        <span className="font-sans text-sm" style={{ color: 'var(--color-text-secondary)' }}>Back</span>
      </button>

      <h1 className="font-display text-4xl font-bold leading-none" style={{ color: 'var(--color-text-primary)' }}>
        Hall of Records
      </h1>
      <p className="mt-1 font-sans text-sm" style={{ color: 'var(--color-text-secondary)' }}>
        Every personal record you've set, newest first.
      </p>

      {groups.length === 0 ? (
        <div className="mt-12 text-center">
          <Trophy size={32} style={{ color: 'var(--color-ash)' }} className="mx-auto" />
          <p className="mt-3 font-sans text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            No records yet. Log a working set to start your legacy.
          </p>
        </div>
      ) : (
        <div className="mt-6 flex flex-col gap-5">
          {groups.map((g) => (
            <div key={g.date}>
              <p className="mb-2 font-mono text-xs" style={{ color: 'var(--color-text-secondary)' }}>{g.date}</p>
              <div className="flex flex-col gap-1.5">
                {g.items.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center gap-3 rounded-xl px-3 py-2.5"
                    style={{ background: 'var(--color-chalk)', border: '1px solid var(--color-ivory)' }}
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full" style={{ background: 'var(--color-gold)' }}>
                      <Trophy size={15} style={{ color: 'var(--color-obsidian)' }} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-sans text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>{p.exerciseName}</p>
                      <p className="font-sans text-xs" style={{ color: 'var(--color-text-secondary)' }}>{TYPE_LABEL[p.type] ?? p.type}</p>
                    </div>
                    <span className="font-mono text-sm font-semibold" style={{ color: 'var(--color-gold)' }}>{fmt(p)}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
