import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Trophy, TrendingUp, PlayCircle, Trash2 } from 'lucide-react';
import { useExercise } from '../hooks/useExercises.js';
import { usePRs, useExerciseVolume } from '../hooks/useProgress.js';
import { deleteCustomExercise } from '../utils/exerciseActions.js';
import VolumeChart from '../components/progress/VolumeChart.jsx';
import PRBadge from '../components/progress/PRBadge.jsx';

const DIFFICULTY_COLOR = {
  beginner:     '#6B8F71',
  intermediate: '#C9A84C',
  advanced:     '#D4622A',
};

function PRCard({ prs }) {
  const weight = prs.find((p) => p.type === 'weight');
  const reps = prs.find((p) => p.type === 'reps');
  const volume = prs.find((p) => p.type === 'volume');

  if (!weight && !reps && !volume) {
    return (
      <div className="rounded-2xl p-4 text-center" style={{ background: 'var(--color-ivory)' }}>
        <p className="font-sans text-sm" style={{ color: 'var(--color-text-secondary)' }}>
          No records yet. Log a set to start tracking.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl p-4" style={{ background: 'var(--color-ivory)' }}>
      <div className="mb-3 flex items-center gap-2">
        <Trophy size={15} style={{ color: 'var(--color-gold)' }} />
        <span className="font-sans text-xs font-medium uppercase tracking-widest" style={{ color: 'var(--color-text-secondary)' }}>
          Personal Records
        </span>
      </div>
      <div className="flex flex-col gap-2">
        {weight && <PRBadge label="Best weight" value={weight.value} unit="kg" />}
        {reps && <PRBadge label="Best reps" value={reps.value} unit="reps" />}
        {volume && <PRBadge label="Best volume" value={volume.value} unit="kg" />}
      </div>
    </div>
  );
}

export default function ExerciseDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const exercise = useExercise(Number(id));
  const prs = usePRs(Number(id));
  const volume = useExerciseVolume(Number(id));
  const [demoUrl, setDemoUrl] = useState(null);

  useEffect(() => {
    if (!exercise?.name) return;
    const ctrl = new AbortController();
    const term = exercise.name.replace(/[^a-zA-Z0-9 ]/g, '').trim();
    fetch(
      `https://wger.de/api/v2/exercise/search/?term=${encodeURIComponent(term)}&language=english&format=json`,
      { signal: ctrl.signal }
    )
      .then(r => r.json())
      .then(data => {
        const img = data.suggestions?.[0]?.data?.image;
        if (img) setDemoUrl(img);
      })
      .catch(() => {});
    return () => ctrl.abort();
  }, [exercise?.name]);

  if (!exercise) {
    return (
      <div className="flex h-48 items-center justify-center">
        <p className="font-sans text-sm" style={{ color: 'var(--color-text-secondary)' }}>Loading…</p>
      </div>
    );
  }

  const diffColor = DIFFICULTY_COLOR[exercise.difficulty] ?? '#8A8780';

  async function handleDelete() {
    if (window.confirm(`Delete "${exercise.name}" and all its logged history? This can't be undone.`)) {
      await deleteCustomExercise(exercise.id);
      navigate('/exercises');
    }
  }

  return (
    <div className="anim-fade-slide-up px-5 pb-8 pt-6">
      <button onClick={() => navigate(-1)} className="mb-5 flex items-center gap-2">
        <ArrowLeft size={18} style={{ color: 'var(--color-text-secondary)' }} />
        <span className="font-sans text-sm" style={{ color: 'var(--color-text-secondary)' }}>Back</span>
      </button>

      {/* Title + badges */}
      <h1 className="font-display text-4xl font-bold leading-none" style={{ color: 'var(--color-text-primary)' }}>
        {exercise.name}
      </h1>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <p className="font-sans text-sm capitalize" style={{ color: 'var(--color-text-secondary)' }}>
          {exercise.muscleGroup.replace(/-/g, ' ')} · {exercise.equipment}
        </p>
        {exercise.difficulty && (
          <span
            className="rounded-full px-2 py-0.5 font-sans text-xs capitalize"
            style={{ background: diffColor + '22', color: diffColor }}
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

      {/* Demo image */}
      {demoUrl && (
        <div
          className="mt-5 overflow-hidden rounded-2xl"
          style={{ background: 'var(--color-chalk)', border: '1px solid var(--color-ivory)' }}
        >
          <div className="mb-2 flex items-center gap-2 px-4 pt-4">
            <PlayCircle size={14} style={{ color: 'var(--color-ash)' }} />
            <span className="font-sans text-xs font-medium uppercase tracking-widest" style={{ color: 'var(--color-text-secondary)' }}>
              How to do it
            </span>
          </div>
          <img
            src={demoUrl}
            alt={`${exercise.name} demo`}
            className="w-full object-contain"
            style={{ maxHeight: 220, background: 'var(--color-chalk)' }}
          />
        </div>
      )}

      {/* PRs */}
      <div className="mt-5">
        <PRCard prs={prs} />
      </div>

      {/* Volume history */}
      <div className="mt-4 rounded-2xl p-4" style={{ background: 'var(--color-ivory)' }}>
        <div className="mb-2 flex items-center gap-2">
          <TrendingUp size={15} style={{ color: 'var(--color-ash)' }} />
          <span className="font-sans text-xs font-medium uppercase tracking-widest" style={{ color: 'var(--color-text-secondary)' }}>
            Volume History
          </span>
        </div>
        <VolumeChart data={volume} />
      </div>

      {exercise.isCustom && (
        <button
          onClick={handleDelete}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl py-3 font-sans text-sm font-medium"
          style={{ background: 'var(--color-ivory)', color: 'var(--color-ember)' }}
        >
          <Trash2 size={15} /> Delete exercise
        </button>
      )}
    </div>
  );
}
