import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, Zap, Layers, ChevronDown, RotateCcw, Flame, Trash2 } from 'lucide-react';
import { useWorkoutDetail, useShareData } from '../../hooks/useWorkout.js';
import { deleteWorkout } from '../../utils/workoutActions.js';
import { fmtVolume, toDisplay } from '../../utils/units.js';
import ShareButton from '../share/ShareButton.jsx';
import useWorkoutStore from '../../store/workoutStore.js';
import useSettingsStore from '../../store/settingsStore.js';

function formatDuration(secs) {
  const m = Math.floor(secs / 60);
  const h = Math.floor(m / 60);
  return h > 0 ? `${h}h ${m % 60}m` : `${m}m`;
}

function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function WorkoutCard({ workout }) {
  const [expanded, setExpanded] = useState(false);
  const navigate = useNavigate();
  const repeatWorkout = useWorkoutStore((s) => s.repeatWorkout);
  const unit = useSettingsStore((s) => s.unit);
  const detail = useWorkoutDetail(expanded ? workout.id : null);
  const shareData = useShareData(expanded ? workout.id : null);

  async function handleRepeat(e) {
    e.stopPropagation();
    await repeatWorkout(workout.id);
    navigate('/workout');
  }

  async function handleDelete(e) {
    e.stopPropagation();
    if (window.confirm(`Delete "${workout.name}"? This can't be undone.`)) {
      await deleteWorkout(workout.id);
    }
  }

  return (
    <div
      className="mb-3 rounded-2xl px-4 py-3"
      style={{ background: 'var(--color-chalk)', border: '1px solid var(--color-ivory)' }}
    >
      <button onClick={() => setExpanded((v) => !v)} className="w-full text-left">
        <div className="flex items-start justify-between">
          <div>
            <p className="font-sans text-base font-semibold" style={{ color: 'var(--color-text-primary)' }}>
              {workout.name}
            </p>
            <p className="mt-0.5 font-sans text-xs" style={{ color: 'var(--color-text-secondary)' }}>
              {formatDate(workout.date)}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {workout.xpEarned > 0 && (
              <span className="flex items-center gap-1 font-mono text-sm font-medium" style={{ color: 'var(--color-gold)' }}>
                <Zap size={13} />+{workout.xpEarned}
              </span>
            )}
            <ChevronDown
              size={16}
              style={{ color: 'var(--color-ash)', transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 200ms' }}
            />
          </div>
        </div>

        <div className="mt-3 flex gap-4">
          <span className="flex items-center gap-1.5 font-sans text-xs" style={{ color: 'var(--color-text-secondary)' }}>
            <Clock size={12} />
            {formatDuration(workout.duration)}
          </span>
          <span className="flex items-center gap-1.5 font-sans text-xs" style={{ color: 'var(--color-text-secondary)' }}>
            <Layers size={12} />
            {workout.totalSets} sets
          </span>
          {workout.totalVolume > 0 && (
            <span className="font-sans text-xs" style={{ color: 'var(--color-text-secondary)' }}>
              {fmtVolume(workout.totalVolume, unit)}
            </span>
          )}
        </div>
      </button>

      {expanded && (
        <div className="mt-3 border-t pt-3" style={{ borderColor: 'var(--color-ivory)' }}>
          {detail.map((ex) => (
            <div key={ex.exerciseId} className="mb-2">
              <p className="font-sans text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
                {ex.name}
              </p>
              <div className="mt-1 flex flex-wrap gap-2">
                {ex.sets.map((s) => (
                  <span
                    key={s.id}
                    className="flex items-center gap-1 font-mono text-xs"
                    style={{ color: s.isWarmup ? 'var(--color-ember)' : 'var(--color-text-secondary)' }}
                  >
                    {s.isWarmup && <Flame size={10} />}
                    {s.weight > 0 ? `${toDisplay(s.weight, unit)}×${s.reps}` : `${s.reps} reps`}
                  </span>
                ))}
              </div>
            </div>
          ))}
          <div className="mt-2 flex gap-2">
            <button
              onClick={handleRepeat}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 font-sans text-sm font-semibold"
              style={{ background: 'var(--color-gold)', color: 'var(--color-obsidian)' }}
            >
              <RotateCcw size={14} /> Repeat this workout
            </button>
            <ShareButton
              data={shareData}
              label=""
              className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl"
              style={{ background: 'var(--color-ivory)', color: 'var(--color-text-primary)' }}
            />
            <button
              onClick={handleDelete}
              className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl"
              style={{ background: 'var(--color-ivory)' }}
              aria-label="Delete workout"
            >
              <Trash2 size={15} style={{ color: 'var(--color-ember)' }} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
