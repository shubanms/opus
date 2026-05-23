import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { useExercises } from '../hooks/useExercises.js';
import BodyPicker from '../components/exercise/BodyPicker.jsx';
import ExerciseSearch from '../components/exercise/ExerciseSearch.jsx';
import ExerciseList from '../components/exercise/ExerciseList.jsx';
import Modal from '../components/ui/Modal.jsx';
import ExerciseForm from '../components/exercise/ExerciseForm.jsx';

export default function ExercisePage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [selectedMuscle, setSelectedMuscle] = useState(null);
  const [showForm, setShowForm] = useState(false);

  // When searching: ignore muscle filter so results span all groups
  const exercises = useExercises({
    muscleGroup: search ? null : selectedMuscle,
    search,
  });

  const subtitle =
    selectedMuscle && !search
      ? `${exercises.length} exercises · ${selectedMuscle.replace(/-/g, ' ')}`
      : `${Array.isArray(exercises) ? exercises.length : '…'} exercises`;

  return (
    <div className="anim-fade-slide-up px-5 pb-6 pt-8">
      {/* Header */}
      <div className="mb-5 flex items-start justify-between">
        <div>
          <h1 className="font-display text-4xl font-bold leading-none" style={{ color: 'var(--color-text-primary)' }}>
            Exercises
          </h1>
          <p className="mt-1 font-sans text-xs" style={{ color: 'var(--color-text-secondary)' }}>
            {subtitle}
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex h-9 w-9 items-center justify-center rounded-full"
          style={{ background: 'var(--color-obsidian)' }}
          aria-label="Add custom exercise"
        >
          <Plus size={18} style={{ color: 'var(--color-chalk)' }} />
        </button>
      </div>

      {/* Search */}
      <ExerciseSearch value={search} onChange={setSearch} />

      {/* Muscle filter — hidden while searching */}
      {!search && (
        <div className="mt-4 rounded-2xl p-4" style={{ background: 'var(--color-ivory)' }}>
          <BodyPicker selected={selectedMuscle} onSelect={setSelectedMuscle} />
          {selectedMuscle && (
            <button
              onClick={() => setSelectedMuscle(null)}
              className="mt-3 font-sans text-xs"
              style={{ color: 'var(--color-gold)' }}
            >
              Clear filter
            </button>
          )}
        </div>
      )}

      {/* Exercise list */}
      <div className="mt-4">
        <ExerciseList
          exercises={exercises}
          onSelect={(ex) => navigate(`/exercises/${ex.id}`)}
          showArrow
        />
      </div>

      {/* Add custom exercise modal */}
      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title="New Exercise">
        <ExerciseForm onSave={() => setShowForm(false)} onCancel={() => setShowForm(false)} />
      </Modal>
    </div>
  );
}
