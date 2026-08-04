import { useState } from 'react';
import { db } from '../../db/db.js';

const MUSCLE_GROUPS = [
  'chest', 'triceps', 'biceps', 'front-deltoids', 'back-deltoids',
  'upper-back', 'lower-back', 'trapezius', 'abs', 'obliques',
  'quadriceps', 'hamstring', 'gluteal', 'calves', 'forearm',
];
const EQUIPMENT = ['barbell', 'dumbbell', 'bodyweight', 'cable', 'machine'];

const fieldStyle = {
  background: 'var(--color-ivory)',
  color: 'var(--color-text-primary)',
  borderRadius: 'var(--opus-radius-md)',
};

export default function ExerciseForm({ onSave, onCancel }) {
  const [form, setForm] = useState({ name: '', muscleGroup: 'chest', equipment: 'barbell' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  async function handleSave() {
    if (!form.name.trim()) { setError('Name is required.'); return; }
    setSaving(true);
    await db.exercises.add({
      name: form.name.trim(),
      muscleGroup: form.muscleGroup,
      equipment: form.equipment,
      secondaryMuscles: [],
      description: '',
      isCustom: true,
      wgerId: null,
    });
    onSave?.();
  }

  const canSave = form.name.trim() && !saving;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <label className="mb-1.5 block font-sans text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>
          Exercise name
        </label>
        <input
          autoFocus
          value={form.name}
          onChange={(e) => { set('name', e.target.value); setError(''); }}
          placeholder="e.g. Reverse Nordic Curl"
          className="w-full px-4 py-3 font-sans text-sm outline-none"
          style={fieldStyle}
        />
        {error && <p className="mt-1 font-sans text-xs" style={{ color: 'var(--color-ember)' }}>{error}</p>}
      </div>

      <div>
        <label className="mb-1.5 block font-sans text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>
          Muscle group
        </label>
        <select
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
        <label className="mb-1.5 block font-sans text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>
          Equipment
        </label>
        <select
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
          onClick={onCancel}
          className="flex-1 rounded-xl py-3 font-sans text-sm font-medium"
          style={{ background: 'var(--color-ivory)', color: 'var(--color-text-primary)' }}
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={!canSave}
          className="flex-1 rounded-xl py-3 font-sans text-sm font-medium"
          style={{
            background: 'var(--color-gold)',
            color: 'var(--color-obsidian)',
            opacity: canSave ? 1 : 0.4,
          }}
        >
          {saving ? 'Saving…' : 'Add Exercise'}
        </button>
      </div>
    </div>
  );
}
