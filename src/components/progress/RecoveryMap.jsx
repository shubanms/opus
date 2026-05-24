import { useState } from 'react';
import Model from 'react-body-highlighter';
import { Activity } from 'lucide-react';
import { useRecovery } from '../../hooks/useRecovery.js';

const LABEL = {
  chest: 'Chest', triceps: 'Triceps', biceps: 'Biceps', 'front-deltoids': 'Front Delts',
  'back-deltoids': 'Rear Delts', 'upper-back': 'Upper Back', 'lower-back': 'Lower Back',
  trapezius: 'Traps', abs: 'Abs', obliques: 'Obliques', quadriceps: 'Quads',
  hamstring: 'Hamstrings', gluteal: 'Glutes', calves: 'Calves', forearm: 'Forearms',
};

// frequency → highlightedColors index: 1=sage(2d), 2=gold(1d), 3=ember(today)
const COLORS = ['#6B8F71', '#C9A84C', '#D4622A'];

export default function RecoveryMap() {
  const { byMuscle, neglected } = useRecovery();
  const [view, setView] = useState('anterior');
  const [sel, setSel] = useState(null);

  const data = [];
  for (const [m, info] of Object.entries(byMuscle)) {
    if (info.daysSince != null && info.daysSince <= 2) {
      data.push({ name: m, muscles: [m], frequency: 3 - info.daysSince });
    }
  }

  const selInfo = sel ? byMuscle[sel] : null;
  const selText = sel
    ? selInfo?.daysSince == null
      ? `${LABEL[sel]} — not trained yet`
      : selInfo.daysSince === 0
        ? `${LABEL[sel]} — trained today`
        : `${LABEL[sel]} — ${selInfo.daysSince} day${selInfo.daysSince === 1 ? '' : 's'} ago`
    : null;

  const nudge = neglected
    ? neglected.daysSince == null
      ? `You haven't trained ${LABEL[neglected.muscle]} yet — give it a go.`
      : neglected.daysSince >= 4
        ? `${LABEL[neglected.muscle]} hasn't been trained in ${neglected.daysSince} days.`
        : null
    : null;

  return (
    <div className="rounded-2xl p-4" style={{ background: 'var(--color-chalk)', border: '1px solid var(--color-ivory)' }}>
      <div className="mb-3 flex items-center justify-between">
        <span className="flex items-center gap-2 font-sans text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--color-text-secondary)' }}>
          <Activity size={14} style={{ color: 'var(--color-ash)' }} /> Recovery
        </span>
        <div className="flex overflow-hidden rounded-lg" style={{ background: 'var(--color-ivory)' }}>
          {['anterior', 'posterior'].map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className="px-3 py-1 font-sans text-xs font-medium"
              style={{ background: view === v ? 'var(--color-obsidian)' : 'transparent', color: view === v ? 'var(--color-text-inverse)' : 'var(--color-ash)' }}
            >
              {v === 'anterior' ? 'Front' : 'Back'}
            </button>
          ))}
        </div>
      </div>

      <div className="flex justify-center" style={{ maxHeight: 220, overflow: 'hidden' }}>
        <Model data={data} highlightedColors={COLORS} onClick={({ muscle }) => setSel(muscle)} type={view} />
      </div>

      {/* Legend */}
      <div className="mt-2 flex flex-wrap justify-center gap-3">
        {[['#D4622A', 'Worked today'], ['#C9A84C', '1 day'], ['#6B8F71', '2 days'], ['var(--color-ivory)', 'Ready']].map(([c, l]) => (
          <span key={l} className="flex items-center gap-1.5 font-sans text-xs" style={{ color: 'var(--color-text-secondary)' }}>
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: c }} />{l}
          </span>
        ))}
      </div>

      {selText && (
        <p className="mt-3 text-center font-sans text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>{selText}</p>
      )}
      {nudge && (
        <p className="mt-2 rounded-xl px-3 py-2 text-center font-sans text-xs" style={{ background: '#C9A84C18', color: 'var(--color-text-primary)' }}>
          {nudge}
        </p>
      )}
    </div>
  );
}
