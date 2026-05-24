import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, Zap, Layers, ChevronDown, RotateCcw, Flame, Trash2 } from 'lucide-react';
import { useWorkoutDetail, useShareData } from '../../hooks/useWorkout.js';
import { deleteWorkout } from '../../utils/workoutActions.js';
import { fmtVolume, toDisplay } from '../../utils/units.js';
import { avgRest, avgRestAcross, formatRest } from '../../utils/restStats.js';
import { setWorkoutNote, setWorkoutColor } from '../../utils/noteActions.js';
import ShareButton from '../share/ShareButton.jsx';
import ColorPicker from '../ui/ColorPicker.jsx';
import useWorkoutStore from '../../store/workoutStore.js';
import useUIStore from '../../store/uiStore.js';
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
    const ok = await useUIStore.getState().confirm({
      title: 'Delete workout?',
      message: `"${workout.name}" and its sets will be removed, and the XP it earned reverted. This can't be undone.`,
      confirmLabel: 'Delete',
      danger: true,
    });
    if (ok) await deleteWorkout(workout.id);
  }

  return (
    <div
      className="mb-3 rounded-2xl px-4 py-3"
      style={{ background: 'var(--color-chalk)', border: '1px solid var(--color-ivory)' }}
    >
      <button onClick={() => setExpanded((v) => !v)} className="w-full text-left">
        <div className="flex items-start justify-between">
          <div>
            <p className="flex items-center gap-2 font-sans text-base font-semibold" style={{ color: 'var(--color-text-primary)' }}>
              {workout.color && <span className="h-2.5 w-2.5 flex-shrink-0 rounded-full" style={{ background: workout.color }} />}
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
          {/* Session summary incl. rest */}
          <div className="mb-3 flex flex-wrap gap-x-5 gap-y-1">
            <span className="font-sans text-xs" style={{ color: 'var(--color-text-secondary)' }}>
              {detail.length} exercise{detail.length === 1 ? '' : 's'}
            </span>
            <span className="font-sans text-xs" style={{ color: 'var(--color-text-secondary)' }}>
              {formatDuration(workout.duration)} total
            </span>
            <span className="font-sans text-xs" style={{ color: 'var(--color-text-secondary)' }}>
              avg rest {formatRest(avgRestAcross(detail.map((e) => e.sets)))}
            </span>
          </div>

          {detail.map((ex) => {
            const rest = avgRest(ex.sets);
            return (
              <div key={ex.exerciseId} className="mb-2">
                <div className="flex items-baseline justify-between">
                  <p className="font-sans text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
                    {ex.name}
                  </p>
                  {rest != null && (
                    <span className="font-mono text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                      rest {formatRest(rest)}
                    </span>
                  )}
                </div>
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
                {ex.sets.some((s) => s.note) && (
                  <div className="mt-1">
                    {ex.sets.filter((s) => s.note).map((s) => (
                      <p key={s.id} className="font-sans text-xs italic" style={{ color: 'var(--color-text-secondary)' }}>
                        · {s.note}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {/* Session note */}
          <textarea
            key={workout.notes}
            defaultValue={workout.notes ?? ''}
            onBlur={(e) => setWorkoutNote(workout.id, e.target.value)}
            placeholder="Add a note…"
            rows={2}
            className="mb-3 mt-1 w-full resize-none rounded-xl px-3 py-2 font-sans text-sm outline-none"
            style={{ background: 'var(--color-ivory)', color: 'var(--color-text-primary)' }}
          />

          {/* Colour label */}
          <div className="mb-3">
            <ColorPicker value={workout.color ?? null} onChange={(c) => setWorkoutColor(workout.id, c)} />
          </div>

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
