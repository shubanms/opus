import { useState, useEffect, useRef } from 'react';
import { X, Plus, ChevronUp, ChevronDown, Shuffle, Pin, Repeat, History, Timer } from 'lucide-react';
import Modal from '../ui/Modal.jsx';
import ExercisePicker from '../workout/ExercisePicker.jsx';
import { createTemplate, updateTemplate, lastSessionTargets, ROUTINE_SOURCE } from '../../utils/templateActions.js';
import { moveItem } from '../../utils/reorder.js';
import { reshuffleRoutine, makeRng } from '../../utils/routineGenerator.js';
import { PROGRESSION_DEFAULTS, stepLabel } from '../../utils/progression.js';
import { weekdayConflicts, DAY_SHORT } from '../../utils/routineDays.js';
import { friendlyDate } from '../../utils/dateKey.js';
import { useExercises } from '../../hooks/useExercises.js';
import { useHaptics } from '../../hooks/useHaptics.js';
import { playChime } from '../../utils/sound.js';
import useSettingsStore from '../../store/settingsStore.js';
import useUIStore from '../../store/uiStore.js';
import { toDisplay, toKg, unitLabel } from '../../utils/units.js';
import ColorPicker from '../ui/ColorPicker.jsx';

const DAYS = [
  { v: null, l: 'Any' }, { v: 1, l: 'Mon' }, { v: 2, l: 'Tue' }, { v: 3, l: 'Wed' },
  { v: 4, l: 'Thu' }, { v: 5, l: 'Fri' }, { v: 6, l: 'Sat' }, { v: 0, l: 'Sun' },
];

const MISSES_WORD = { 1: 'once', 2: 'twice' };

// The builder's row: the form values (strings, display unit) plus everything
// else the routine stores about the lift, carried through untouched — a save
// used to drop rest times, miss counts and per-lift steps. `orig` is the target
// as loaded, so an edited target can start its miss count afresh.
function rowFrom(e, unit) {
  const row = {
    id: e.id,
    name: e.name,
    muscleGroup: e.muscleGroup,
    difficulty: e.difficulty,
    pinned: false,
    targetSets: e.targetSets ?? '',
    targetReps: e.targetReps ?? '',
    targetWeight: e.targetWeight != null ? toDisplay(e.targetWeight, unit) : '',
    targetRest: e.targetRest ?? '',
    misses: e.misses ?? 0,
    weightStep: e.weightStep ?? null,
  };
  row.orig = { targetSets: row.targetSets, targetReps: row.targetReps, targetWeight: row.targetWeight };
  return row;
}

function newRow(ex) {
  return {
    id: ex.id, name: ex.name, muscleGroup: ex.muscleGroup, difficulty: ex.difficulty, pinned: false,
    targetSets: '', targetReps: '', targetWeight: '', targetRest: '', misses: 0, weightStep: null, orig: null,
  };
}

// A different lift in the same slot: keep sets, reps and rest; the weight, the
// miss count and any per-lift step belonged to the lift that left.
function swapped(row, ex) {
  return { ...row, id: ex.id, name: ex.name, muscleGroup: ex.muscleGroup, difficulty: ex.difficulty, targetWeight: '', misses: 0, weightStep: null, orig: null };
}

const num = (v) => (v === '' || v == null ? null : Number(v));

