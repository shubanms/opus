const MUSCLE_HUE = {
  chest: '#FF8FA3', triceps: '#FF8FA3', 'front-deltoids': '#FF8FA3',
  biceps: '#8B7DFF', forearm: '#8B7DFF', abs: '#8B7DFF', obliques: '#8B7DFF',
  'upper-back': '#4FD8C4', 'lower-back': '#4FD8C4', trapezius: '#4FD8C4', 'back-deltoids': '#4FD8C4',
  quadriceps: '#7B83A6', hamstring: '#7B83A6', gluteal: '#7B83A6', calves: '#7B83A6',
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
        const hue = MUSCLE_HUE[d.muscle] ?? '#7B83A6';
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
