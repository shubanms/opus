const MUSCLE_HUE = {
  chest: '#E0553B', triceps: '#E0553B', 'front-deltoids': '#E0553B',
  biceps: '#D2AE5A', forearm: '#D2AE5A', abs: '#D2AE5A', obliques: '#D2AE5A',
  'upper-back': '#9DA67A', 'lower-back': '#9DA67A', trapezius: '#9DA67A', 'back-deltoids': '#9DA67A',
  quadriceps: '#8F877B', hamstring: '#8F877B', gluteal: '#8F877B', calves: '#8F877B',
};

export default function MuscleFrequency({ data }) {
  if (!data || data.length === 0) {
    return (
      <p className="py-6 text-center font-sans text-sm" style={{ color: 'var(--color-text-secondary)' }}>
        Train to see which muscles you hit most.
      </p>
    );
  }

  const max = Math.max(...data.map((d) => d.count));

  return (
    <div className="flex flex-col gap-2">
      {data.map((d) => {
        const hue = MUSCLE_HUE[d.muscle] ?? '#8F877B';
        return (
          <div key={d.muscle} className="flex items-center gap-3">
            <span className="w-24 shrink-0 truncate font-sans text-xs capitalize" style={{ color: 'var(--color-text-secondary)' }}>
              {d.muscle.replace(/-/g, ' ')}
            </span>
            <div className="h-2.5 flex-1 overflow-hidden rounded-full" style={{ background: 'var(--color-ivory)' }}>
              <div className="h-full rounded-full" style={{ width: `${(d.count / max) * 100}%`, background: hue }} />
            </div>
            <span className="w-6 shrink-0 text-right font-mono text-xs" style={{ color: 'var(--color-text-secondary)' }}>
              {d.count}
            </span>
          </div>
        );
      })}
    </div>
  );
}
