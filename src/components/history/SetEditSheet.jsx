import { useEffect, useState } from 'react';
import { Check, Flame, Minus, Plus, Trash2, Trophy } from 'lucide-react';
import Modal from '../ui/Modal.jsx';
import useSettingsStore from '../../store/settingsStore.js';
import useUIStore from '../../store/uiStore.js';
import { useHaptics } from '../../hooks/useHaptics.js';
import { playChime } from '../../utils/sound.js';
import { toDisplay, toKg, unitLabel } from '../../utils/units.js';
import { smallestIncrement, stepWeight } from '../../utils/loadStep.js';
import { effectivePlates } from '../../utils/inventory.js';
import { PLATES_KG, PLATES_LB } from '../../utils/plateCalc.js';
import { deleteWithUndo } from '../../utils/undoable.js';
import {
  addWorkoutSet,
  deleteWorkoutSet,
  restoreWorkoutSet,
  revertSetEdit,
  updateWorkoutSet,
} from '../../utils/workoutActions.js';

// Fixing a set after the fact.
//
// A typo in a logged set used to be permanent: the weight, the volume, the
// record it set (or did not), the XP — all of it stayed wrong forever, or the
// whole session had to be deleted to get rid of it. The same goes for the set
// you forgot to log. This edits one set (or adds one) in a saved session, and
// everything derived from it follows: totals, records, XP, badges, quests.
// Every change is offered back with Undo, like a delete.

const xpPhrase = (n) => (n > 0 ? ` · +${n} XP` : n < 0 ? ` · −${Math.abs(n)} XP` : '');

const fieldBox = { background: 'var(--color-ivory)' };

function Stepper({ label, value, onChange, onStep, unit, inputMode, autoFocus }) {
  return (
    <label className="block min-w-0 flex-1">
      <span className="mb-1.5 block font-sans text-[11px] font-semibold uppercase tracking-wide" style={{ color: 'var(--color-ash)' }}>
        {label}
      </span>
      <div className="flex items-center rounded-2xl" style={fieldBox}>
        <button
          type="button"
          onClick={() => onStep(-1)}
          className="flex h-12 w-11 shrink-0 items-center justify-center"
          aria-label={`Less ${label.toLowerCase()}`}
        >
          <Minus size={16} style={{ color: 'var(--color-ash)' }} />
        </button>
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          type="number"
          inputMode={inputMode}
          autoFocus={autoFocus}
          aria-label={label}
          className="min-w-0 flex-1 bg-transparent text-center font-mono text-xl outline-none"
          style={{ color: 'var(--color-text-primary)' }}
        />
        {unit && (
          <span className="pr-1 font-mono text-xs" style={{ color: 'var(--color-ash)' }}>
            {unit}
          </span>
        )}
        <button
          type="button"
          onClick={() => onStep(1)}
          className="flex h-12 w-11 shrink-0 items-center justify-center"
          aria-label={`More ${label.toLowerCase()}`}
        >
          <Plus size={16} style={{ color: 'var(--color-ash)' }} />
        </button>
      </div>
    </label>
  );
}

/**
 * @param target `{ mode: 'edit', set, exercise }` or `{ mode: 'add', workoutId,
 *               exercise, template }` (template = the set to prefill from), or
 *               null when closed.
 */
