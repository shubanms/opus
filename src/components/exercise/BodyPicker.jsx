import { useState } from 'react';
import Model from 'react-body-highlighter';
import { Eye } from 'lucide-react';
import { Chip } from '../ink/index.js';
import { groupForRegion, regionsForGroup } from '../../utils/bodyMap.js';
import '../../styles/ink-forms.css';

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
    ? [{ name: selected, muscles: regionsForGroup(selected), frequency: 3 }]
    : [];

  // The model has regions the catalogue doesn't (head, knees, soleus…):
  // map them to the group that trains them, or ignore the tap.
  function handleModelClick({ muscle }) {
    const group = groupForRegion(muscle);
    if (!group) return;
    onSelect(selected === group ? null : group);
  }

  return (
    <div>
      {/* One pill per tracked muscle, horizontal scroll */}
      <div className="flex items-center gap-2">
        <div className="forms-chips flex-1" style={{ margin: 0, padding: 0 }}>
          {Object.entries(LABEL).map(([key, label]) => (
            <Chip key={key} selected={selected === key} onClick={() => onSelect(selected === key ? null : key)}>
              {label}
            </Chip>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setShowModel((v) => !v)}
          className="forms-icon-btn"
          aria-pressed={showModel}
          aria-label="Toggle body map"
        >
          <Eye size={16} />
        </button>
      </div>

      {/* Expandable anatomy model */}
      {showModel && (
        <div className="mt-4">
          <div className="mb-3 flex gap-2">
            {['anterior', 'posterior'].map((v) => (
              <Chip key={v} selected={view === v} onClick={() => setView(v)}>
                {v === 'anterior' ? 'Front' : 'Back'}
              </Chip>
            ))}
          </div>

          <div className="flex justify-center" style={{ maxHeight: 220, overflow: 'hidden' }}>
            <Model data={modelData} highlightedColors={['#d2ae5a']} onClick={handleModelClick} type={view} />
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {muscles.map((mu) => (
              <Chip key={mu} selected={selected === mu} onClick={() => onSelect(selected === mu ? null : mu)}>
                {LABEL[mu]}
              </Chip>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
