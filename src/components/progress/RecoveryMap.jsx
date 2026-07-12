import { useState } from 'react';
import Model from 'react-body-highlighter';
import { Activity } from 'lucide-react';
import { useRecovery } from '../../hooks/useRecovery.js';

export const MUSCLE_LABEL = {
  chest: 'Chest', triceps: 'Triceps', biceps: 'Biceps', 'front-deltoids': 'Front Delts',
  'back-deltoids': 'Rear Delts', 'upper-back': 'Upper Back', 'lower-back': 'Lower Back',
  trapezius: 'Traps', abs: 'Abs', obliques: 'Obliques', quadriceps: 'Quads',
  hamstring: 'Hamstrings', gluteal: 'Glutes', calves: 'Calves', forearm: 'Forearms',
};

// frequency → highlightedColors index: 1=sage(2d), 2=gold(1d), 3=ember(today)
const COLORS = ['#6B8F71', '#C9A84C', '#D4622A'];
const RECOVERY_LEGEND = [['#D4622A', 'Worked today'], ['#C9A84C', '1 day'], ['#6B8F71', '2 days'], ['var(--color-ivory)', 'Ready']];

// A body muscle-map card. By default it visualises training *recovery*
// (days-since-trained) from useRecovery — this is the Home widget. Pass
// `data`/`onSelect`/`legend`/`title`/`icon` to reuse the same anatomy map for a
// different meaning (e.g. per-muscle training frequency on the Progress tab).
export default function RecoveryMap({ data: extData, onSelect, legend: extLegend, title = 'Recovery', icon: Icon = Activity, selectedMuscle }) {
  const { byMuscle, neglected } = useRecovery();
  const [view, setView] = useState('anterior');
  const [sel, setSel] = useState(null);
  const external = extData != null;

  let data = extData;
  if (!external) {
    data = [];
    for (const [m, info] of Object.entries(byMuscle)) {
      if (info.daysSince != null && info.daysSince <= 2) {
        data.push({ name: m, muscles: [m], frequency: 3 - info.daysSince });
      }
    }
  }
  const legend = extLegend ?? RECOVERY_LEGEND;

  const handleClick = ({ muscle }) => {
    if (onSelect) onSelect(muscle);
    else setSel(muscle);
  };

  // Recovery-specific detail lines (only meaningful for the default view).
  const selInfo = sel ? byMuscle[sel] : null;
  const selText = external || !sel
    ? null
    : selInfo?.daysSince == null
      ? `${MUSCLE_LABEL[sel]} — not trained yet`
      : selInfo.daysSince === 0
        ? `${MUSCLE_LABEL[sel]} — trained today`
        : `${MUSCLE_LABEL[sel]} — ${selInfo.daysSince} day${selInfo.daysSince === 1 ? '' : 's'} ago`;

  const nudge = external || !neglected
    ? null
    : neglected.daysSince == null
      ? `You haven't trained ${MUSCLE_LABEL[neglected.muscle]} yet — give it a go.`
      : neglected.daysSince >= 4
        ? `${MUSCLE_LABEL[neglected.muscle]} hasn't been trained in ${neglected.daysSince} days.`
        : null;

  return (
    <div className="rounded-2xl p-4" style={{ background: 'var(--color-chalk)', border: '1px solid var(--color-ivory)' }}>
      <div className="mb-3 flex items-center justify-between">
        <span className="flex items-center gap-2 font-sans text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--color-text-secondary)' }}>
          <Icon size={14} style={{ color: 'var(--color-ash)' }} /> {title}
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
        <Model data={data} highlightedColors={COLORS} onClick={handleClick} type={view} />
      </div>

      {/* Legend */}
      <div className="mt-2 flex flex-wrap justify-center gap-3">
        {legend.map(([c, l]) => (
          <span key={l} className="flex items-center gap-1.5 font-sans text-xs" style={{ color: 'var(--color-text-secondary)' }}>
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: c }} />{l}
          </span>
        ))}
      </div>

      {external && selectedMuscle && (
        <p className="mt-3 text-center font-sans text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
          Showing {MUSCLE_LABEL[selectedMuscle] ?? selectedMuscle} — tap again to clear
        </p>
      )}
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
