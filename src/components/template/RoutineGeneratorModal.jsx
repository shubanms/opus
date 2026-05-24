import { useState } from 'react';
import { Sparkles } from 'lucide-react';
import Modal from '../ui/Modal.jsx';
import Particles from '../fx/Particles.jsx';
import { ALL_MUSCLES } from '../../hooks/useRecovery.js';
import { useExercises } from '../../hooks/useExercises.js';
import { useHaptics } from '../../hooks/useHaptics.js';
import { createTemplate } from '../../utils/templateActions.js';
import { makeRng, generateRoutine } from '../../utils/routineGenerator.js';
import { playChime } from '../../utils/sound.js';

const DAYS = [
  { v: null, l: 'Any' }, { v: 1, l: 'Mon' }, { v: 2, l: 'Tue' }, { v: 3, l: 'Wed' },
  { v: 4, l: 'Thu' }, { v: 5, l: 'Fri' }, { v: 6, l: 'Sat' }, { v: 0, l: 'Sun' },
];
const LABEL = {
  chest: 'Chest', triceps: 'Triceps', biceps: 'Biceps', 'front-deltoids': 'Front Delts',
  'back-deltoids': 'Rear Delts', 'upper-back': 'Upper Back', 'lower-back': 'Lower Back',
  trapezius: 'Traps', abs: 'Abs', obliques: 'Obliques', quadriceps: 'Quads',
  hamstring: 'Hamstrings', gluteal: 'Glutes', calves: 'Calves', forearm: 'Forearms',
};
const LEVELS = ['beginner', 'intermediate', 'advanced'];
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

export default function RoutineGeneratorModal({ isOpen, onClose }) {
  const allExercises = useExercises();
  const haptic = useHaptics();
  const [groups, setGroups] = useState([]);
  const [level, setLevel] = useState('beginner');
  const [day, setDay] = useState(null);
  const [name, setName] = useState('');
  const [nameEdited, setNameEdited] = useState(false);
  const [preview, setPreview] = useState(null);
  const [burst, setBurst] = useState(false);

  const exById = Object.fromEntries(allExercises.map((e) => [e.id, e]));
  const autoName = groups.length
    ? `${groups.slice(0, 2).map((g) => LABEL[g] ?? g).join(' & ')}${groups.length > 2 ? ' +' : ''} · ${cap(level)}`
    : '';

  function reset() {
    setGroups([]); setLevel('beginner'); setDay(null); setName(''); setNameEdited(false); setPreview(null);
  }
  function close() { reset(); onClose(); }

  function toggleGroup(g) {
    setGroups((prev) => (prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g]));
    setPreview(null);
  }

  function handleGenerate() {
    if (!groups.length) return;
    const slots = generateRoutine({ exercises: allExercises, groups, level, rng: makeRng(Date.now()) });
    setPreview(slots);
    if (!nameEdited) setName(autoName);
    haptic('success');
    playChime('start');
    setBurst(true);
    setTimeout(() => setBurst(false), 1200);
  }

  async function handleSave() {
    if (!preview?.length) return;
    await createTemplate({ name: (name || autoName || 'Routine').trim(), dayOfWeek: day, exercises: preview });
    close();
  }

  return (
    <Modal isOpen={isOpen} onClose={close} title="Auto-generate routine">
      {burst && <Particles count={16} />}

      <p className="mb-2 font-sans text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--color-text-secondary)' }}>
        Target muscles
      </p>
      <div className="flex flex-wrap gap-2">
        {ALL_MUSCLES.map((g) => {
          const on = groups.includes(g);
          return (
            <button
              key={g}
              onClick={() => toggleGroup(g)}
              className="rounded-full px-3 py-1.5 font-sans text-xs font-medium"
              style={{ background: on ? 'var(--color-gold)' : 'var(--color-ivory)', color: on ? 'var(--color-obsidian)' : 'var(--color-text-secondary)' }}
            >
              {LABEL[g] ?? g}
            </button>
          );
        })}
      </div>

      <p className="mb-2 mt-4 font-sans text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--color-text-secondary)' }}>
        Experience
      </p>
      <div className="flex gap-1 rounded-xl p-1" style={{ background: 'var(--color-ivory)' }}>
        {LEVELS.map((l) => (
          <button
            key={l}
            onClick={() => { setLevel(l); setPreview(null); if (!nameEdited) setName(''); }}
            className="flex-1 rounded-lg py-2 font-sans text-xs font-medium capitalize"
            style={{ background: level === l ? 'var(--color-chalk)' : 'transparent', color: level === l ? 'var(--color-text-primary)' : 'var(--color-text-secondary)' }}
          >
            {l}
          </button>
        ))}
      </div>

      <button
        onClick={handleGenerate}
        disabled={!groups.length}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl py-3 font-sans text-sm font-semibold"
        style={{ background: 'var(--color-gold)', color: 'var(--color-obsidian)', opacity: groups.length ? 1 : 0.35 }}
      >
        <Sparkles size={16} /> {preview ? 'Re-generate' : 'Generate'}
      </button>

      {preview && (
        <div className="mt-4">
          <input
            value={name || autoName}
            onChange={(e) => { setName(e.target.value); setNameEdited(true); }}
            placeholder="Routine name"
            className="mb-3 w-full rounded-xl px-4 py-3 font-sans text-sm outline-none"
            style={{ background: 'var(--color-ivory)', color: 'var(--color-text-primary)' }}
          />

          <div className="mb-3 flex flex-wrap gap-2">
            {DAYS.map((d) => (
              <button
                key={d.l}
                onClick={() => setDay(d.v)}
                className="rounded-full px-3 py-1.5 font-sans text-xs font-medium"
                style={{ background: day === d.v ? 'var(--color-gold)' : 'var(--color-ivory)', color: day === d.v ? 'var(--color-obsidian)' : 'var(--color-text-secondary)' }}
              >
                {d.l}
              </button>
            ))}
          </div>

          {preview.length === 0 ? (
            <p className="font-sans text-sm" style={{ color: 'var(--color-text-secondary)' }}>No exercises found for that selection.</p>
          ) : (
            <div className="flex flex-col gap-1.5">
              {preview.map((s) => {
                const ex = exById[s.exerciseId];
                return (
                  <div key={s.exerciseId} className="flex items-center justify-between rounded-lg px-3 py-2" style={{ background: 'var(--color-ivory)' }}>
                    <span className="truncate font-sans text-sm" style={{ color: 'var(--color-text-primary)' }}>{ex?.name ?? 'Exercise'}</span>
                    <span className="ml-2 flex-shrink-0 font-mono text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                      {s.targetSets}×{s.targetReps}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          <button
            onClick={handleSave}
            disabled={!preview.length}
            className="mt-4 w-full rounded-xl py-3 font-sans text-sm font-semibold"
            style={{ background: 'var(--color-obsidian)', color: 'var(--color-text-inverse)', opacity: preview.length ? 1 : 0.35 }}
          >
            Save routine
          </button>
          <p className="mt-2 text-center font-sans text-xs" style={{ color: 'var(--color-text-secondary)' }}>
            You can fine-tune or shuffle it afterwards.
          </p>
        </div>
      )}
    </Modal>
  );
}
