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
        className="w-full rounded-xl py-3 pl-9 pr-9 font-sans text-sm outline-none"
        style={{ background: 'var(--color-ivory)', color: 'var(--color-text-primary)' }}
      />
      {local && (
        <button
          onClick={clear}
          className="absolute right-3 top-1/2 -translate-y-1/2"
          aria-label="Clear search"
        >
          <X size={14} style={{ color: 'var(--color-ash)' }} />
        </button>
      )}
    </div>
  );
}