export default function TemplateBuilder({ isOpen, onClose, editing = null, templates = [] }) {
  const unit = useSettingsStore((s) => s.unit);
  const allExercises = useExercises();
  const haptic = useHaptics();
  const [name, setName] = useState(editing?.name ?? '');
  const [day, setDay] = useState(editing?.dayOfWeek ?? null);
  const [color, setColor] = useState(editing?.color ?? null);
  const [progression, setProgression] = useState(editing?.progression?.mode ?? 'off');
  const [exercises, setExercises] = useState(() => (editing?.exercises ?? []).map((e) => rowFrom(e, unit)));
  const [pickerOpen, setPickerOpen] = useState(false);
  const [swapId, setSwapId] = useState(null); // exercise being replaced, or null
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);

  // The builder stays mounted (only the Modal toggles), so re-sync local state
  // from `editing` every time it opens — otherwise editing an existing routine
  // shows an empty "create from scratch" form.
  // biome-ignore lint/correctness/useExhaustiveDependencies: re-sync on open only — `unit` can't change while the sheet is up, and re-running on it would wipe edits in progress.
  useEffect(() => {
    if (!isOpen) return;
    setName(editing?.name ?? '');
    setDay(editing?.dayOfWeek ?? null);
    setColor(editing?.color ?? null);
    setProgression(editing?.progression?.mode ?? 'off');
    setExercises((editing?.exercises ?? []).map((e) => rowFrom(e, unit)));
    setPickerOpen(false);
    setSwapId(null);
  }, [isOpen, editing]);

  // The scheme as saved: the routine's own settings (a program's step and
  // deload threshold) with only the mode changed. Rebuilding it from defaults
  // on every save reset 5/3/1-style schemes to +2.5 / deload after 2.
  const scheme = { ...PROGRESSION_DEFAULTS, ...(editing?.progression ?? {}), mode: progression };
  const conflict = day == null ? null : weekdayConflicts(templates, [day], { exclude: editing ? [editing.id] : [] })[0];

  function addExercise(ex) {
    setExercises((prev) => (prev.some((e) => e.id === ex.id) ? prev : [...prev, newRow(ex)]));
  }

  function togglePin(id) {
    setExercises((prev) => prev.map((e) => (e.id === id ? { ...e, pinned: !e.pinned } : e)));
  }

  // Replace one exercise with another, keeping its sets/reps/rest/pin/position.
  function swapExercise(ex) {
    setExercises((prev) => {
      if (prev.some((e) => e.id === ex.id && e.id !== swapId)) return prev; // no duplicates
      return prev.map((e) => (e.id === swapId ? swapped(e, ex) : e));
    });
  }
  function startSwap(id) { setSwapId(id); setPickerOpen(true); }

  function shuffleBuilder(intensity) {
    const slots = exercises.map((e) => ({ exerciseId: e.id, muscleGroup: e.muscleGroup, difficulty: e.difficulty }));
    const pinnedIds = exercises.filter((e) => e.pinned).map((e) => e.id);
    const next = reshuffleRoutine({ slots, intensity, pinnedIds, pool: allExercises, rng: makeRng(Date.now()) });
    const byId = Object.fromEntries(allExercises.map((x) => [x.id, x]));
    setExercises((prev) => next.map((s, i) => {
      const old = prev[i];
      if (s.exerciseId === old.id) return old;
      const ex = byId[s.exerciseId] ?? { id: s.exerciseId, name: old.name, muscleGroup: s.muscleGroup, difficulty: s.difficulty };
      return swapped(old, ex);
    }));
    playChime('start');
  }

  function setField(id, field, value) {
    setExercises((prev) => prev.map((e) => (e.id === id ? { ...e, [field]: value } : e)));
  }

  // Targets from the last session of this lift (same rules as "Save as routine").
  async function fillFromLast(row) {
    const t = await lastSessionTargets(row.id);
    if (!t || (t.targetSets == null && t.targetReps == null && t.targetWeight == null)) {
      useUIStore.getState().showToast(`No logged sets of ${row.name} yet`, { type: 'info' });
      return;
    }
    setExercises((prev) => prev.map((e) => (e.id === row.id
      ? {
          ...e,
          targetSets: t.targetSets ?? e.targetSets,
          targetReps: t.targetReps ?? e.targetReps,
          targetWeight: t.targetWeight != null ? toDisplay(t.targetWeight, unit) : e.targetWeight,
        }
      : e)));
    haptic('tap');
    const when = friendlyDate(t.date);
    const said = when === 'Today' || when === 'Yesterday' ? when.toLowerCase() : when;
    useUIStore.getState().showToast(`${row.name}: filled from ${said || 'your last session'}`, { type: 'success' });
  }

  function removeExercise(id) {
    setExercises((prev) => prev.filter((e) => e.id !== id));
  }

  function move(index, dir) {
    setExercises((prev) => moveItem(prev, index, dir));
  }

  function reset() {
    setName('');
    setDay(null);
    setColor(null);
    setExercises([]);
    setPickerOpen(false);
  }

  async function handleSave() {
    // A double-tap on Save created the routine twice.
    if (savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    try {
      const payload = {
        name,
        dayOfWeek: day,
        color,
        progression: scheme,
        exercises: exercises.map((e) => {
          const targetWeight = e.targetWeight === '' ? null : toKg(Number(e.targetWeight), unit);
          // A target you changed by hand is a new target: its miss count starts over.
          const same = (field) => Boolean(e.orig) && String(e.orig[field] ?? '') === String(e[field] ?? '');
          const changed = !same('targetSets') || !same('targetReps') || !same('targetWeight');
          return {
            exerciseId: e.id,
            targetSets: num(e.targetSets),
            targetReps: num(e.targetReps),
            // An untouched weight is written back exactly as stored — a round
            // trip through the display unit would nudge a lbs user's kg target.
            targetWeight: same('targetWeight') ? editingWeight(editing, e.id) ?? targetWeight : targetWeight,
            targetRest: num(e.targetRest),
            misses: changed ? 0 : e.misses,
            weightStep: e.weightStep,
          };
        }),
      };
      if (editing) await updateTemplate(editing.id, payload);
      else await createTemplate({ ...payload, source: ROUTINE_SOURCE.user });
      reset();
      onClose();
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }

  const canSave = name.trim().length > 0 && exercises.length > 0 && !saving;
  const targetInput = {
    background: 'var(--color-chalk)',
    color: 'var(--color-text-primary)',
  };
  const step = stepLabel(scheme.weightStep, unit);
  const ownSteps = exercises.filter((e) => e.weightStep != null && e.weightStep !== scheme.weightStep);
  const missWord = MISSES_WORD[scheme.deloadAfterMisses] ?? `${scheme.deloadAfterMisses} times`;

  return (
    <Modal isOpen={isOpen} onClose={() => { reset(); onClose(); }} title={editing ? 'Edit Routine' : 'New Routine'}>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Routine name (e.g. Push Day)"
        aria-label="Routine name"
        className="w-full rounded-xl px-4 py-3 font-sans text-sm outline-none"
        style={{ background: 'var(--color-ivory)', color: 'var(--color-text-primary)' }}
      />

      <div className="mt-3 flex flex-wrap gap-2">
        {DAYS.map((d) => (
          <button
            type="button"
            key={d.l}
            onClick={() => setDay(d.v)}
            aria-pressed={day === d.v}
            className="rounded-full px-3 py-1.5 font-sans text-xs font-medium"
            style={{
              background: day === d.v ? 'var(--color-gold)' : 'var(--color-ivory)',
              color: day === d.v ? 'var(--color-obsidian)' : 'var(--color-text-secondary)',
            }}
          >
            {d.l}
          </button>
        ))}
      </div>
      {conflict && (
        <p className="mt-1.5 font-sans text-[11px]" style={{ color: 'var(--color-ash)' }}>
          {DAY_SHORT[conflict.dayOfWeek]} is “{conflict.template.name}” now — saving moves it off the plan.
        </p>
      )}

      <div className="mt-3">
        <ColorPicker value={color} onChange={setColor} />
      </div>

      <div className="mt-4">
        <p className="mb-1.5 font-sans text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>
          Auto-progression
        </p>
        <div className="flex gap-2">
          {[
            { v: 'off', l: 'Off' },
            { v: 'linear', l: 'Linear' },
            { v: 'double', l: 'Double' },
          ].map((m) => (
            <button
              type="button"
              key={m.v}
              onClick={() => setProgression(m.v)}
              aria-pressed={progression === m.v}
              className="flex-1 rounded-lg py-2 font-sans text-xs font-medium"
              style={{
                background: progression === m.v ? 'var(--color-gold)' : 'var(--color-ivory)',
                color: progression === m.v ? 'var(--color-obsidian)' : 'var(--color-text-secondary)',
              }}
            >
              {m.l}
            </button>
          ))}
        </div>
        <p className="mt-1.5 font-sans text-[11px]" style={{ color: 'var(--color-ash)' }}>
          {progression === 'off'
            ? 'Targets stay put.'
            : progression === 'linear'
            ? `Complete every set → ${step} next time; miss ${missWord} in a row → deload 10%.`
            : `Complete every set → ${step} next time; otherwise hold and build reps.`}
          {progression !== 'off' && ownSteps.length > 0 && (
            <> Own step: {ownSteps.map((e) => `${e.name} ${stepLabel(e.weightStep, unit)}`).join(', ')}.</>
          )}
        </p>
      </div>

      {exercises.length > 0 && (
        <div className="mt-4 flex items-center gap-2">
          <span className="flex items-center gap-1 font-sans text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>
            <Shuffle size={13} /> Shuffle
          </span>
          {['light', 'medium', 'full'].map((lvl) => (
            <button
              type="button"
              key={lvl}
              onClick={() => shuffleBuilder(lvl)}
              className="rounded-full px-3 py-1 font-sans text-xs font-medium capitalize"
              style={{ background: 'var(--color-ivory)', color: 'var(--color-text-primary)' }}
            >
              {lvl}
            </button>
          ))}
        </div>
      )}

      <div className="mt-3 max-h-64 overflow-y-auto">
        {exercises.map((ex, i) => (
          <div key={ex.id} className="mb-2 rounded-xl px-3 py-2.5" style={{ background: 'var(--color-ivory)' }}>
            <div className="flex items-center justify-between">
              <span className="truncate font-sans text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
                {ex.name}
              </span>
              <div className="ml-2 flex shrink-0 items-center gap-1.5">
                <button type="button" onClick={() => fillFromLast(ex)} aria-label={`Fill ${ex.name} from last session`} title="Fill from last session">
                  <History size={14} style={{ color: 'var(--color-ash)' }} />
                </button>
                <button type="button" onClick={() => togglePin(ex.id)} aria-label={ex.pinned ? 'Unpin (allow shuffle)' : 'Pin (keep on shuffle)'}>
                  <Pin size={14} fill={ex.pinned ? 'var(--color-gold)' : 'none'} style={{ color: ex.pinned ? 'var(--color-gold)' : 'var(--color-ash)' }} />
                </button>
                <div className="flex flex-col">
                  <button type="button" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Move up" style={{ opacity: i === 0 ? 0.25 : 1 }}>
                    <ChevronUp size={15} style={{ color: 'var(--color-ash)' }} />
                  </button>
                  <button type="button" onClick={() => move(i, 1)} disabled={i === exercises.length - 1} aria-label="Move down" style={{ opacity: i === exercises.length - 1 ? 0.25 : 1 }}>
                    <ChevronDown size={15} style={{ color: 'var(--color-ash)' }} />
                  </button>
                </div>
                <button type="button" onClick={() => startSwap(ex.id)} aria-label="Swap exercise">
                  <Repeat size={14} style={{ color: 'var(--color-ash)' }} />
                </button>
                <button type="button" onClick={() => removeExercise(ex.id)} aria-label="Remove">
                  <X size={15} style={{ color: 'var(--color-ash)' }} />
                </button>
              </div>
            </div>
            <div className="mt-2 flex items-center gap-1.5">
              <input value={ex.targetSets} onChange={(e) => setField(ex.id, 'targetSets', e.target.value)}
                placeholder="sets" type="number" inputMode="numeric" aria-label={`${ex.name} sets`}
                className="w-12 rounded-lg px-1 py-1.5 text-center font-mono text-xs outline-none" style={targetInput} />
              <span className="font-sans text-xs" style={{ color: 'var(--color-ash)' }}>×</span>
              <input value={ex.targetReps} onChange={(e) => setField(ex.id, 'targetReps', e.target.value)}
                placeholder="reps" type="number" inputMode="numeric" aria-label={`${ex.name} reps`}
                className="w-12 rounded-lg px-1 py-1.5 text-center font-mono text-xs outline-none" style={targetInput} />
              <span className="font-sans text-xs" style={{ color: 'var(--color-ash)' }}>@</span>
              <input value={ex.targetWeight} onChange={(e) => setField(ex.id, 'targetWeight', e.target.value)}
                placeholder={unitLabel(unit)} type="number" inputMode="decimal" aria-label={`${ex.name} weight (${unitLabel(unit)})`}
                className="w-16 rounded-lg px-1 py-1.5 text-center font-mono text-xs outline-none" style={targetInput} />
              <Timer size={13} className="ml-1 shrink-0" style={{ color: 'var(--color-ash)' }} aria-hidden />
              <input value={ex.targetRest} onChange={(e) => setField(ex.id, 'targetRest', e.target.value)}
                placeholder="rest" type="number" inputMode="numeric" aria-label={`${ex.name} rest (seconds)`}
                className="w-14 rounded-lg px-1 py-1.5 text-center font-mono text-xs outline-none" style={targetInput} />
              <span className="font-sans text-xs" style={{ color: 'var(--color-ash)' }} aria-hidden>s</span>
            </div>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={() => setPickerOpen(true)}
        className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl py-3 font-sans text-sm font-medium"
        style={{ border: '1px dashed var(--color-ash)', color: 'var(--color-text-secondary)' }}
      >
        <Plus size={15} /> Add exercise
      </button>

      <button
        type="button"
        onClick={handleSave}
        disabled={!canSave}
        className="mt-4 w-full rounded-xl py-3 font-sans text-sm font-semibold"
        style={{ background: 'var(--color-gold)', color: 'var(--color-obsidian)', opacity: canSave ? 1 : 0.35 }}
      >
        {saving ? 'Saving…' : editing ? 'Save changes' : 'Create routine'}
      </button>

      <ExercisePicker
        isOpen={pickerOpen}
        onClose={() => { setPickerOpen(false); setSwapId(null); }}
        onSelect={swapId ? swapExercise : addExercise}
        alreadyAdded={exercises.map((e) => e.id)}
        multi={!swapId}
      />
    </Modal>
  );
}

// The stored (kg) target weight of an exercise in the routine being edited.
function editingWeight(editing, exerciseId) {
  return editing?.exercises?.find((e) => e.id === exerciseId)?.targetWeight ?? null;
}
