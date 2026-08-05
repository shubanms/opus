import { useState } from 'react';
import Model from 'react-body-highlighter';
import { Eye } from 'lucide-react';

const ANTERIOR = [
  'chest', 'abs', 'obliques', 'biceps', 'forearm',
  'quadriceps', 'calves', 'front-deltoids', 'triceps',
];
const POSTERIOR = [
  'upper-back', 'lower-back', 'trapezius', 'hamstring',
  'gluteal', 'back-deltoids', 'calves', 'triceps',
];
const LABEL = {
  chest: 'Chest', abs: 'Abs', obliques: 'Obliques', biceps: 'Biceps',
  forearm: 'Forearms', quadriceps: 'Quads', calves: 'Calves',
  'front-deltoids': 'Front Delts', triceps: 'Triceps',
  'upper-back': 'Upper Back', 'lower-back': 'Lower Back', trapezius: 'Traps',
  hamstring: 'Hamstrings', gluteal: 'Glutes', 'back-deltoids': 'Rear Delts',
};

export default function BodyPicker({ selected, onSelect }) {
  const [showModel, setShowModel] = useState(false);
  const [view, setView] = useState('anterior');

  const muscles = view === 'anterior' ? ANTERIOR : POSTERIOR;
  const modelData = selected
    ? [{ name: selected, muscles: [selected], frequency: 3 }]
    : [];

  function handleModelClick({ muscle }) {
    onSelect(selected === muscle ? null : muscle);
  }

  return (
    <div>
      {/* Muscle pills — horizontal scroll */}
      <div className="flex items-center gap-2">
        <div className="flex flex-1 gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {Object.entries(LABEL).map(([key, label]) => (
            <button
              key={key}
              onClick={() => onSelect(selected === key ? null : key)}
              className="shrink-0 rounded-full px-3 py-1.5 font-sans text-xs font-medium"
              style={{
                background: selected === key ? 'var(--color-gold)' : 'var(--color-ivory)',
                color: selected === key ? 'var(--color-obsidian)' : 'var(--color-text-secondary)',
                border: selected === key ? 'none' : '1px solid transparent',
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Toggle body model */}
        <button
          onClick={() => setShowModel((v) => !v)}
          className="shrink-0 flex h-8 w-8 items-center justify-center rounded-full"
          style={{ background: showModel ? 'var(--color-obsidian)' : 'var(--color-ivory)' }}
          aria-label="Toggle body map"
        >
          <Eye size={14} style={{ color: showModel ? 'var(--color-text-inverse)' : 'var(--color-ash)' }} />
        </button>
      </div>

      {/* Expandable anatomy model */}
      {showModel && (
        <div className="mt-4">
          {/* Front / Back toggle */}
          <div
            className="mb-3 flex overflow-hidden rounded-xl"
            style={{ background: 'var(--color-chalk)' }}
          >
            {['anterior', 'posterior'].map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className="flex-1 py-2 font-sans text-xs font-medium"
                style={{
                  background: view === v ? 'var(--color-obsidian)' : 'transparent',
                  color: view === v ? 'var(--color-text-inverse)' : 'var(--color-ash)',
                }}
              >
                {v === 'anterior' ? 'Front' : 'Back'}
              </button>
            ))}
          </div>

          {/* Model SVG */}
          <div className="flex justify-center" style={{ maxHeight: 220, overflow: 'hidden' }}>
            <Model
              data={modelData}
              highlightedColors={['#8B7DFF']}
              onClick={handleModelClick}
              type={view}
            />
          </div>

          {/* Contextual muscle buttons for current view */}
          <div className="mt-3 flex flex-wrap gap-2">
            {muscles.map((m) => (
              <button
                key={m}
                onClick={() => onSelect(selected === m ? null : m)}
                className="rounded-full px-3 py-1 font-sans text-xs font-medium"
                style={{
                  background: selected === m ? 'var(--color-gold)' : 'var(--color-chalk)',
                  color: selected === m ? 'var(--color-obsidian)' : 'var(--color-text-secondary)',
                }}
              >
                {LABEL[m]}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
