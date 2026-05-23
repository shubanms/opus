import { Clock, Zap, Layers } from 'lucide-react';

function formatDuration(secs) {
  const m = Math.floor(secs / 60);
  const h = Math.floor(m / 60);
  return h > 0 ? `${h}h ${m % 60}m` : `${m}m`;
}

function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function WorkoutCard({ workout }) {
  return (
    <div
      className="mb-3 rounded-2xl px-4 py-3"
      style={{ background: 'var(--color-chalk)', border: '1px solid var(--color-ivory)' }}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="font-sans text-base font-semibold" style={{ color: 'var(--color-text-primary)' }}>
            {workout.name}
          </p>
          <p className="mt-0.5 font-sans text-xs" style={{ color: 'var(--color-text-secondary)' }}>
            {formatDate(workout.date)}
          </p>
        </div>
        {workout.xpEarned > 0 && (
          <span className="flex items-center gap-1 font-mono text-sm font-medium" style={{ color: 'var(--color-gold)' }}>
            <Zap size={13} />+{workout.xpEarned}
          </span>
        )}
      </div>

      <div className="mt-3 flex gap-4">
        <span className="flex items-center gap-1.5 font-sans text-xs" style={{ color: 'var(--color-text-secondary)' }}>
          <Clock size={12} />
          {formatDuration(workout.duration)}
        </span>
        <span className="flex items-center gap-1.5 font-sans text-xs" style={{ color: 'var(--color-text-secondary)' }}>
          <Layers size={12} />
          {workout.totalSets} sets
        </span>
        {workout.totalVolume > 0 && (
          <span className="font-sans text-xs" style={{ color: 'var(--color-text-secondary)' }}>
            {workout.totalVolume.toLocaleString()} kg
          </span>
        )}
      </div>
    </div>
  );
}
