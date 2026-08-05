import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Star } from 'lucide-react';
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
  const [favoritesOnly, setFavoritesOnly] = useState(false);

  // When searching: ignore muscle filter so results span all groups
  const all = useExercises({
    muscleGroup: search ? null : selectedMuscle,
    search,
  });
  const exercises = favoritesOnly ? all.filter((e) => e.favorite) : all;

  const subtitle =
    selectedMuscle && !search
      ? `${exercises.length} exercises · ${selectedMuscle.replace(/-/g, ' ')}`
      : `${Array.isArray(exercises) ? exercises.length : '…'} exercises`;

  return (
    <div className="px-5 pb-6 pt-6">
      {/* Header */}
      <div className="mb-4 flex items-end justify-between">
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
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
          style={{ background: 'var(--color-obsidian)' }}
          aria-label="Add custom exercise"
        >
          <Plus size={18} style={{ color: 'var(--color-text-inverse)' }} />
        </button>
      </div>

      {/* Search + favorites */}
      <div className="flex items-center gap-2">
        <div className="flex-1">
          <ExerciseSearch value={search} onChange={setSearch} />
        </div>
        <button
          onClick={() => setFavoritesOnly((v) => !v)}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
          style={{ background: favoritesOnly ? 'var(--color-gold)' : 'var(--color-ivory)' }}
          aria-label="Show favorites only"
        >
          <Star size={18} fill={favoritesOnly ? 'var(--color-obsidian)' : 'none'} style={{ color: favoritesOnly ? 'var(--color-obsidian)' : 'var(--color-ash)' }} />
        </button>
      </div>

      {/* Muscle filter — compact, hidden while searching */}
      {!search && (
        <div className="mt-3">
          <div className="flex items-center justify-between">
            <span className="font-sans text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--color-text-secondary)' }}>
              Filter by muscle
            </span>
            {selectedMuscle && (
              <button
                onClick={() => setSelectedMuscle(null)}
                className="font-sans text-xs font-medium"
                style={{ color: 'var(--color-gold)' }}
              >
                Clear
              </button>
            )}
          </div>
          <div className="mt-2">
            <BodyPicker selected={selectedMuscle} onSelect={setSelectedMuscle} />
          </div>
        </div>
      )}

      {/* Exercise list */}
      <div className="mt-5">
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
