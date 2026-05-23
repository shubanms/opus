import { useState } from 'react';
import Modal from '../ui/Modal.jsx';
import ExerciseSearch from '../exercise/ExerciseSearch.jsx';
import ExerciseList from '../exercise/ExerciseList.jsx';
import { useExercises } from '../../hooks/useExercises.js';

export default function ExercisePicker({ isOpen, onClose, onSelect, alreadyAdded = [] }) {
  const [search, setSearch] = useState('');
  const exercises = useExercises({ search });

  function handleSelect(ex) {
    onSelect(ex);
    setSearch('');
    onClose();
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Exercise">
      <ExerciseSearch value={search} onChange={setSearch} />
      <div className="mt-3 max-h-96 overflow-y-auto">
        <ExerciseList
          exercises={exercises}
          onSelect={handleSelect}
          selectedIds={alreadyAdded}
          showArrow={false}
        />
      </div>
    </Modal>
  );
}
