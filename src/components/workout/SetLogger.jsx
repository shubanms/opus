import { useState } from 'react';
import { Plus, Trash2, Flame, Dumbbell } from 'lucide-react';
import useWorkoutStore from '../../store/workoutStore.js';
import { useLastSets } from '../../hooks/useWorkout.js';
import PlateCalculator from './PlateCalculator.jsx';

export default function SetLogger({ exerciseId, onSetLogged, isBodyweight = false }) {
  const { activeWorkout, logSet, removeSet, toggleWarmup } = useWorkoutStore();
  const exercise = activeWorkout?.exercises.find((e) => e.exerciseId === exerciseId);
  const lastSets = useLastSets(exerciseId);

  const [weight, setWeight] = useState('');
  const [reps, setReps] = useState('');
  const [rpe, setRpe] = useState('');
  const [showRpe, setShowRpe] = useState(false);
  const [showPlates, setShowPlates] = useState(false);
  const [addWeight, setAddWeight] = useState(false);

  if (!exercise) return null;

  const showWeight = !isBodyweight || addWeight;
  const weightNum = parseFloat(weight);
  const repsNum = parseInt(reps);
  const canLog = showWeight ? (weightNum > 0 || repsNum > 0) : repsNum > 0;

  function handleLog() {
    if (!canLog) return;
    logSet(exerciseId, {
      weight: showWeight ? weightNum || 0 : 0,
      reps: repsNum || 0,
      rpe: showRpe ? parseInt(rpe) || null : null,
      isWarmup: false,
    });
    onSetLogged?.();
    setReps('');
    setRpe('');
  }

  const fmt = (s) => (s.weight > 0 ? `${s.weight}kg × ${s.reps}` : `${s.reps} reps`);

  return (
    <div className="mt-3">
      {/* Previous session ghost */}
      {lastSets.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-3">
          {lastSets.map((s) => (
            <span key={s.id} className="font-mono text-xs" style={{ color: 'var(--color-text-secondary)' }}>
              {s.weight > 0 ? `${s.weight}×${s.reps}` : `${s.reps}`}
            </span>
          ))}
          <span className="font-sans text-xs" style={{ color: 'var(--color-text-secondary)', opacity: 0.6 }}>
            last session
          </span>
        </div>
      )}

      {/* Logged sets */}
      {exercise.sets.map((s) => (
        <div
          key={s.setNumber}
          className="mb-1 flex items-center gap-2 rounded-xl px-3 py-2"
          style={{ background: 'var(--color-ivory)' }}
        >
          <button
            onClick={() => toggleWarmup(exerciseId, s.setNumber)}
            className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full"
            style={{ background: s.isWarmup ? '#D4622A22' : 'transparent' }}
            title="Toggle warmup"
          >
            {s.isWarmup
              ? <Flame size={12} style={{ color: 'var(--color-ember)' }} />
              : <span className="font-mono text-xs" style={{ color: 'var(--color-ash)' }}>{s.setNumber}</span>
            }
          </button>
          <span className="flex-1 font-mono text-sm" style={{ color: 'var(--color-text-primary)' }}>
            {fmt(s)}
          </span>
          {s.rpe && (
            <span className="font-mono text-xs" style={{ color: 'var(--color-ash)' }}>RPE {s.rpe}</span>
          )}
          <button onClick={() => removeSet(exerciseId, s.setNumber)}>
            <Trash2 size={13} style={{ color: 'var(--color-ash)' }} />
          </button>
        </div>
      ))}

      {/* Input row */}
      <div className="mt-2 flex items-center gap-2">
        {showWeight && (
          <>
            <div className="flex flex-1 items-center gap-1 rounded-xl px-3 py-2.5" style={{ background: 'var(--color-ivory)' }}>
              <input
                value={weight}
                onChange={(e) => { setWeight(e.target.value); setShowPlates(false); }}
                placeholder="kg"
                type="number"
                inputMode="decimal"
                className="min-w-0 flex-1 bg-transparent font-mono text-sm outline-none"
                style={{ color: 'var(--color-text-primary)' }}
              />
              {weightNum > 0 && (
                <button onClick={() => setShowPlates((v) => !v)} aria-label="Plate calculator">
                  <Dumbbell size={13} style={{ color: showPlates ? 'var(--color-gold)' : 'var(--color-ash)' }} />
                </button>
              )}
            </div>
            <span className="font-sans text-sm" style={{ color: 'var(--color-ash)' }}>×</span>
          </>
        )}

        <div className="flex-1 rounded-xl px-3 py-2.5" style={{ background: 'var(--color-ivory)' }}>
          <input
            value={reps}
            onChange={(e) => setReps(e.target.value)}
            placeholder="reps"
            type="number"
            inputMode="numeric"
            className="w-full bg-transparent text-center font-mono text-sm outline-none"
            style={{ color: 'var(--color-text-primary)' }}
          />
        </div>

        {showRpe && (
          <div className="w-14 rounded-xl px-2 py-2.5" style={{ background: 'var(--color-ivory)' }}>
            <input
              value={rpe}
              onChange={(e) => setRpe(e.target.value)}
              placeholder="RPE"
              type="number"
              min="1" max="10"
              inputMode="numeric"
              className="w-full bg-transparent text-center font-mono text-xs outline-none"
              style={{ color: 'var(--color-ash)' }}
            />
          </div>
        )}

        <button
          onClick={handleLog}
          disabled={!canLog}
          className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full"
          style={{ background: 'var(--color-gold)', color: 'var(--color-obsidian)', opacity: canLog ? 1 : 0.35 }}
        >
          <Plus size={18} strokeWidth={2.5} />
        </button>
      </div>

      {/* Toggles */}
      <div className="mt-1 flex gap-4">
        <button
          onClick={() => setShowRpe((v) => !v)}
          className="font-sans text-xs"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          {showRpe ? 'Hide RPE' : '+ Add RPE'}
        </button>
        {isBodyweight && (
          <button
            onClick={() => { setAddWeight((v) => !v); setWeight(''); setShowPlates(false); }}
            className="font-sans text-xs"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            {addWeight ? 'Bodyweight only' : '+ Add weight'}
          </button>
        )}
      </div>

      {/* Plate calculator */}
      {showPlates && weightNum > 0 && (
        <PlateCalculator weight={weightNum} onClose={() => setShowPlates(false)} />
      )}
    </div>
  );
}
