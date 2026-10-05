import { useState } from 'react';
import { StickyNote, Repeat, MoreHorizontal, Link2 } from 'lucide-react';
import SetLogger from './SetLogger.jsx';
import CardioLogger from './CardioLogger.jsx';
import ExerciseInfoModal from './ExerciseInfoModal.jsx';
import ExerciseMenu from './ExerciseMenu.jsx';
import useSettingsStore from '../../store/settingsStore.js';
import { useExerciseNote } from '../../hooks/useExercises.js';
import { toDisplay, unitLabel, fmtVolume } from '../../utils/units.js';

const MUSCLE_HUE = {
  chest: '#FF8FA3', triceps: '#FF8FA3', 'front-deltoids': '#FF8FA3',
  biceps: '#8B7DFF', forearm: '#8B7DFF',
  'upper-back': '#4FD8C4', 'lower-back': '#4FD8C4', trapezius: '#4FD8C4', 'back-deltoids': '#4FD8C4',
  quadriceps: '#7B83A6', hamstring: '#7B83A6', gluteal: '#7B83A6', calves: '#7B83A6',
  abs: '#8B7DFF', obliques: '#8B7DFF',
};

const shortWeight = (kg, unit) => {
  const v = Math.round(toDisplay(kg, unit) * 10) / 10;
  return Number.isInteger(v) ? String(v) : v.toFixed(1);
};

export default function ExerciseSection({
  exercise,
  muscleGroup,
  equipment = null,
  isBodyweight,
  isCardio,
  rateUid = null,
  onSetLogged,
  onEffortRated,
  onSetRemoved,
  onRemove,
  onSwap,
  canLink,
  linked,
  onToggleSuperset,
  onMoveUp,
  onMoveDown,
  canMoveUp,
  canMoveDown,
  active = false,
  done = false,
}) {
  const hue = MUSCLE_HUE[muscleGroup] ?? '#7B83A6';
  const unit = useSettingsStore((s) => s.unit);
  const note = useExerciseNote(exercise.exerciseId);
  const [infoOpen, setInfoOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  // Live per-exercise tally for this session.
  const working = exercise.sets.filter((s) => !s.isWarmup);
  const setCount = working.length;
  const totalReps = working.reduce((a, s) => a + (s.reps || 0), 0);
  const volKg = working.reduce((a, s) => a + (s.weight || 0) * (s.reps || 0), 0);
  const targetSets = exercise.targetSets || null;
  const progress = targetSets ? Math.min(setCount / targetSets, 1) : null;
  const hasTarget = !isCardio && (exercise.targetSets || exercise.targetReps || exercise.targetWeight);

  // Cardio session totals for the header/tally.
  const cardioKcal = exercise.sets.reduce((a, s) => a + (s.calories || 0), 0);
  const cardioMin = Math.round(exercise.sets.reduce((a, s) => a + (s.durationSec || 0), 0) / 60);

  return (
    // Three states, so a glance answers "where am I?" without reading every
    // card: the one you're on is lit, finished ones recede, the rest are plain.
    <div
      className="glass mb-4 rounded-2xl px-4 pb-4 pt-2"
      style={{
        background: 'var(--color-chalk)',
        border: `1px solid ${active ? 'var(--accent-line)' : 'var(--color-ivory)'}`,
        boxShadow: active ? 'var(--glow-accent)' : undefined,
        opacity: done ? 0.72 : 1,
        transition: 'opacity var(--dur-standard) var(--opus-ease-out)',
      }}
    >
      {/* Header: one line at any width. The name opens the exercise's info;
          swap stays out because it is the mid-set emergency; everything else
          is in the menu, each as a full-size row. */}
      <div className="-mr-2 flex items-center gap-1">
        <h3 className="min-w-0 flex-1 font-sans text-base font-semibold" style={{ color: 'var(--color-text-primary)' }}>
          <button
            type="button"
            onClick={() => setInfoOpen(true)}
            aria-haspopup="dialog"
            title="Exercise info"
            className="block min-h-10 w-full truncate py-2 text-left"
          >
            {exercise.name}
          </button>
        </h3>
        {onSwap && (
          <button
            type="button"
            onClick={onSwap}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
            aria-label={`Swap ${exercise.name}`}
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-full" style={{ background: 'var(--color-ivory)' }}>
              <Repeat size={14} style={{ color: 'var(--color-ash)' }} />
            </span>
          </button>
        )}
        <button
          type="button"
          onClick={() => setMenuOpen(true)}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
          aria-haspopup="dialog"
          aria-label={`More actions for ${exercise.name}`}
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-full" style={{ background: 'var(--color-ivory)' }}>
            <MoreHorizontal size={16} style={{ color: 'var(--color-ash)' }} />
          </span>
        </button>
      </div>

      <div className="-mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1">
        {muscleGroup && (
          <span
            className="rounded-full px-2 py-0.5 font-sans text-xs capitalize"
            style={{ background: `${hue}22`, color: hue }}
          >
            {muscleGroup.replace(/-/g, ' ')}
          </span>
        )}
        {linked && (
          <span className="flex items-center gap-1 font-sans text-[11px] font-semibold" style={{ color: 'var(--color-gold)' }}>
            <Link2 size={11} aria-hidden /> superset
          </span>
        )}
        {hasTarget && (
          <span className="font-mono text-xs" style={{ color: 'var(--color-text-secondary)' }}>
            Target {exercise.targetSets ?? '—'}×{exercise.targetReps ?? '—'}
            {exercise.targetWeight ? ` @ ${shortWeight(exercise.targetWeight, unit)} ${unitLabel(unit)}` : ''}
          </span>
        )}
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
          <CardioLogger
            exerciseId={exercise.exerciseId}
            onLogged={(set) => onSetLogged?.(exercise.exerciseId, set)}
            onRemove={(setNumber) => onSetRemoved?.(exercise.exerciseId, setNumber)}
          />
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
                    className="h-full w-full origin-left rounded-full"
                    style={{
                      transform: `scaleX(${progress})`,
                      background: progress >= 1 ? 'var(--color-sage)' : 'var(--color-gold)',
                      transition: 'transform .4s var(--opus-ease-out), background-color .3s',
                    }}
                  />
                </div>
              )}
            </div>
          )}

          <SetLogger
            exerciseId={exercise.exerciseId}
            equipment={equipment}
            isBodyweight={isBodyweight}
            rateUid={rateUid}
            onSetLogged={onSetLogged}
            onEffortRated={onEffortRated}
            onSetRemoved={onSetRemoved}
          />
        </>
      )}

      <ExerciseMenu
        isOpen={menuOpen}
        onClose={() => setMenuOpen(false)}
        name={exercise.name}
        canMoveUp={canMoveUp}
        canMoveDown={canMoveDown}
        canLink={canLink && !isCardio}
        linked={linked}
        setCount={exercise.sets.length}
        onMoveUp={onMoveUp}
        onMoveDown={onMoveDown}
        onToggleSuperset={onToggleSuperset}
        onInfo={() => setInfoOpen(true)}
        onSwap={onSwap}
        onRemove={onRemove}
      />
      <ExerciseInfoModal exerciseId={exercise.exerciseId} isOpen={infoOpen} onClose={() => setInfoOpen(false)} />
    </div>
  );
}
