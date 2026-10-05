import { friendlyDate } from '../../utils/dateKey.js';

// The rows the body / sleep / activity sheets are built from. One look, one
// error treatment: a field that can't be saved says why, under itself, in the
// warn colour — not a disabled button with no explanation.

const ROW = 'flex items-center justify-between gap-3 rounded-xl px-3 py-2.5';

/** The day being edited. Native picker; can't go past today. */
export function DateRow({ value, max, onChange, existing }) {
  return (
    <label className={`${ROW} mb-2`} style={{ background: 'var(--color-ivory)' }}>
      <span className="min-w-0">
        <span className="block font-sans text-sm" style={{ color: 'var(--color-text-primary)' }}>
          {friendlyDate(value) || 'Date'}
        </span>
        <span className="block font-sans text-[11px]" style={{ color: 'var(--color-text-secondary)' }}>
          {existing ? 'Editing this day' : 'New entry'}
        </span>
      </span>
      <input
        type="date"
        value={value}
        max={max}
        onChange={(e) => onChange(e.target.value)}
        aria-label="Date"
        className="h-10 rounded-lg px-2 font-mono text-sm outline-none"
        style={{ background: 'var(--color-chalk)', color: 'var(--color-text-primary)' }}
      />
    </label>
  );
}

/** A labelled number field with its unit and, when it can't be saved, why. */
export function NumberRow({ label, icon: Icon, iconColor, unit, value, onChange, onBlur, error, inputMode = 'decimal', placeholder = '—' }) {
  return (
    <div>
      <label
        className={ROW}
        style={{ background: 'var(--color-ivory)', boxShadow: error ? 'inset 0 0 0 1px var(--color-ember)' : 'none' }}
      >
        <span className="flex min-w-0 items-center gap-2 font-sans text-sm" style={{ color: 'var(--color-text-primary)' }}>
          {Icon && <Icon size={15} style={{ color: iconColor }} />}
          {label}
        </span>
        <span className="flex shrink-0 items-center gap-2">
          <input
            type="text"
            inputMode={inputMode}
            pattern={inputMode === 'numeric' ? '[0-9]*' : undefined}
            autoComplete="off"
            value={value ?? ''}
            onChange={(e) => onChange(e.target.value)}
            onBlur={onBlur}
            placeholder={placeholder}
            aria-label={label}
            aria-invalid={error ? 'true' : undefined}
            className="h-10 w-24 rounded-lg px-2 text-right font-mono text-sm outline-none"
            style={{ background: 'var(--color-chalk)', color: 'var(--color-text-primary)' }}
          />
          <span className="w-9 font-sans text-xs" style={{ color: 'var(--color-ash)' }}>{unit}</span>
        </span>
      </label>
      {error && (
        <p role="alert" className="mt-1 px-3 font-sans text-[11px] font-medium" style={{ color: 'var(--color-ember)' }}>
          {error}
        </p>
      )}
    </div>
  );
}

/** The sheet's primary action. Dimmed until there is something to save. */
export function SaveButton({ onClick, enabled, label = 'Save' }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!enabled}
      className="mt-4 w-full rounded-xl py-3 font-sans text-sm font-semibold"
      style={{ background: 'var(--color-gold)', color: 'var(--color-obsidian)', opacity: enabled ? 1 : 0.35 }}
    >
      {label}
    </button>
  );
}
