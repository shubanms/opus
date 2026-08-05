import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Trophy, TrendingUp, PlayCircle, Trash2, Youtube, Star, StickyNote } from 'lucide-react';
import { useExercise, useExerciseNote } from '../hooks/useExercises.js';
import { usePRs, useExerciseVolume, useExerciseOneRepMax } from '../hooks/useProgress.js';
import { deleteCustomExercise, toggleFavorite, setExerciseColor } from '../utils/exerciseActions.js';
import { setExerciseNote } from '../utils/noteActions.js';
import { toDisplay, unitLabel } from '../utils/units.js';
import { playChime } from '../utils/sound.js';
import useSettingsStore from '../store/settingsStore.js';
import useUIStore from '../store/uiStore.js';
import VolumeChart from '../components/charts/VolumeChart.jsx';
import TrendChart from '../components/charts/TrendChart.jsx';
import PRBadge from '../components/progress/PRBadge.jsx';
import ColorPicker from '../components/ui/ColorPicker.jsx';

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
  const exercise = useExercise(Number(id));
  const prs = usePRs(Number(id));
  const volumeRaw = useExerciseVolume(Number(id));
  const e1rmRaw = useExerciseOneRepMax(Number(id));
  const note = useExerciseNote(Number(id));
  const unit = useSettingsStore((s) => s.unit);
  const volume = volumeRaw.map((d) => ({ label: d.label, volume: Math.round(toDisplay(d.volume, unit)) }));
  const e1rm = e1rmRaw.map((d) => ({ label: d.label, value: Math.round(toDisplay(d.value, unit)) }));
  const bestE1rm = e1rmRaw.length ? Math.max(...e1rmRaw.map((d) => d.value)) : 0;
  const [demoUrl, setDemoUrl] = useState(null);

  useEffect(() => {
    if (!exercise?.name) return;
    const ctrl = new AbortController();
    const abs = (u) => (u?.startsWith('/') ? `https://wger.de${u}` : u);

    async function loadDemo() {
      try {
        const term = exercise.name.replace(/[^a-zA-Z0-9 ]/g, '').trim();
        const res = await fetch(
          `https://wger.de/api/v2/exercise/search/?term=${encodeURIComponent(term)}&language=english&format=json`,
          { signal: ctrl.signal }
        );
        const data = await res.json();
        const top = data.suggestions?.[0]?.data;
        if (!top) return;

        // Search result image is a relative media path — make it absolute.
        if (top.image) {
          setDemoUrl(abs(top.image));
          return;
        }
        // Fallback: look up the exercise's images by base id.
        if (top.base_id) {
          const r2 = await fetch(
            `https://wger.de/api/v2/exerciseimage/?exercise_base=${top.base_id}&format=json`,
            { signal: ctrl.signal }
          );
          const d2 = await r2.json();
          const main = d2.results?.find((x) => x.is_main) ?? d2.results?.[0];
          if (main?.image) setDemoUrl(abs(main.image));
        }
      } catch {
        /* offline or not found — fall back to hiding the demo */
      }
    }

    setDemoUrl(null);
    loadDemo();
    return () => ctrl.abort();
  }, [exercise?.name]);

  if (!exercise) {
    return (
      <div className="flex h-48 items-center justify-center">
        <p className="font-sans text-sm" style={{ color: 'var(--color-text-secondary)' }}>Loading…</p>
      </div>
    );
  }

  const diffColor = DIFFICULTY_COLOR[exercise.difficulty] ?? '#7B83A6';

  async function handleDelete() {
    const ok = await useUIStore.getState().confirm({
      title: 'Delete exercise?',
      message: `"${exercise.name}" and all its logged history will be removed. This can't be undone.`,
      confirmLabel: 'Delete',
      danger: true,
    });
    if (ok) {
      playChime('delete');
      await deleteCustomExercise(exercise.id);
      navigate('/exercises');
    }
  }

  return (
    <div className="px-5 pb-8 pt-6">
      <button onClick={() => navigate(-1)} className="mb-5 flex items-center gap-2">
        <ArrowLeft size={18} style={{ color: 'var(--color-text-secondary)' }} />
        <span className="font-sans text-sm" style={{ color: 'var(--color-text-secondary)' }}>Back</span>
      </button>

      {/* Title + badges */}
      <div className="flex items-start justify-between gap-3">
        <h1 className="font-display text-4xl font-bold leading-none" style={{ color: 'var(--color-text-primary)' }}>
          {exercise.name}
        </h1>
        <button
          onClick={() => toggleFavorite(exercise.id)}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
          style={{ background: 'var(--color-ivory)' }}
          aria-label="Toggle favorite"
        >
          <Star size={18} fill={exercise.favorite ? 'var(--color-gold)' : 'none'} style={{ color: exercise.favorite ? 'var(--color-gold)' : 'var(--color-ash)' }} />
        </button>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <p className="font-sans text-sm capitalize" style={{ color: 'var(--color-text-secondary)' }}>
          {exercise.muscleGroup.replace(/-/g, ' ')} · {exercise.equipment}
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

      {/* Marking + coaching note */}
      <div className="glass mt-5 rounded-2xl p-4" style={{ background: 'var(--color-ivory)' }}>
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
          <img
            src={demoUrl}
            alt={`${exercise.name} demo`}
            onError={() => setDemoUrl(null)}
            className="mt-3 w-full object-contain"
            style={{ maxHeight: 220, background: 'var(--color-chalk)' }}
          />
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
            <span className="ml-2 font-sans text-xs font-normal" style={{ color: 'var(--color-text-secondary)' }}>best</span>
          </p>
          <TrendChart data={e1rm} unit={unitLabel(unit)} empty="Log weighted sets to estimate." />
          <p className="mt-2 font-sans text-xs" style={{ color: 'var(--color-text-secondary)' }}>
            Epley estimate from your heaviest set each session.
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
          onClick={handleDelete}
          className="glass mt-4 flex w-full items-center justify-center gap-2 rounded-2xl py-3 font-sans text-sm font-medium"
          style={{ background: 'var(--color-ivory)', color: 'var(--color-ember)' }}
        >
          <Trash2 size={15} /> Delete exercise
        </button>
      )}
    </div>
  );
}
