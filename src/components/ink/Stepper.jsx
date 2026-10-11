import '../../styles/ink-components.css';

/** − value +. Controlled: onChange(next). */
export default function Stepper({ value, onChange, step = 1, min = Number.NEGATIVE_INFINITY, max = Number.POSITIVE_INFINITY, unit, label = 'value', tone = 'dark', size = 32, className = '' }) {
  const set = (v) => onChange?.(Math.min(max, Math.max(min, v)));
  return (
    <fieldset aria-label={label} className={`ink-stepper ${tone === 'paper' ? 'ink-stepper--paper' : ''} ${className}`} style={{ border: 0, margin: 0, padding: 0 }}>
      <button type="button" className="ink-stepper__btn" aria-label={`Decrease ${label}`} disabled={value <= min} onClick={() => set(value - step)}>−</button>
      <span aria-live="polite">
        <span className="ink-stepper__val" style={{ fontSize: size }}>{value}</span>
        {unit ? <span className="ink-stepper__unit">{unit}</span> : null}
      </span>
      <button type="button" className="ink-stepper__btn" aria-label={`Increase ${label}`} disabled={value >= max} onClick={() => set(value + step)}>+</button>
    </fieldset>
  );
}
