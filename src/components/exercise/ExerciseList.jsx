import ExerciseCard from './ExerciseCard.jsx';

export default function ExerciseList({
  exercises,
  onSelect,
  selectedIds = [],
  showArrow = false,
}) {
  if (exercises === undefined) {
    return (
      <div className="flex flex-col gap-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="h-16 rounded-xl"
            style={{ background: 'var(--color-ivory)', opacity: 1 - i * 0.12 }}
          />
        ))}
      </div>
    );
  }

  if (exercises.length === 0) {
    return (
      <p
        className="py-12 text-center font-sans text-sm"
        style={{ color: 'var(--color-text-secondary)' }}
      >
        No exercises found.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {exercises.map((ex) => (
        <ExerciseCard
          key={ex.id}
          exercise={ex}
          onTap={() => onSelect(ex)}
          selected={selectedIds.includes(ex.id)}
          showArrow={showArrow}
        />
      ))}
    </div>
  );
}
