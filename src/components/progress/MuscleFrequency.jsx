const MUSCLE_HUE = {
  chest: '#D4622A', triceps: '#D4622A', 'front-deltoids': '#D4622A',
  biceps: '#C9A84C', forearm: '#C9A84C', abs: '#C9A84C', obliques: '#C9A84C',
  'upper-back': '#6B8F71', 'lower-back': '#6B8F71', trapezius: '#6B8F71', 'back-deltoids': '#6B8F71',
  quadriceps: '#8A8780', hamstring: '#8A8780', gluteal: '#8A8780', calves: '#8A8780',
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
        const hue = MUSCLE_HUE[d.muscle] ?? '#8A8780';
        return (
          <div key={d.muscle} className="flex items-center gap-3">
            <span className="w-24 flex-shrink-0 truncate font-sans text-xs capitalize" style={{ color: 'var(--color-text-secondary)' }}>
              {d.muscle.replace(/-/g, ' ')}
            </span>
            <div className="h-2.5 flex-1 overflow-hidden rounded-full" style={{ background: 'var(--color-ivory)' }}>
              <div className="h-full rounded-full" style={{ width: `${(d.count / max) * 100}%`, background: hue }} />
            </div>
            <span className="w-6 flex-shrink-0 text-right font-mono text-xs" style={{ color: 'var(--color-text-secondary)' }}>
              {d.count}
            </span>
          </div>
        );
      })}
    </div>
  );
}
