import { X } from 'lucide-react';
import SetLogger from './SetLogger.jsx';

const MUSCLE_HUE = {
  chest: '#D4622A', triceps: '#D4622A', 'front-deltoids': '#D4622A',
  biceps: '#C9A84C', forearm: '#C9A84C',
  'upper-back': '#6B8F71', 'lower-back': '#6B8F71', trapezius: '#6B8F71', 'back-deltoids': '#6B8F71',
  quadriceps: '#8A8780', hamstring: '#8A8780', gluteal: '#8A8780', calves: '#8A8780',
  abs: '#C9A84C', obliques: '#C9A84C',
};

export default function ExerciseSection({ exercise, muscleGroup, onSetLogged, onRemove }) {
  const hue = MUSCLE_HUE[muscleGroup] ?? '#8A8780';

  return (
    <div
      className="mb-4 rounded-2xl px-4 pb-4 pt-3"
      style={{ background: 'var(--color-chalk)', border: '1px solid var(--color-ivory)' }}
    >
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-sans text-base font-semibold" style={{ color: 'var(--color-text-primary)' }}>
            {exercise.name}
          </h3>
          <span
            className="mt-0.5 inline-block rounded-full px-2 py-0.5 font-sans text-xs capitalize"
            style={{ background: hue + '22', color: hue }}
          >
            {(muscleGroup ?? '').replace(/-/g, ' ')}
          </span>
        </div>
        <button
          onClick={onRemove}
          className="ml-2 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full"
          style={{ background: 'var(--color-ivory)' }}
          aria-label="Remove exercise"
        >
          <X size={13} style={{ color: 'var(--color-ash)' }} />
        </button>
      </div>

      <SetLogger exerciseId={exercise.exerciseId} onSetLogged={onSetLogged} />
    </div>
  );
}
