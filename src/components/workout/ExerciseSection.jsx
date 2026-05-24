import { X, StickyNote, Link2 } from 'lucide-react';
import SetLogger from './SetLogger.jsx';
import OverloadNudge from './OverloadNudge.jsx';
import useSettingsStore from '../../store/settingsStore.js';
import { useExerciseNote } from '../../hooks/useExercises.js';
import { toDisplay, unitLabel } from '../../utils/units.js';

const MUSCLE_HUE = {
  chest: '#D4622A', triceps: '#D4622A', 'front-deltoids': '#D4622A',
  biceps: '#C9A84C', forearm: '#C9A84C',
  'upper-back': '#6B8F71', 'lower-back': '#6B8F71', trapezius: '#6B8F71', 'back-deltoids': '#6B8F71',
  quadriceps: '#8A8780', hamstring: '#8A8780', gluteal: '#8A8780', calves: '#8A8780',
  abs: '#C9A84C', obliques: '#C9A84C',
};

export default function ExerciseSection({ exercise, muscleGroup, isBodyweight, onSetLogged, onRemove, canLink, linked, onToggleSuperset }) {
  const hue = MUSCLE_HUE[muscleGroup] ?? '#8A8780';
  const unit = useSettingsStore((s) => s.unit);
  const note = useExerciseNote(exercise.exerciseId);

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
          {(exercise.targetSets || exercise.targetReps || exercise.targetWeight) && (
            <p className="mt-1 font-mono text-xs" style={{ color: 'var(--color-text-secondary)' }}>
              Target: {exercise.targetSets ?? '—'}×{exercise.targetReps ?? '—'}
              {exercise.targetWeight ? ` @ ${toDisplay(exercise.targetWeight, unit)}${unitLabel(unit)}` : ''}
            </p>
          )}
        </div>
        <div className="ml-2 flex flex-shrink-0 items-center gap-2">
          {canLink && (
            <button
              onClick={onToggleSuperset}
              className="flex items-center gap-1 rounded-full px-2 py-1 font-sans text-[11px] font-medium"
              style={{
                background: linked ? 'var(--color-gold)' : 'var(--color-ivory)',
                color: linked ? 'var(--color-obsidian)' : 'var(--color-text-secondary)',
              }}
              aria-label={linked ? 'Remove from superset' : 'Superset with exercise above'}
            >
              <Link2 size={12} /> {linked ? 'Superset' : 'Link'}
            </button>
          )}
          <button
            onClick={onRemove}
            className="flex h-7 w-7 items-center justify-center rounded-full"
            style={{ background: 'var(--color-ivory)' }}
            aria-label="Remove exercise"
          >
            <X size={13} style={{ color: 'var(--color-ash)' }} />
          </button>
        </div>
      </div>

      {note && (
        <div className="mt-3 flex items-start gap-2 rounded-xl px-3 py-2" style={{ background: 'var(--color-ivory)' }}>
          <StickyNote size={13} style={{ color: 'var(--color-ash)', marginTop: 1, flexShrink: 0 }} />
          <p className="font-sans text-xs italic" style={{ color: 'var(--color-text-secondary)' }}>{note}</p>
        </div>
      )}

      <div className="mt-3">
        <OverloadNudge exerciseId={exercise.exerciseId} />
      </div>

      <SetLogger exerciseId={exercise.exerciseId} onSetLogged={() => onSetLogged?.(exercise.exerciseId)} isBodyweight={isBodyweight} />
    </div>
  );
}
