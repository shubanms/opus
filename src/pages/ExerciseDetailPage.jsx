import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Trophy, TrendingUp, PlayCircle, Trash2, Youtube, Star, StickyNote, Pencil, SearchX } from 'lucide-react';
import { useExercise, useExerciseNote } from '../hooks/useExercises.js';
import { usePRs, useExerciseVolume, useExerciseOneRepMax, useExerciseBestOneRepMax } from '../hooks/useProgress.js';
import { E1RM_MAX_REPS } from '../utils/oneRepMax.js';
import { friendlyDate } from '../utils/dateKey.js';
import { deleteCustomExercise, restoreCustomExercise, toggleFavorite, setExerciseColor } from '../utils/exerciseActions.js';
import { deleteWithUndo } from '../utils/undoable.js';
import { setExerciseNote } from '../utils/noteActions.js';
import { findDemoImage } from '../utils/exerciseDemo.js';
import { toDisplay, unitLabel } from '../utils/units.js';
import useSettingsStore from '../store/settingsStore.js';
import VolumeChart from '../components/charts/VolumeChart.jsx';
import TrendChart from '../components/charts/TrendChart.jsx';
import PRBadge from '../components/progress/PRBadge.jsx';
import ColorPicker from '../components/ui/ColorPicker.jsx';
import Modal from '../components/ui/Modal.jsx';
import ExerciseForm from '../components/exercise/ExerciseForm.jsx';
import ExerciseHistory from '../components/exercise/ExerciseHistory.jsx';
import BackButton from '../components/layout/BackButton.jsx';

const DIFFICULTY_COLOR = {
  beginner:     '#4FD8C4',
  intermediate: '#8B7DFF',
  advanced:     '#FF8FA3',
};

function PRCard({ prs, unit }) {
  const weight = prs.find((p) => p.type === 'weight');
  const reps = prs.find((p) => p.type === 'reps');
  const volume = prs.find((p) => p.type === 'volume');
  const u = unitLabel(unit);

  if (!weight && !reps && !volume) {
    return (
      <div className="glass rounded-2xl p-4 text-center" style={{ background: 'var(--color-ivory)' }}>
        <p className="font-sans text-sm" style={{ color: 'var(--color-text-secondary)' }}>
          No records yet. Log a set to start tracking.
        </p>
      </div>
    );
  }

  return (
    <div className="glass rounded-2xl p-4" style={{ background: 'var(--color-ivory)' }}>
      <div className="mb-3 flex items-center gap-2">
        <Trophy size={15} style={{ color: 'var(--color-gold)' }} />
        <span className="font-sans text-xs font-medium uppercase tracking-widest" style={{ color: 'var(--color-text-secondary)' }}>
          Personal Records
        </span>
      </div>
      <div className="flex flex-col gap-2">
        {weight && <PRBadge label="Best weight" value={toDisplay(weight.value, unit)} unit={u} />}
        {reps && <PRBadge label="Best reps" value={reps.value} unit="reps" />}
        {volume && <PRBadge label="Best volume" value={toDisplay(volume.value, unit)} unit={u} />}
      </div>
    </div>
  );
}

