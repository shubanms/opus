import { useState } from 'react';
import { X, Plus } from 'lucide-react';
import Modal from '../ui/Modal.jsx';
import ExercisePicker from '../workout/ExercisePicker.jsx';
import { createTemplate, updateTemplate } from '../../utils/templateActions.js';

const DAYS = [
  { v: null, l: 'Any' }, { v: 1, l: 'Mon' }, { v: 2, l: 'Tue' }, { v: 3, l: 'Wed' },
  { v: 4, l: 'Thu' }, { v: 5, l: 'Fri' }, { v: 6, l: 'Sat' }, { v: 0, l: 'Sun' },
];

export default function TemplateBuilder({ isOpen, onClose, editing = null }) {
  const [name, setName] = useState(editing?.name ?? '');
  const [day, setDay] = useState(editing?.dayOfWeek ?? null);
  const [exercises, setExercises] = useState(editing?.exercises ?? []);
  const [pickerOpen, setPickerOpen] = useState(false);

  function addExercise(ex) {
    setExercises((prev) => (prev.some((e) => e.id === ex.id) ? prev : [...prev, ex]));
  }

  function removeExercise(id) {
    setExercises((prev) => prev.filter((e) => e.id !== id));
  }

  async function handleSave() {
    const payload = { name, dayOfWeek: day, exerciseIds: exercises.map((e) => e.id) };
    if (editing) await updateTemplate(editing.id, payload);
    else await createTemplate(payload);
    reset();
    onClose();
  }

  function reset() {
    setName('');
    setDay(null);
    setExercises([]);
    setPickerOpen(false);
  }

  const canSave = name.trim().length > 0 && exercises.length > 0;

  return (
    <Modal isOpen={isOpen} onClose={() => { reset(); onClose(); }} title={editing ? 'Edit Routine' : 'New Routine'}>
      {/* Name */}
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Routine name (e.g. Push Day)"
        className="w-full rounded-xl px-4 py-3 font-sans text-sm outline-none"
        style={{ background: 'var(--color-ivory)', color: 'var(--color-text-primary)' }}
      />

      {/* Day picker */}
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

      {/* Exercises */}
      <div className="mt-4 max-h-56 overflow-y-auto">
        {exercises.map((ex) => (
          <div
            key={ex.id}
            className="mb-1.5 flex items-center justify-between rounded-xl px-3 py-2.5"
            style={{ background: 'var(--color-ivory)' }}
          >
            <span className="truncate font-sans text-sm" style={{ color: 'var(--color-text-primary)' }}>
              {ex.name}
            </span>
            <button onClick={() => removeExercise(ex.id)} className="ml-2 flex-shrink-0" aria-label="Remove">
              <X size={15} style={{ color: 'var(--color-ash)' }} />
            </button>
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

      {/* Save */}
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
