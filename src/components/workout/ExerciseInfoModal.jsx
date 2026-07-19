import { StickyNote, PlayCircle, Youtube, Trophy } from 'lucide-react';
import Modal from '../ui/Modal.jsx';
import ColorPicker from '../ui/ColorPicker.jsx';
import { useExercise, useExerciseNote } from '../../hooks/useExercises.js';
import { usePRs } from '../../hooks/useProgress.js';
import { setExerciseNote } from '../../utils/noteActions.js';
import { setExerciseColor } from '../../utils/exerciseActions.js';
import useSettingsStore from '../../store/settingsStore.js';
import { toDisplay, unitLabel } from '../../utils/units.js';

// Quick exercise reference you can open mid-workout — coaching note, label
// colour, PRs to chase, and a how-to video — without leaving the session.
export default function ExerciseInfoModal({ exerciseId, isOpen, onClose }) {
  const exercise = useExercise(exerciseId);
  const note = useExerciseNote(exerciseId);
  const prs = usePRs(exerciseId);
  const unit = useSettingsStore((s) => s.unit);
  if (!isOpen || !exercise) return null;

  const weightPR = prs.find((p) => p.type === 'weight');
  const repsPR = prs.find((p) => p.type === 'reps');

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={exercise.name}>
      <p className="-mt-1 mb-4 font-sans text-sm capitalize" style={{ color: 'var(--color-text-secondary)' }}>
        {(exercise.muscleGroup ?? '').replace(/-/g, ' ')}{exercise.equipment ? ` · ${exercise.equipment}` : ''}
      </p>

      {/* PRs to chase */}
      {(weightPR || repsPR) && (
        <div className="mb-4 flex items-center gap-2 rounded-xl px-3 py-2.5" style={{ background: 'var(--color-ivory)' }}>
          <Trophy size={14} style={{ color: 'var(--color-gold)' }} />
          <span className="font-mono text-sm font-semibold" style={{ color: 'var(--color-gold)' }}>
            {weightPR ? `${toDisplay(weightPR.value, unit)}${unitLabel(unit)}` : ''}
            {weightPR && repsPR ? ' · ' : ''}
            {repsPR ? `${repsPR.value} reps` : ''}
          </span>
          <span className="font-sans text-xs" style={{ color: 'var(--color-text-secondary)' }}>your best</span>
        </div>
      )}

      {/* Coaching note (editable) */}
      <div className="mb-4 rounded-2xl p-3" style={{ background: 'var(--color-ivory)' }}>
        <div className="mb-2 flex items-center gap-2">
          <StickyNote size={14} style={{ color: 'var(--color-ash)' }} />
          <span className="font-sans text-xs font-medium uppercase tracking-widest" style={{ color: 'var(--color-text-secondary)' }}>
            Coaching note
          </span>
        </div>
        <textarea
          key={note}
          defaultValue={note}
          onBlur={(e) => setExerciseNote(exerciseId, e.target.value)}
          placeholder="Cues you want every session — e.g. elbows tucked, brace, full ROM."
          rows={2}
          className="w-full resize-none rounded-xl px-3 py-2 font-sans text-sm outline-none"
          style={{ background: 'var(--color-chalk)', color: 'var(--color-text-primary)' }}
        />
        <p className="mb-2 mt-3 font-sans text-xs font-medium uppercase tracking-widest" style={{ color: 'var(--color-text-secondary)' }}>
          Label colour
        </p>
        <ColorPicker value={exercise.color ?? null} onChange={(c) => setExerciseColor(exercise.id, c)} />
      </div>

      {/* How to do it — YouTube search for a form tutorial */}
      <div className="rounded-2xl p-4" style={{ background: 'var(--color-chalk)', border: '1px solid var(--color-ivory)' }}>
        <div className="mb-3 flex items-center gap-2">
          <PlayCircle size={14} style={{ color: 'var(--color-ash)' }} />
          <span className="font-sans text-xs font-medium uppercase tracking-widest" style={{ color: 'var(--color-text-secondary)' }}>
            How to do it
          </span>
        </div>
        <a
          href={`https://www.youtube.com/results?search_query=${encodeURIComponent(`${exercise.name} proper form tutorial`)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 rounded-xl py-3 font-sans text-sm font-semibold"
          style={{ background: 'var(--color-obsidian)', color: 'var(--color-text-inverse)' }}
        >
          <Youtube size={16} style={{ color: '#FF4444' }} /> Watch how-to video
        </a>
      </div>
    </Modal>
  );
}
