import { useState } from 'react';
import { X, Plus } from 'lucide-react';
import Modal from '../ui/Modal.jsx';
import ExercisePicker from '../workout/ExercisePicker.jsx';
import { createTemplate, updateTemplate } from '../../utils/templateActions.js';
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
    targetSets: e.targetSets ?? '',
    targetReps: e.targetReps ?? '',
    targetWeight: e.targetWeight != null ? toDisplay(e.targetWeight, unit) : '',
  }));
}

export default function TemplateBuilder({ isOpen, onClose, editing = null }) {
  const unit = useSettingsStore((s) => s.unit);
  const [name, setName] = useState(editing?.name ?? '');
  const [day, setDay] = useState(editing?.dayOfWeek ?? null);
  const [color, setColor] = useState(editing?.color ?? null);
  const [exercises, setExercises] = useState(() => initExercises(editing, unit));
  const [pickerOpen, setPickerOpen] = useState(false);

  function addExercise(ex) {
    setExercises((prev) =>
      prev.some((e) => e.id === ex.id)
        ? prev
        : [...prev, { id: ex.id, name: ex.name, targetSets: '', targetReps: '', targetWeight: '' }]
    );
  }

  function setField(id, field, value) {
    setExercises((prev) => prev.map((e) => (e.id === id ? { ...e, [field]: value } : e)));
  }

  function removeExercise(id) {
    setExercises((prev) => prev.filter((e) => e.id !== id));
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

      <div className="mt-4 max-h-64 overflow-y-auto">
        {exercises.map((ex) => (
          <div key={ex.id} className="mb-2 rounded-xl px-3 py-2.5" style={{ background: 'var(--color-ivory)' }}>
            <div className="flex items-center justify-between">
              <span className="truncate font-sans text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
                {ex.name}
              </span>
              <button onClick={() => removeExercise(ex.id)} className="ml-2 flex-shrink-0" aria-label="Remove">
                <X size={15} style={{ color: 'var(--color-ash)' }} />
              </button>
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
        onClose={() => setPickerOpen(false)}
        onSelect={addExercise}
        alreadyAdded={exercises.map((e) => e.id)}
        multi
      />
    </Modal>
  );
}
