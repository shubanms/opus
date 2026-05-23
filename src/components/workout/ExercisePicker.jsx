import { useState } from 'react';
import Modal from '../ui/Modal.jsx';
import ExerciseSearch from '../exercise/ExerciseSearch.jsx';
import ExerciseList from '../exercise/ExerciseList.jsx';
import { useExercises } from '../../hooks/useExercises.js';

export default function ExercisePicker({ isOpen, onClose, onSelect, alreadyAdded = [], multi = false }) {
  const [search, setSearch] = useState('');
  const exercises = useExercises({ search });

  function handleSelect(ex) {
    onSelect(ex);
    if (!multi) {
      setSearch('');
      onClose();
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={multi ? 'Add Exercises' : 'Add Exercise'}>
      <ExerciseSearch value={search} onChange={setSearch} />
      <div className="mt-3 max-h-96 overflow-y-auto">
        <ExerciseList
          exercises={exercises}
          onSelect={handleSelect}
          selectedIds={alreadyAdded}
          showArrow={false}
        />
      </div>
      {multi && (
        <button
          onClick={() => { setSearch(''); onClose(); }}
          className="mt-3 w-full rounded-xl py-3 font-sans text-sm font-semibold"
          style={{ background: 'var(--color-gold)', color: 'var(--color-obsidian)' }}
        >
          Done
        </button>
      )}
    </Modal>
  );
}
