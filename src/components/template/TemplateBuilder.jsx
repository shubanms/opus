import { useState, useEffect } from 'react';
import { X, Plus, ChevronUp, ChevronDown, Shuffle, Pin, Repeat } from 'lucide-react';
import Modal from '../ui/Modal.jsx';
import ExercisePicker from '../workout/ExercisePicker.jsx';
import { createTemplate, updateTemplate } from '../../utils/templateActions.js';
import { moveItem } from '../../utils/reorder.js';
import { reshuffleRoutine, makeRng } from '../../utils/routineGenerator.js';
import { useExercises } from '../../hooks/useExercises.js';
import { playChime } from '../../utils/sound.js';
import useSettingsStore from '../../store/settingsStore.js';
import { toDisplay, toKg, unitLabel } from '../../utils/units.js';
import ColorPicker from '../ui/ColorPicker.jsx';

const DAYS = [
  { v: null, l: 'Any' }, { v: 1, l: 'Mon' }, { v: 2, l: 'Tue' }, { v: 3, l: 'Wed' },
  { v: 4, l: 'Thu' }, { v: 5, l: 'Fri' }, { v: 6, l: 'Sat' }, { v: 0, l: 'Sun' },
];

function initExercises(editing, unit) {
  return (editing?.exercises ?? []).map((e) => ({
    id: e.id,
    name: e.name,
    muscleGroup: e.muscleGroup,
    difficulty: e.difficulty,
    pinned: false,
    targetSets: e.targetSets ?? '',
    targetReps: e.targetReps ?? '',
    targetWeight: e.targetWeight != null ? toDisplay(e.targetWeight, unit) : '',
  }));
}

