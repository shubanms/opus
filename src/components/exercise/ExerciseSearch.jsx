import { useState, useEffect } from 'react';
import { Search, X } from 'lucide-react';
import '../../styles/ink-forms.css';

export default function ExerciseSearch({ value, onChange, placeholder = 'Search exercises…', className = '' }) {
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
    <div className={`forms-search__field ${className}`}>
      <Search size={18} strokeWidth={1.8} aria-hidden />
      <input
        value={local}
        onChange={(e) => setLocal(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder.replace(/…$/, '')}
        enterKeyHint="search"
      />
      {local && (
        <button type="button" onClick={clear} className="forms-search__clear" aria-label="Clear search">
          <X size={14} />
        </button>
      )}
    </div>
  );
}
