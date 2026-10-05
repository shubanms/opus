import { useState, useMemo, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Search, X } from 'lucide-react';
import Modal from '../ui/Modal.jsx';
import ExerciseList from '../exercise/ExerciseList.jsx';
import { useExercises } from '../../hooks/useExercises.js';
import { db } from '../../db/db.js';
import { pickerSections, rankForPicker, recentExerciseIds } from '../../utils/pickerOrder.js';

// Friendly muscle groupings → the granular stored muscleGroups they cover.
const GROUPS = [
  { label: 'Chest', muscles: ['chest'] },
  { label: 'Back', muscles: ['upper-back', 'lower-back', 'trapezius'] },
  { label: 'Shoulders', muscles: ['front-deltoids', 'back-deltoids'] },
  { label: 'Arms', muscles: ['biceps', 'triceps', 'forearm'] },
  { label: 'Legs', muscles: ['quadriceps', 'hamstring', 'gluteal', 'calves'] },
  { label: 'Core', muscles: ['abs', 'obliques'] },
  { label: 'Cardio', muscles: ['cardio'] },
];
const LEVELS = ['beginner', 'intermediate', 'advanced'];

function Chip({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className="h-10 shrink-0 rounded-full px-3.5 font-sans text-xs font-medium"
      style={{ background: active ? 'var(--color-gold)' : 'var(--color-ivory)', color: active ? 'var(--color-obsidian)' : 'var(--color-text-secondary)' }}
    >
      {children}
    </button>
  );
}

function SectionLabel({ children }) {
  return (
    <p className="mb-2 mt-1 font-sans text-[11px] font-semibold uppercase tracking-widest" style={{ color: 'var(--color-text-secondary)' }}>
      {children}
    </p>
  );
}

export default function ExercisePicker({ isOpen, onClose, onSelect, alreadyAdded = [], multi = false }) {
  const [search, setSearch] = useState('');
  const [group, setGroup] = useState(null); // group label or null
  const [level, setLevel] = useState(null); // difficulty or null
  const searchRef = useRef(null);
  const all = useExercises();

  // What you trained most recently, newest first — the lift you are about to
  // add is almost always one of these.
  const recentIds = useLiveQuery(
    async () => recentExerciseIds(await db.sets.orderBy('completedAt').reverse().limit(400).toArray(), 8),
    []
  ) ?? [];

  const q = search.trim().toLowerCase();
  const filtering = Boolean(q || group || level);

  const filtered = useMemo(() => {
    const muscles = group ? GROUPS.find((g) => g.label === group)?.muscles ?? null : null;
    return all.filter((e) => {
      if (q && !e.name.toLowerCase().includes(q)) return false;
      if (muscles && !muscles.includes(e.muscleGroup)) return false;
      if (level && e.difficulty !== level) return false;
      return true;
    });
  }, [all, q, group, level]);

  // Favourites, then recent, then A–Z: as headed groups when you are
  // browsing, as one ranked list once you search or filter.
  const sections = useMemo(
    () => (filtering ? null : pickerSections(filtered, recentIds)),
    [filtering, filtered, recentIds]
  );
  const ranked = useMemo(() => (filtering ? rankForPicker(filtered, recentIds) : null), [filtering, filtered, recentIds]);

  function reset() {
    setSearch(''); setGroup(null); setLevel(null);
  }

  function handleSelect(ex) {
    onSelect(ex);
    if (!multi) { reset(); onClose(); }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={multi ? 'Add Exercises' : 'Add Exercise'}>
      {/* Its own field rather than the catalogue's: no 300 ms debounce on an
          in-memory list of eighty names, and a clear button you can hit. */}
      <div className="relative">
        <Search
          size={16}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2"
          style={{ color: 'var(--color-ash)' }}
        />
        <input
          ref={searchRef}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search exercises…"
          aria-label="Search exercises"
          type="text"
          autoComplete="off"
          enterKeyHint="search"
          className="h-12 w-full rounded-xl pl-9 pr-12 font-sans text-sm outline-none"
          style={{ background: 'var(--color-ivory)', color: 'var(--color-text-primary)' }}
        />
        {search && (
          <button
            type="button"
            onClick={() => { setSearch(''); searchRef.current?.focus(); }}
            className="absolute right-1 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full"
            aria-label="Clear search"
          >
            <X size={15} style={{ color: 'var(--color-ash)' }} />
          </button>
        )}
      </div>

      {/* Muscle-group filter — edge-to-edge scrollable row so it never overflows */}
      <div className="no-scrollbar -mx-5 mt-3 flex gap-1.5 overflow-x-auto px-5">
        {GROUPS.map((g) => (
          <Chip key={g.label} active={group === g.label} onClick={() => setGroup(group === g.label ? null : g.label)}>
            {g.label}
          </Chip>
        ))}
      </div>

      {/* Level filter */}
      <div className="mt-2 flex flex-wrap gap-1.5">
        {LEVELS.map((l) => (
          <Chip key={l} active={level === l} onClick={() => setLevel(level === l ? null : l)}>
            {l.charAt(0).toUpperCase() + l.slice(1)}
          </Chip>
        ))}
      </div>

      <div className="mt-3 max-h-[48vh] overflow-y-auto">
        {filtering ? (
          ranked.length > 0 ? (
            <ExerciseList exercises={ranked} onSelect={handleSelect} selectedIds={alreadyAdded} showArrow={false} />
          ) : (
            <p className="py-8 text-center font-sans text-sm" style={{ color: 'var(--color-text-secondary)' }}>
              No exercises match those filters.
            </p>
          )
        ) : (
          sections.map((sec) => (
            <div key={sec.key} className="mb-4">
              {/* With nothing to group, a lone "All exercises" heading is noise. */}
              {sections.length > 1 && <SectionLabel>{sec.label}</SectionLabel>}
              <ExerciseList exercises={sec.items} onSelect={handleSelect} selectedIds={alreadyAdded} showArrow={false} />
            </div>
          ))
        )}
      </div>

      {multi && (
        <button
          type="button"
          onClick={() => { reset(); onClose(); }}
          className="mt-3 w-full rounded-xl py-3 font-sans text-sm font-semibold"
          style={{ background: 'var(--color-gold)', color: 'var(--color-obsidian)' }}
        >
          Done
        </button>
      )}
    </Modal>
  );
}