export default function TemplateBuilder({ isOpen, onClose, editing = null }) {
  const unit = useSettingsStore((s) => s.unit);
  const allExercises = useExercises();
  const [name, setName] = useState(editing?.name ?? '');
  const [day, setDay] = useState(editing?.dayOfWeek ?? null);
  const [color, setColor] = useState(editing?.color ?? null);
  const [progression, setProgression] = useState(editing?.progression?.mode ?? 'off');
  const [exercises, setExercises] = useState(() => initExercises(editing, unit));
  const [pickerOpen, setPickerOpen] = useState(false);
  const [swapId, setSwapId] = useState(null); // exercise being replaced, or null

  // The builder stays mounted (only the Modal toggles), so re-sync local state
  // from `editing` every time it opens — otherwise editing an existing routine
  // shows an empty "create from scratch" form.
  useEffect(() => {
    if (!isOpen) return;
    setName(editing?.name ?? '');
    setDay(editing?.dayOfWeek ?? null);
    setColor(editing?.color ?? null);
    setProgression(editing?.progression?.mode ?? 'off');
    setExercises(initExercises(editing, unit));
    setPickerOpen(false);
    setSwapId(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, editing]);

  function addExercise(ex) {
    setExercises((prev) =>
      prev.some((e) => e.id === ex.id)
        ? prev
        : [...prev, { id: ex.id, name: ex.name, muscleGroup: ex.muscleGroup, difficulty: ex.difficulty, pinned: false, targetSets: '', targetReps: '', targetWeight: '' }]
    );
  }

  function togglePin(id) {
    setExercises((prev) => prev.map((e) => (e.id === id ? { ...e, pinned: !e.pinned } : e)));
  }

  // Replace one exercise with another, keeping its targets/pin/position.
  function swapExercise(ex) {
    setExercises((prev) => {
      if (prev.some((e) => e.id === ex.id && e.id !== swapId)) return prev; // no duplicates
      return prev.map((e) => (e.id === swapId ? { ...e, id: ex.id, name: ex.name, muscleGroup: ex.muscleGroup, difficulty: ex.difficulty } : e));
    });
  }
  function startSwap(id) { setSwapId(id); setPickerOpen(true); }

  function shuffleBuilder(intensity) {
    const slots = exercises.map((e) => ({
      exerciseId: e.id, muscleGroup: e.muscleGroup, difficulty: e.difficulty,
      targetSets: e.targetSets, targetReps: e.targetReps, targetWeight: e.targetWeight,
    }));
    const pinnedIds = exercises.filter((e) => e.pinned).map((e) => e.id);
    const next = reshuffleRoutine({ slots, intensity, pinnedIds, pool: allExercises, rng: makeRng(Date.now()) });
    const byId = Object.fromEntries(allExercises.map((x) => [x.id, x]));
    setExercises((prev) => next.map((s, i) => {
      const old = prev[i];
      if (s.exerciseId === old.id) return old;
      const ex = byId[s.exerciseId];
      return { id: s.exerciseId, name: ex?.name ?? old.name, muscleGroup: s.muscleGroup, difficulty: s.difficulty, pinned: old.pinned, targetSets: old.targetSets, targetReps: old.targetReps, targetWeight: old.targetWeight };
    }));
    playChime('start');
  }

  function setField(id, field, value) {
    setExercises((prev) => prev.map((e) => (e.id === id ? { ...e, [field]: value } : e)));
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
    const payload = {
      name,
      dayOfWeek: day,
      color,
      progression: progression === 'off' ? { mode: 'off' } : { mode: progression, weightStep: 2.5, deloadAfterMisses: 2 },
      exercises: exercises.map((e) => ({
        exerciseId: e.id,
        targetSets: e.targetSets === '' ? null : Number(e.targetSets),
        targetReps: e.targetReps === '' ? null : Number(e.targetReps),
        targetWeight: e.targetWeight === '' ? null : toKg(Number(e.targetWeight), unit),
      })),
    };
    if (editing) await updateTemplate(editing.id, payload);
    else await createTemplate(payload);
    reset();
    onClose();
  }

  const canSave = name.trim().length > 0 && exercises.length > 0;
  const targetInput = {
    background: 'var(--color-chalk)',
    color: 'var(--color-text-primary)',
  };

  return (
    <Modal isOpen={isOpen} onClose={() => { reset(); onClose(); }} title={editing ? 'Edit Routine' : 'New Routine'}>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Routine name (e.g. Push Day)"
        className="w-full rounded-xl px-4 py-3 font-sans text-sm outline-none"
        style={{ background: 'var(--color-ivory)', color: 'var(--color-text-primary)' }}
      />

      <div className="mt-3 flex flex-wrap gap-2">
        {DAYS.map((d) => (
          <button
            key={d.l}
            onClick={() => setDay(d.v)}
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
              key={m.v}
              onClick={() => setProgression(m.v)}
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
            ? 'Hit every set → +2.5kg next time; miss twice → auto-deload 10%.'
            : 'Hit target reps on every set → +2.5kg; otherwise hold and build reps.'}
        </p>
      </div>

      {exercises.length > 0 && (
        <div className="mt-4 flex items-center gap-2">
          <span className="flex items-center gap-1 font-sans text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>
            <Shuffle size={13} /> Shuffle
          </span>
          {['light', 'medium', 'full'].map((lvl) => (
            <button
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
              <div className="ml-2 flex flex-shrink-0 items-center gap-1.5">
                <button onClick={() => togglePin(ex.id)} aria-label={ex.pinned ? 'Unpin (allow shuffle)' : 'Pin (keep on shuffle)'}>
                  <Pin size={14} fill={ex.pinned ? 'var(--color-gold)' : 'none'} style={{ color: ex.pinned ? 'var(--color-gold)' : 'var(--color-ash)' }} />
                </button>
                <div className="flex flex-col">
                  <button onClick={() => move(i, -1)} disabled={i === 0} aria-label="Move up" style={{ opacity: i === 0 ? 0.25 : 1 }}>
                    <ChevronUp size={15} style={{ color: 'var(--color-ash)' }} />
                  </button>
                  <button onClick={() => move(i, 1)} disabled={i === exercises.length - 1} aria-label="Move down" style={{ opacity: i === exercises.length - 1 ? 0.25 : 1 }}>
                    <ChevronDown size={15} style={{ color: 'var(--color-ash)' }} />
                  </button>
                </div>
                <button onClick={() => startSwap(ex.id)} aria-label="Swap exercise">
                  <Repeat size={14} style={{ color: 'var(--color-ash)' }} />
                </button>
                <button onClick={() => removeExercise(ex.id)} aria-label="Remove">
                  <X size={15} style={{ color: 'var(--color-ash)' }} />
                </button>
              </div>
            </div>
            <div className="mt-2 flex items-center gap-2">
              <input value={ex.targetSets} onChange={(e) => setField(ex.id, 'targetSets', e.target.value)}
                placeholder="sets" type="number" inputMode="numeric"
                className="w-14 rounded-lg px-2 py-1.5 text-center font-mono text-xs outline-none" style={targetInput} />
              <span className="font-sans text-xs" style={{ color: 'var(--color-ash)' }}>×</span>
              <input value={ex.targetReps} onChange={(e) => setField(ex.id, 'targetReps', e.target.value)}
                placeholder="reps" type="number" inputMode="numeric"
                className="w-14 rounded-lg px-2 py-1.5 text-center font-mono text-xs outline-none" style={targetInput} />
              <span className="font-sans text-xs" style={{ color: 'var(--color-ash)' }}>@</span>
              <input value={ex.targetWeight} onChange={(e) => setField(ex.id, 'targetWeight', e.target.value)}
                placeholder={unitLabel(unit)} type="number" inputMode="decimal"
                className="w-16 rounded-lg px-2 py-1.5 text-center font-mono text-xs outline-none" style={targetInput} />
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={() => setPickerOpen(true)}
        className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl py-3 font-sans text-sm font-medium"
        style={{ border: '1px dashed var(--color-ash)', color: 'var(--color-text-secondary)' }}
      >
        <Plus size={15} /> Add exercise
      </button>

      <button
        onClick={handleSave}
        disabled={!canSave}
        className="mt-4 w-full rounded-xl py-3 font-sans text-sm font-semibold"
        style={{ background: 'var(--color-gold)', color: 'var(--color-obsidian)', opacity: canSave ? 1 : 0.35 }}
      >
        {editing ? 'Save changes' : 'Create routine'}
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
