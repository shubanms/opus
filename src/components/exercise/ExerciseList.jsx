import ExerciseCard from './ExerciseCard.jsx';

// The exercise catalogue.
//
// `grouped` adds sticky initial-letter headings. The full list is ~82 entries
// in one alphabetical run, which gives you nothing to aim at while scrolling —
// you either search or you scroll blind. Off by default, because the pickers
// that reuse this list show a short filtered set where headings are noise.

function initialOf(exercise) {
  const c = (exercise?.name ?? '').trim().charAt(0).toUpperCase();
  // Anything not A–Z (a custom exercise named "3-Way Raise") buckets together
  // rather than creating a heading per symbol.
  return c >= 'A' && c <= 'Z' ? c : '#';
}

export default function ExerciseList({
  exercises,
  onSelect,
  selectedIds = [],
  showArrow = false,
  grouped = false,
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

  const card = (ex) => (
    <ExerciseCard
      key={ex.id}
      exercise={ex}
      onTap={() => onSelect(ex)}
      selected={selectedIds.includes(ex.id)}
      showArrow={showArrow}
    />
  );

  if (!grouped) {
    return <div className="flex flex-col gap-2">{exercises.map(card)}</div>;
  }

  const sections = [];
  const byLetter = {};
  for (const ex of exercises) {
    const letter = initialOf(ex);
    if (!byLetter[letter]) {
      byLetter[letter] = { letter, items: [] };
      sections.push(byLetter[letter]);
    }
    byLetter[letter].items.push(ex);
  }

  return (
    <div className="flex flex-col gap-2">
      {sections.map((section) => (
        <div key={section.letter} className="flex flex-col gap-2">
          {/* Fully opaque, not `--glass-chrome`: cards scroll underneath this,
              and at 94% the row passing behind stayed legible through it. */}
          <div
            className="sticky top-0 z-10 -mx-5 px-5 py-1.5 font-mono text-xs font-semibold"
            style={{ background: 'var(--color-chalk)', color: 'var(--color-gold)' }}
          >
            {section.letter}
          </div>
          {section.items.map(card)}
        </div>
      ))}
    </div>
  );
}
