import { useId, useMemo, useState } from 'react';
import { useExercises } from '../../hooks/useExercises.js';
import { createCustomExercise, updateCustomExercise, EQUIPMENT, ExerciseNameError } from '../../utils/exerciseEdit.js';
import { findNameClash } from '../../utils/exerciseSearch.js';
import { MUSCLE_GROUPS } from '../../utils/bodyMap.js';
import { playChime } from '../../utils/sound.js';
import { useHaptics } from '../../hooks/useHaptics.js';

const fieldStyle = {
  background: 'var(--color-ivory)',
  color: 'var(--color-text-primary)',
  borderRadius: 'var(--opus-radius-md)',
};

/**
 * Add a custom exercise, or — with `exercise` — edit one. A name that's
 * already in the library (any case, spacing or accent) is refused inline as
 * you type, and again on save in case the library changed meanwhile.
 */
export default function ExerciseForm({ exercise = null, onSave, onCancel }) {
  const editing = Boolean(exercise);
  const ids = useId();
  const all = useExercises();
  const haptic = useHaptics();
  const [form, setForm] = useState(() => ({
    name: exercise?.name ?? '',
    muscleGroup: exercise?.muscleGroup ?? 'chest',
    equipment: exercise?.equipment ?? 'barbell',
  }));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const clash = useMemo(() => findNameClash(all, form.name, exercise?.id ?? null), [all, form.name, exercise?.id]);
  const nameError = error || (clash ? `“${clash.name}” is already in your library.` : '');
  const unchanged = editing && form.name.trim() === exercise.name && form.muscleGroup === exercise.muscleGroup && form.equipment === exercise.equipment;

  async function handleSave() {
    if (!form.name.trim()) { setError('Name is required.'); return; }
    if (clash || saving) return;
    setSaving(true);
    try {
      if (editing) await updateCustomExercise(exercise.id, form);
      else await createCustomExercise(form);
      haptic('success');
      playChime('success');
      onSave?.();
    } catch (e) {
      if (e instanceof ExerciseNameError) setError(e.message);
      else {
        console.error('Save exercise failed:', e);
        setError('Could not save — try again.');
      }
      setSaving(false);
    }
  }

  const canSave = form.name.trim() && !clash && !saving && !unchanged;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <label htmlFor={`${ids}-name`} className="mb-1.5 block font-sans text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>
          Exercise name
        </label>
        <input
          id={`${ids}-name`}
          autoFocus={!editing}
          value={form.name}
          onChange={(e) => { set('name', e.target.value); setError(''); }}
          placeholder="e.g. Reverse Nordic Curl"
          aria-invalid={Boolean(nameError)}
          aria-describedby={nameError ? `${ids}-err` : undefined}
          className="w-full px-4 py-3 font-sans text-sm outline-none"
          style={{ ...fieldStyle, boxShadow: nameError ? 'inset 0 0 0 1px var(--color-ember)' : undefined }}
        />
        {nameError && <p id={`${ids}-err`} className="mt-1 font-sans text-xs" style={{ color: 'var(--color-ember)' }}>{nameError}</p>}
      </div>

      <div>
        <label htmlFor={`${ids}-muscle`} className="mb-1.5 block font-sans text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>
          Muscle group
        </label>
        <select
          id={`${ids}-muscle`}
          value={form.muscleGroup}
          onChange={(e) => set('muscleGroup', e.target.value)}
          className="w-full px-4 py-3 font-sans text-sm capitalize outline-none"
          style={fieldStyle}
        >
          {MUSCLE_GROUPS.map((m) => (
            <option key={m} value={m}>{m.replace(/-/g, ' ')}</option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor={`${ids}-equip`} className="mb-1.5 block font-sans text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>
          Equipment
        </label>
        <select
          id={`${ids}-equip`}
          value={form.equipment}
          onChange={(e) => set('equipment', e.target.value)}
          className="w-full px-4 py-3 font-sans text-sm capitalize outline-none"
          style={fieldStyle}
        >
          {EQUIPMENT.map((eq) => (
            <option key={eq} value={eq}>{eq}</option>
          ))}
        </select>
      </div>

      <div className="flex gap-3 pt-1">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 rounded-xl py-3 font-sans text-sm font-medium"
          style={{ background: 'var(--color-ivory)', color: 'var(--color-text-primary)' }}
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={!canSave}
          className="flex-1 rounded-xl py-3 font-sans text-sm font-medium"
          style={{
            background: 'var(--color-gold)',
            color: 'var(--color-obsidian)',
            opacity: canSave ? 1 : 0.4,
          }}
        >
          {saving ? 'Saving…' : editing ? 'Save changes' : 'Add Exercise'}
        </button>
      </div>
    </div>
  );
}
