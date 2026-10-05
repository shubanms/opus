import { useState, useEffect } from 'react';
import { Search, X } from 'lucide-react';

export default function ExerciseSearch({ value, onChange, placeholder = 'Search exercises…' }) {
  const [local, setLocal] = useState(value);

  // Sync external value changes (e.g. clear from parent)
  useEffect(() => { setLocal(value); }, [value]);

  // Debounce: propagate after 300ms idle
  useEffect(() => {
    const t = setTimeout(() => onChange(local), 300);
    return () => clearTimeout(t);
  }, [local]); // eslint-disable-line react-hooks/exhaustive-deps

  function clear() { setLocal(''); onChange(''); }

  return (
    <div className="relative">
      <Search
        size={16}
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2"
        style={{ color: 'var(--color-ash)' }}
      />
      <input
        value={local}
        onChange={(e) => setLocal(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder.replace(/…$/, '')}
        enterKeyHint="search"
        className="w-full rounded-xl py-3 pl-9 pr-12 font-sans text-sm outline-none"
        style={{ background: 'var(--color-ivory)', color: 'var(--color-text-primary)' }}
      />
      {local && (
        <button
          type="button"
          onClick={clear}
          // A 40 px hit area around the 14 px glyph — it was the glyph alone.
          className="absolute right-1 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-lg"
          aria-label="Clear search"
        >
          <X size={14} style={{ color: 'var(--color-ash)' }} />
        </button>
      )}
    </div>
  );
}
