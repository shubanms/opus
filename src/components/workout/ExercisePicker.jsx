import { useState, useMemo } from 'react';
import Modal from '../ui/Modal.jsx';
import ExerciseSearch from '../exercise/ExerciseSearch.jsx';
import ExerciseList from '../exercise/ExerciseList.jsx';
import { useExercises } from '../../hooks/useExercises.js';

// Friendly muscle groupings → the granular stored muscleGroups they cover.
const GROUPS = [
  { label: 'Chest', muscles: ['chest'] },
  { label: 'Back', muscles: ['upper-back', 'lower-back', 'trapezius'] },
  { label: 'Shoulders', muscles: ['front-deltoids', 'back-deltoids'] },
  { label: 'Arms', muscles: ['biceps', 'triceps', 'forearm'] },
  { label: 'Legs', muscles: ['quadriceps', 'hamstring', 'gluteal', 'calves'] },
  { label: 'Core', muscles: ['abs', 'obliques'] },
  { label: 'Cardio', muscles: ['cardio'] },
];
const LEVELS = ['beginner', 'intermediate', 'advanced'];

function Chip({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className="shrink-0 rounded-full px-3 py-1.5 font-sans text-xs font-medium"
      style={{ background: active ? 'var(--color-gold)' : 'var(--color-ivory)', color: active ? 'var(--color-obsidian)' : 'var(--color-text-secondary)' }}
    >
      {children}
    </button>
  );
}

export default function ExercisePicker({ isOpen, onClose, onSelect, alreadyAdded = [], multi = false }) {
  const [search, setSearch] = useState('');
  const [group, setGroup] = useState(null); // group label or null
  const [level, setLevel] = useState(null); // difficulty or null
  const all = useExercises();

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const muscles = group ? GROUPS.find((g) => g.label === group)?.muscles ?? null : null;
    return all.filter((e) => {
      if (q && !e.name.toLowerCase().includes(q)) return false;
      if (muscles && !muscles.includes(e.muscleGroup)) return false;
      if (level && e.difficulty !== level) return false;
      return true;
    });
  }, [all, search, group, level]);

  function reset() {
    setSearch(''); setGroup(null); setLevel(null);
  }

  function handleSelect(ex) {
    onSelect(ex);
    if (!multi) { reset(); onClose(); }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={multi ? 'Add Exercises' : 'Add Exercise'}>
      <ExerciseSearch value={search} onChange={setSearch} />

      {/* Muscle-group filter — edge-to-edge scrollable row so it never overflows */}
      <div className="no-scrollbar -mx-5 mt-3 flex gap-1.5 overflow-x-auto px-5">
        {GROUPS.map((g) => (
          <Chip key={g.label} active={group === g.label} onClick={() => setGroup(group === g.label ? null : g.label)}>
            {g.label}
          </Chip>
        ))}
      </div>

      {/* Level filter */}
      <div className="mt-2 flex flex-wrap gap-1.5">
        {LEVELS.map((l) => (
          <Chip key={l} active={level === l} onClick={() => setLevel(level === l ? null : l)}>
            {l.charAt(0).toUpperCase() + l.slice(1)}
          </Chip>
        ))}
      </div>

      <div className="mt-3 max-h-[48vh] overflow-y-auto">
        {filtered.length > 0 ? (
          <ExerciseList
            exercises={filtered}
            onSelect={handleSelect}
            selectedIds={alreadyAdded}
            showArrow={false}
          />
        ) : (
          <p className="py-8 text-center font-sans text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            No exercises match those filters.
          </p>
        )}
      </div>

      {multi && (
        <button
          onClick={() => { reset(); onClose(); }}
          className="mt-3 w-full rounded-xl py-3 font-sans text-sm font-semibold"
          style={{ background: 'var(--color-gold)', color: 'var(--color-obsidian)' }}
        >
          Done
        </button>
      )}
    </Modal>
  );
}