export default function SetEditSheet({ target: next, onClose }) {
  const unit = useSettingsStore((s) => s.unit);
  const inventory = useSettingsStore((s) => s.inventory);
  const haptic = useHaptics();
  const increment = smallestIncrement(
    effectivePlates(inventory?.[inventory?.active] ?? {}, unit, unit === 'lbs' ? PLATES_LB : PLATES_KG)
  );

  // Keep showing the last target while the sheet animates closed, instead of
  // blanking its contents on the way out.
  const [target, setTarget] = useState(next);
  if (next && next !== target) setTarget(next);

  const source = target?.mode === 'edit' ? target.set : target?.template;
  const initialWeight = source?.weight > 0 ? String(toDisplay(source.weight, unit)) : '';
  const [weight, setWeight] = useState(initialWeight);
  const [reps, setReps] = useState(source?.reps > 0 ? String(source.reps) : '');
  const [warmup, setWarmup] = useState(target?.mode === 'edit' ? !!source?.isWarmup : false);
  const [busy, setBusy] = useState(false);

  // A new target (another chip tapped) starts from its own values.
  // biome-ignore lint/correctness/useExhaustiveDependencies: keyed on the target itself, by design
  useEffect(() => {
    setWeight(initialWeight);
    setReps(source?.reps > 0 ? String(source.reps) : '');
    setWarmup(target?.mode === 'edit' ? !!source?.isWarmup : false);
    setBusy(false);
  }, [target]);

  if (!target) return null;
  const { exercise } = target;
  const isEdit = target.mode === 'edit';
  const cardio = isEdit && target.set.isCardio;

  const repsNum = Number.parseInt(reps, 10) || 0;
  const weightNum = Number.parseFloat(weight) || 0;
  const canSave = !busy && repsNum >= 1 && weightNum >= 0;

  // Only convert a weight the person actually changed: a stored 77.5 kg shows
  // as 170.86 lb, and converting that back unasked gives 77.50079 kg — an edit
  // nobody made, rippling through the records.
  const weightKg = () => (weight === initialWeight && source ? source.weight ?? 0 : toKg(weightNum, unit));

  function done(message, action) {
    haptic('tap');
    playChime('tap');
    useUIStore.getState().showToast(message, action ? { action, type: 'success' } : { type: 'success' });
    onClose();
  }

  async function save() {
    if (!canSave) return;
    setBusy(true);
    const fields = { weight: exercise.isBodyweight && weight === '' ? 0 : weightKg(), reps: repsNum, isWarmup: warmup };
    if (isEdit) {
      const snap = await updateWorkoutSet(target.set.id, fields);
      if (!snap) {
        onClose();
        return;
      }
      done(`Set updated${xpPhrase(snap.xpApplied)}`, {
        label: 'Undo',
        onAction: async () => {
          await revertSetEdit(snap);
          useUIStore.getState().showToast('Set restored', { type: 'success' });
        },
      });
    } else {
      const snap = await addWorkoutSet(target.workoutId, exercise.exerciseId, fields);
      if (!snap) {
        onClose();
        return;
      }
      done(`Set added to ${exercise.name}${xpPhrase(snap.xpApplied)}`, {
        label: 'Undo',
        onAction: async () => {
          await deleteWorkoutSet(snap.set.id, { restore: snap.derived });
          useUIStore.getState().showToast('Set removed', { type: 'success' });
        },
      });
    }
  }

  async function remove() {
    setBusy(true);
    onClose();
    await deleteWithUndo({
      // Its last working set takes the session with it, and the toast says so.
      label: (snap) => (snap.kind === 'workout' ? `${target.sessionLabel ?? 'Session'} (its last set)` : `${exercise.name} set`),
      remove: () => deleteWorkoutSet(target.set.id),
      restore: restoreWorkoutSet,
    });
  }

  const title = isEdit ? `${cardio ? 'Bout' : 'Set'} ${target.set.setNumber}` : 'Add a set';

  return (
    <Modal isOpen={!!next} onClose={onClose} title={title}>
      <p className="mb-4 flex flex-wrap items-center gap-x-2 gap-y-1 font-sans text-sm" style={{ color: 'var(--color-text-secondary)' }}>
        {exercise.name}
        {isEdit && target.set.isRecord && (
          <span className="flex items-center gap-1 font-sans text-xs font-semibold" style={{ color: 'var(--color-gold)' }}>
            <Trophy size={12} /> holds a record
          </span>
        )}
      </p>

      {cardio ? (
        <div className="mb-5 rounded-2xl px-4 py-3 font-mono text-sm" style={{ ...fieldBox, color: 'var(--color-text-primary)' }}>
          {Math.round((target.set.durationSec || 0) / 60)} min
          {target.set.speedKmh ? ` · ${Number(target.set.speedKmh).toFixed(1)} km/h` : ''}
          {target.set.distanceKm ? ` · ${Number(target.set.distanceKm).toFixed(2)} km` : ''}
          {target.set.calories ? ` · ${target.set.calories} kcal` : ''}
        </div>
      ) : (
        <>
          <div className="mb-3 flex gap-2">
            <Stepper
              label={exercise.isBodyweight ? 'Added weight' : 'Weight'}
              value={weight}
              onChange={setWeight}
              onStep={(d) => setWeight(String(stepWeight(weight, d, increment)))}
              unit={unitLabel(unit)}
              inputMode="decimal"
            />
            <Stepper
              label="Reps"
              value={reps}
              onChange={setReps}
              onStep={(d) => setReps(String(Math.max(0, repsNum + d)))}
              inputMode="numeric"
              autoFocus={!isEdit}
            />
          </div>

          <button
            type="button"
            role="switch"
            aria-checked={warmup}
            onClick={() => setWarmup((w) => !w)}
            className="mb-5 flex w-full items-center gap-2.5 rounded-2xl px-4 py-3"
            style={fieldBox}
          >
            <Flame size={15} style={{ color: warmup ? 'var(--color-ember)' : 'var(--color-ash)' }} />
            <span className="flex-1 text-left font-sans text-sm" style={{ color: 'var(--color-text-primary)' }}>
              Warm-up set
            </span>
            <span
              className="relative h-6 w-10 rounded-full transition-colors"
              style={{ background: warmup ? 'var(--color-ember)' : 'var(--color-chalk)' }}
            >
              <span
                className="absolute top-0.5 h-5 w-5 rounded-full transition-[left]"
                style={{ left: warmup ? 18 : 2, background: 'var(--color-text-primary)' }}
              />
            </span>
          </button>
        </>
      )}

      {isEdit && target.lastOfSession && (
        <p className="mb-3 font-sans text-xs leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
          This is the session's last working set — deleting it deletes the whole session.
        </p>
      )}
      <div className="flex gap-2">
        {isEdit && (
          <button
            type="button"
            onClick={remove}
            disabled={busy}
            className="flex h-12 items-center justify-center gap-2 rounded-2xl px-4 font-sans text-sm font-semibold"
            style={{ background: 'var(--color-ivory)', color: 'var(--color-ember)' }}
          >
            <Trash2 size={15} /> {target.lastOfSession ? 'Delete session' : 'Delete'}
          </button>
        )}
        {!cardio && (
          <button
            type="button"
            onClick={save}
            disabled={!canSave}
            className="flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl font-sans text-sm font-semibold"
            style={{ background: 'var(--grad-accent)', color: 'var(--color-obsidian)', opacity: canSave ? 1 : 0.4 }}
          >
            <Check size={16} /> {isEdit ? 'Save' : 'Add set'}
          </button>
        )}
      </div>
    </Modal>
  );
}
