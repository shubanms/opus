import { useState } from 'react';
import { X, StickyNote, Link2, ChevronUp, ChevronDown, Repeat, Info } from 'lucide-react';
import SetLogger from './SetLogger.jsx';
import CardioLogger from './CardioLogger.jsx';
import OverloadNudge from './OverloadNudge.jsx';
import ExerciseInfoModal from './ExerciseInfoModal.jsx';
import useSettingsStore from '../../store/settingsStore.js';
import { useExerciseNote } from '../../hooks/useExercises.js';
import { toDisplay, unitLabel, fmtVolume } from '../../utils/units.js';

const MUSCLE_HUE = {
  chest: '#D4622A', triceps: '#D4622A', 'front-deltoids': '#D4622A',
  biceps: '#C9A84C', forearm: '#C9A84C',
  'upper-back': '#6B8F71', 'lower-back': '#6B8F71', trapezius: '#6B8F71', 'back-deltoids': '#6B8F71',
  quadriceps: '#8A8780', hamstring: '#8A8780', gluteal: '#8A8780', calves: '#8A8780',
  abs: '#C9A84C', obliques: '#C9A84C',
};

export default function ExerciseSection({ exercise, muscleGroup, isBodyweight, isCardio, onSetLogged, onRemove, onSwap, canLink, linked, onToggleSuperset, onMoveUp, onMoveDown, canMoveUp, canMoveDown }) {
  const hue = MUSCLE_HUE[muscleGroup] ?? '#8A8780';
  const unit = useSettingsStore((s) => s.unit);
  const note = useExerciseNote(exercise.exerciseId);
  const [infoOpen, setInfoOpen] = useState(false);

  // Live per-exercise tally for this session.
  const working = exercise.sets.filter((s) => !s.isWarmup);
  const setCount = working.length;
  const totalReps = working.reduce((a, s) => a + (s.reps || 0), 0);
  const volKg = working.reduce((a, s) => a + (s.weight || 0) * (s.reps || 0), 0);
  const targetSets = exercise.targetSets || null;
  const progress = targetSets ? Math.min(setCount / targetSets, 1) : null;

  // Cardio session totals for the header/tally.
  const cardioKcal = exercise.sets.reduce((a, s) => a + (s.calories || 0), 0);
  const cardioMin = Math.round(exercise.sets.reduce((a, s) => a + (s.durationSec || 0), 0) / 60);

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
          {!isCardio && (exercise.targetSets || exercise.targetReps || exercise.targetWeight) && (
            <p className="mt-1 font-mono text-xs" style={{ color: 'var(--color-text-secondary)' }}>
              Target: {exercise.targetSets ?? '—'}×{exercise.targetReps ?? '—'}
              {exercise.targetWeight ? ` @ ${toDisplay(exercise.targetWeight, unit)}${unitLabel(unit)}` : ''}
            </p>
          )}
        </div>
        <div className="ml-2 flex flex-shrink-0 items-center gap-2">
          <div className="flex flex-col">
            <button
              onClick={onMoveUp}
              disabled={!canMoveUp}
              aria-label="Move exercise up"
              style={{ opacity: canMoveUp ? 1 : 0.25 }}
            >
              <ChevronUp size={16} style={{ color: 'var(--color-ash)' }} />
            </button>
            <button
              onClick={onMoveDown}
              disabled={!canMoveDown}
              aria-label="Move exercise down"
              style={{ opacity: canMoveDown ? 1 : 0.25 }}
            >
              <ChevronDown size={16} style={{ color: 'var(--color-ash)' }} />
            </button>
          </div>
          <button
            onClick={() => setInfoOpen(true)}
            className="flex h-7 w-7 items-center justify-center rounded-full"
            style={{ background: 'var(--color-ivory)' }}
            aria-label="Exercise info"
          >
            <Info size={13} style={{ color: 'var(--color-ash)' }} />
          </button>
          {canLink && !isCardio && (
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
          {onSwap && (
            <button
              onClick={onSwap}
              className="flex h-7 w-7 items-center justify-center rounded-full"
              style={{ background: 'var(--color-ivory)' }}
              aria-label="Swap exercise"
            >
              <Repeat size={13} style={{ color: 'var(--color-ash)' }} />
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

      {isCardio ? (
        <>
          {cardioKcal > 0 && (
            <p className="mt-3 font-mono text-xs" style={{ color: 'var(--color-text-secondary)' }}>
              {cardioMin} min · <span style={{ color: 'var(--color-gold)' }}>{cardioKcal} kcal</span>
            </p>
          )}
          <CardioLogger exerciseId={exercise.exerciseId} onLogged={() => onSetLogged?.(exercise.exerciseId)} />
        </>
      ) : (
        <>
          {(setCount > 0 || targetSets) && (
            <div className="mt-3">
              <p className="font-mono text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                {setCount} set{setCount === 1 ? '' : 's'}{targetSets ? ` / ${targetSets}` : ''}
                {totalReps > 0 ? ` · ${totalReps} reps` : ''}
                {volKg > 0 ? ` · ${fmtVolume(volKg, unit)}` : ''}
              </p>
              {progress != null && (
                <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full" style={{ background: 'var(--color-ivory)' }}>
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${progress * 100}%`, background: progress >= 1 ? 'var(--color-sage)' : 'var(--color-gold)', transition: 'width .4s var(--ease-out)' }}
                  />
                </div>
              )}
            </div>
          )}

          <div className="mt-3">
            <OverloadNudge exerciseId={exercise.exerciseId} />
          </div>

          <SetLogger exerciseId={exercise.exerciseId} onSetLogged={() => onSetLogged?.(exercise.exerciseId)} isBodyweight={isBodyweight} />
        </>
      )}

      <ExerciseInfoModal exerciseId={exercise.exerciseId} isOpen={infoOpen} onClose={() => setInfoOpen(false)} />
    </div>
  );
}
