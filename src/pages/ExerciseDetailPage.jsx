import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Trophy, TrendingUp } from 'lucide-react';
import { useExercise } from '../hooks/useExercises.js';
import { usePRs } from '../hooks/useProgress.js';

function PRCard({ prs }) {
  const weight = prs.find((p) => p.type === 'weight');
  const reps = prs.find((p) => p.type === 'reps');
  const volume = prs.find((p) => p.type === 'volume');

  if (!weight && !reps) {
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
      <div className="flex gap-6">
        {weight && (
          <div>
            <p className="font-mono text-2xl font-medium" style={{ color: 'var(--color-text-primary)' }}>
              {weight.value}<span className="text-sm"> kg</span>
            </p>
            <p className="font-sans text-xs" style={{ color: 'var(--color-text-secondary)' }}>Best weight</p>
          </div>
        )}
        {reps && (
          <div>
            <p className="font-mono text-2xl font-medium" style={{ color: 'var(--color-text-primary)' }}>
              {reps.value}<span className="text-sm"> reps</span>
            </p>
            <p className="font-sans text-xs" style={{ color: 'var(--color-text-secondary)' }}>Best reps</p>
          </div>
        )}
        {volume && (
          <div>
            <p className="font-mono text-2xl font-medium" style={{ color: 'var(--color-text-primary)' }}>
              {volume.value}<span className="text-sm"> kg</span>
            </p>
            <p className="font-sans text-xs" style={{ color: 'var(--color-text-secondary)' }}>Best volume</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ExerciseDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const exercise = useExercise(Number(id));
  const prs = usePRs(Number(id));

  if (!exercise) {
    return (
      <div className="flex h-48 items-center justify-center">
        <p className="font-sans text-sm" style={{ color: 'var(--color-text-secondary)' }}>Loading…</p>
      </div>
    );
  }

  return (
    <div className="anim-fade-slide-up px-5 pb-8 pt-6">
      <button onClick={() => navigate(-1)} className="mb-5 flex items-center gap-2">
        <ArrowLeft size={18} style={{ color: 'var(--color-text-secondary)' }} />
        <span className="font-sans text-sm" style={{ color: 'var(--color-text-secondary)' }}>Back</span>
      </button>

      {/* Title */}
      <h1 className="font-display text-4xl font-bold leading-none" style={{ color: 'var(--color-text-primary)' }}>
        {exercise.name}
      </h1>
      <p className="mt-1 font-sans text-sm capitalize" style={{ color: 'var(--color-text-secondary)' }}>
        {exercise.muscleGroup.replace(/-/g, ' ')} · {exercise.equipment}
        {exercise.isCustom && (
          <span className="ml-2 rounded-full px-2 py-0.5 font-sans text-xs" style={{ background: 'var(--color-gold)', color: 'var(--color-obsidian)' }}>
            Custom
          </span>
        )}
      </p>

      {/* PRs */}
      <div className="mt-6">
        <PRCard prs={prs} />
      </div>

      {/* Volume history placeholder */}
      <div className="mt-4 rounded-2xl p-4" style={{ background: 'var(--color-ivory)' }}>
        <div className="mb-2 flex items-center gap-2">
          <TrendingUp size={15} style={{ color: 'var(--color-ash)' }} />
          <span className="font-sans text-xs font-medium uppercase tracking-widest" style={{ color: 'var(--color-text-secondary)' }}>
            Volume History
          </span>
        </div>
        <p className="font-sans text-sm" style={{ color: 'var(--color-text-secondary)' }}>
          Charts available after Sprint 5.
        </p>
      </div>
    </div>
  );
}
