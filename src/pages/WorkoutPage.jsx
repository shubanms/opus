import { useState, useRef } from 'react';
import { Plus } from 'lucide-react';
import useWorkoutStore from '../store/workoutStore.js';
import ExerciseSection from '../components/workout/ExerciseSection.jsx';
import ExercisePicker from '../components/workout/ExercisePicker.jsx';
import RestTimer from '../components/workout/RestTimer.jsx';
import EndWorkoutModal from '../components/workout/EndWorkoutModal.jsx';
import { useExercise } from '../hooks/useExercises.js';

function ElapsedTimer({ startedAt }) {
  const [secs, setSecs] = useState(Math.round((Date.now() - startedAt) / 1000));
  useEffect(() => {
    const id = setInterval(() => setSecs(Math.round((Date.now() - startedAt) / 1000)), 1000);
    return () => clearInterval(id);
  }, [startedAt]);
  const m = Math.floor(secs / 60);
  const h = Math.floor(m / 60);
  return (
    <span className="font-mono text-sm" style={{ color: 'var(--color-text-secondary)' }}>
      {h > 0 ? `${h}h ${m % 60}m` : `${m}m`}
    </span>
  );
}

function ExerciseSectionWrapper({ ex, onSetLogged, onRemove }) {
  const exerciseData = useExercise(ex.exerciseId);
  const muscleGroup = exerciseData?.muscleGroup ?? null;
  return (
    <ExerciseSection
      exercise={ex}
      muscleGroup={muscleGroup}
      onSetLogged={onSetLogged}
      onRemove={onRemove}
    />
  );
}

export default function WorkoutPage() {
  const { activeWorkout, startWorkout, addExercise, removeExercise, discardWorkout, completeWorkout, setWorkoutName } = useWorkoutStore();

  const [pickerOpen, setPickerOpen] = useState(false);
  const [endOpen, setEndOpen] = useState(false);
  const [showRest, setShowRest] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const nameRef = useRef();

  const alreadyAdded = activeWorkout?.exercises.map((e) => e.exerciseId) ?? [];

  function handleSetLogged() {
    setShowRest(true);
  }

  async function handleSave(xp) {
    await completeWorkout(xp);
    setEndOpen(false);
  }

  if (!activeWorkout) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-6 pb-24">
        <p className="mb-2 font-display text-5xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
          Ready?
        </p>
        <p className="mb-10 font-sans text-sm" style={{ color: 'var(--color-text-secondary)' }}>
          Start a new workout session
        </p>
        <button
          onClick={() => startWorkout()}
          className="rounded-2xl px-10 py-4 font-sans text-base font-semibold"
          style={{ background: 'var(--color-gold)', color: 'var(--color-obsidian)' }}
        >
          Start workout
        </button>
      </div>
    );
  }

  return (
    <div className="px-5 pb-40 pt-8">
      {/* Header */}
      <div className="mb-5 flex items-start justify-between">
        <div className="flex-1">
          {editingName ? (
            <input
              ref={nameRef}
              autoFocus
              value={activeWorkout.name}
              onChange={(e) => setWorkoutName(e.target.value)}
              onBlur={() => setEditingName(false)}
              onKeyDown={(e) => e.key === 'Enter' && setEditingName(false)}
              className="w-full bg-transparent font-display text-3xl font-bold leading-none outline-none"
              style={{ color: 'var(--color-text-primary)' }}
            />
          ) : (
            <button onClick={() => setEditingName(true)} className="text-left">
              <h1 className="font-display text-3xl font-bold leading-none" style={{ color: 'var(--color-text-primary)' }}>
                {activeWorkout.name}
              </h1>
            </button>
          )}
          <ElapsedTimer startedAt={activeWorkout.startedAt} />
        </div>
        <div className="ml-4 flex gap-2">
          <button
            onClick={discardWorkout}
            className="rounded-xl px-3 py-2 font-sans text-xs font-medium"
            style={{ background: 'var(--color-ivory)', color: 'var(--color-text-secondary)' }}
          >
            Discard
          </button>
          <button
            onClick={() => setEndOpen(true)}
            className="rounded-xl px-3 py-2 font-sans text-xs font-semibold"
            style={{ background: 'var(--color-gold)', color: 'var(--color-obsidian)' }}
          >
            Finish
          </button>
        </div>
      </div>

      {/* Rest timer */}
      {showRest && (
        <div className="mb-4">
          <RestTimer
            duration={90}
            onComplete={() => setShowRest(false)}
            onSkip={() => setShowRest(false)}
          />
        </div>
      )}

      {/* Exercise sections */}
      {activeWorkout.exercises.map((ex) => (
        <ExerciseSectionWrapper
          key={ex.exerciseId}
          ex={ex}
          onSetLogged={handleSetLogged}
          onRemove={() => removeExercise(ex.exerciseId)}
        />
      ))}

      {/* Add exercise */}
      <button
        onClick={() => setPickerOpen(true)}
        className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl py-4 font-sans text-sm font-medium"
        style={{ background: 'var(--color-chalk)', border: '1px dashed var(--color-ivory)', color: 'var(--color-text-secondary)' }}
      >
        <Plus size={16} /> Add exercise
      </button>

      <ExercisePicker
        isOpen={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={addExercise}
        alreadyAdded={alreadyAdded}
      />

      <EndWorkoutModal
        isOpen={endOpen}
        activeWorkout={activeWorkout}
        elapsedSecs={Math.round((Date.now() - activeWorkout.startedAt) / 1000)}
        onSave={handleSave}
        onClose={() => setEndOpen(false)}
      />
    </div>
  );
}