export default function ExerciseDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const exerciseId = Number(id);
  // undefined while loading; null when there's no such exercise (deleted, or
  // a stale link — Android's back button after deleting lands here).
  const exercise = useExercise(exerciseId);
  const prs = usePRs(exerciseId);
  const volumeRaw = useExerciseVolume(exerciseId);
  const e1rmRaw = useExerciseOneRepMax(exerciseId);
  const note = useExerciseNote(exerciseId);
  const unit = useSettingsStore((s) => s.unit);
  const volume = volumeRaw.map((d) => ({ label: d.label, volume: Math.round(toDisplay(d.volume, unit)) }));
  const e1rm = e1rmRaw.map((d) => ({ label: d.label, value: Math.round(toDisplay(d.value, unit)) }));
  // All-time, not "the best of the last ten sessions" the chart happens to show
  // — an old peak should not quietly disappear once it scrolls off the chart.
  const bestE1rmRow = useExerciseBestOneRepMax(exerciseId);
  const bestE1rm = bestE1rmRow?.value ?? (e1rmRaw.length ? Math.max(...e1rmRaw.map((d) => d.value)) : 0);
  const [demoUrl, setDemoUrl] = useState(null);
  const [editOpen, setEditOpen] = useState(false);

  // "How to do it" picture from wger — best effort, silent when it can't.
  useEffect(() => {
    setDemoUrl(null);
    if (!exercise?.name) return;
    const ctrl = new AbortController();
    findDemoImage(exercise.name, { signal: ctrl.signal }).then((url) => {
      if (!ctrl.signal.aborted && url) setDemoUrl(url);
    });
    return () => ctrl.abort();
  }, [exercise?.name]);

  // Leave via the list, not history: going "back" from a dead link usually
  // means going back to the page that deleted it.
  const toList = () => navigate('/exercises', { replace: true });

  if (exercise === undefined) {
    return (
      <div className="flex h-48 items-center justify-center">
        <p className="font-sans text-sm" style={{ color: 'var(--color-text-secondary)' }}>Loading…</p>
      </div>
    );
  }

  if (exercise === null) {
    return (
      <div className="px-5 pb-8 pt-6">
        <BackButton onClick={toList} className="mb-5" />
        <div className="glass mt-10 flex flex-col items-center rounded-2xl px-6 py-10 text-center" style={{ background: 'var(--color-ivory)' }}>
          <SearchX size={28} style={{ color: 'var(--color-ash)' }} />
          <h1 className="mt-3 font-display text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
            Exercise not found
          </h1>
          <p className="mt-2 font-sans text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            It may have been deleted. Your other exercises are all still there.
          </p>
          <button
            type="button"
            onClick={toList}
            className="mt-5 rounded-xl px-5 py-3 font-sans text-sm font-semibold"
            style={{ background: 'var(--color-gold)', color: 'var(--color-obsidian)' }}
          >
            Back to exercises
          </button>
        </div>
      </div>
    );
  }

  const diffColor = DIFFICULTY_COLOR[exercise.difficulty] ?? '#7B83A6';

  async function handleDelete() {
    const snapshot = await deleteWithUndo({
      label: exercise.name || 'Exercise',
      remove: () => deleteCustomExercise(exercise.id),
      restore: restoreCustomExercise,
      // Deleting from the detail page navigates away, so undoing has to bring
      // you back — otherwise the exercise returns and you are left staring at
      // a list wondering whether it worked.
      onUndo: () => navigate(`/exercises/${exercise.id}`),
    });
    if (snapshot) navigate('/exercises', { replace: true });
  }

  return (
    <div className="px-5 pb-8 pt-6">
      <BackButton fallback="/exercises" className="mb-5" />

      {/* Title + badges */}
      <div className="flex items-start justify-between gap-3">
        <h1 className="font-display text-4xl font-bold leading-none" style={{ color: 'var(--color-text-primary)' }}>
          {exercise.name}
        </h1>
        <div className="flex shrink-0 gap-2">
          {exercise.isCustom && (
            <button
              type="button"
              onClick={() => setEditOpen(true)}
              className="flex h-9 w-9 items-center justify-center rounded-full"
              style={{ background: 'var(--color-ivory)' }}
              aria-label={`Edit ${exercise.name}`}
            >
              <Pencil size={16} style={{ color: 'var(--color-ash)' }} />
            </button>
          )}
          <button
            type="button"
            onClick={() => toggleFavorite(exercise.id)}
            className="flex h-9 w-9 items-center justify-center rounded-full"
            style={{ background: 'var(--color-ivory)' }}
            aria-label="Toggle favorite"
            aria-pressed={Boolean(exercise.favorite)}
          >
            <Star size={18} fill={exercise.favorite ? 'var(--color-gold)' : 'none'} style={{ color: exercise.favorite ? 'var(--color-gold)' : 'var(--color-ash)' }} />
          </button>
        </div>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <p className="font-sans text-sm capitalize" style={{ color: 'var(--color-text-secondary)' }}>
          {(exercise.muscleGroup ?? '').replace(/-/g, ' ')} · {exercise.equipment}
        </p>
        {exercise.difficulty && (
          <span
            className="rounded-full px-2 py-0.5 font-sans text-xs capitalize"
            style={{ background: `${diffColor}22`, color: diffColor }}
          >
            {exercise.difficulty}
          </span>
        )}
        {exercise.isCustom && (
          <span className="rounded-full px-2 py-0.5 font-sans text-xs" style={{ background: 'var(--color-gold)', color: 'var(--color-obsidian)' }}>
            Custom
          </span>
        )}
      </div>

      {/* Session-by-session history — the first thing you came here for. */}
      <div className="mt-5">
        <ExerciseHistory exerciseId={exercise.id} unit={unit} />
      </div>

      {/* Marking + coaching note */}
      <div className="glass mt-4 rounded-2xl p-4" style={{ background: 'var(--color-ivory)' }}>
        <div className="mb-2 flex items-center gap-2">
          <StickyNote size={14} style={{ color: 'var(--color-ash)' }} />
          <span className="font-sans text-xs font-medium uppercase tracking-widest" style={{ color: 'var(--color-text-secondary)' }}>
            Coaching note
          </span>
        </div>
        <textarea
          key={note}
          defaultValue={note}
          onBlur={(e) => setExerciseNote(exercise.id, e.target.value)}
          placeholder="Cues you want every session — e.g. elbows tucked, brace, full ROM."
          aria-label="Coaching note"
          rows={2}
          className="w-full resize-none rounded-xl px-3 py-2 font-sans text-sm outline-none"
          style={{ background: 'var(--color-chalk)', color: 'var(--color-text-primary)' }}
        />
        <p className="mb-2 mt-3 font-sans text-xs font-medium uppercase tracking-widest" style={{ color: 'var(--color-text-secondary)' }}>
          Label colour
        </p>
        <ColorPicker value={exercise.color ?? null} onChange={(c) => setExerciseColor(exercise.id, c)} />
      </div>

      {/* How to do it — always available via video; image when Wger has one */}
      <div
        className="glass mt-5 overflow-hidden rounded-2xl"
        style={{ background: 'var(--color-chalk)', border: '1px solid var(--color-ivory)' }}
      >
        <div className="flex items-center gap-2 px-4 pt-4">
          <PlayCircle size={14} style={{ color: 'var(--color-ash)' }} />
          <span className="font-sans text-xs font-medium uppercase tracking-widest" style={{ color: 'var(--color-text-secondary)' }}>
            How to do it
          </span>
        </div>

        {demoUrl && (
          // wger's drawings are dark line art on transparent or white — they
          // need a light card under them to read in the dark theme too.
          <div className="anim-fade-in mx-4 mt-3 overflow-hidden rounded-xl" style={{ background: '#fff' }}>
            <img
              src={demoUrl}
              alt={`${exercise.name} demo`}
              onError={() => setDemoUrl(null)}
              className="w-full object-contain"
              style={{ maxHeight: 220 }}
            />
          </div>
        )}

        <a
          href={`https://www.youtube.com/results?search_query=${encodeURIComponent(`${exercise.name} proper form tutorial`)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="m-4 flex items-center justify-center gap-2 rounded-xl py-3 font-sans text-sm font-semibold"
          style={{ background: 'var(--color-obsidian)', color: 'var(--color-text-inverse)' }}
        >
          <Youtube size={16} style={{ color: '#FF4444' }} /> Watch how-to video
        </a>
      </div>

      {/* PRs */}
      <div className="mt-5">
        <PRCard prs={prs} unit={unit} />
      </div>

      {/* Estimated 1RM */}
      {e1rmRaw.length > 0 && (
        <div className="glass mt-4 rounded-2xl p-4" style={{ background: 'var(--color-ivory)' }}>
          <div className="mb-1 flex items-center gap-2">
            <TrendingUp size={15} style={{ color: 'var(--color-ash)' }} />
            <span className="font-sans text-xs font-medium uppercase tracking-widest" style={{ color: 'var(--color-text-secondary)' }}>
              Estimated 1RM
            </span>
          </div>
          <p className="mb-2 font-mono text-2xl font-semibold" style={{ color: 'var(--color-text-primary)' }}>
            {Math.round(toDisplay(bestE1rm, unit))} {unitLabel(unit)}
            <span className="ml-2 font-sans text-xs font-normal" style={{ color: 'var(--color-text-secondary)' }}>
              best{bestE1rmRow?.date ? ` · ${toDisplay(bestE1rmRow.weight, unit)}×${bestE1rmRow.reps} on ${friendlyDate(bestE1rmRow.date)}` : ''}
            </span>
          </p>
          <TrendChart data={e1rm} unit={unitLabel(unit)} empty="Log weighted sets to estimate." />
          <p className="mt-2 font-sans text-xs" style={{ color: 'var(--color-text-secondary)' }}>
            Epley estimate from your best set of 1–{E1RM_MAX_REPS} reps each session — higher-rep sets overstate it.
          </p>
        </div>
      )}

      {/* Volume history */}
      <div className="glass mt-4 rounded-2xl p-4" style={{ background: 'var(--color-ivory)' }}>
        <div className="mb-2 flex items-center gap-2">
          <TrendingUp size={15} style={{ color: 'var(--color-ash)' }} />
          <span className="font-sans text-xs font-medium uppercase tracking-widest" style={{ color: 'var(--color-text-secondary)' }}>
            Volume History
          </span>
        </div>
        <VolumeChart data={volume} unit={unitLabel(unit)} />
      </div>

      {exercise.isCustom && (
        <button
          type="button"
          onClick={handleDelete}
          className="glass mt-4 flex w-full items-center justify-center gap-2 rounded-2xl py-3 font-sans text-sm font-medium"
          style={{ background: 'var(--color-ivory)', color: 'var(--color-ember)' }}
        >
          <Trash2 size={15} /> Delete exercise
        </button>
      )}

      {exercise.isCustom && (
        <Modal isOpen={editOpen} onClose={() => setEditOpen(false)} title="Edit Exercise">
          <ExerciseForm exercise={exercise} onSave={() => setEditOpen(false)} onCancel={() => setEditOpen(false)} />
        </Modal>
      )}
    </div>
  );
}
