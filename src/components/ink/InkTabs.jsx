import { useRef } from 'react';
import '../../styles/ink-components.css';
import useInkMotion from './useInkMotion.js';

/** tabs: [{ id, label, tabId?, panelId? }]. Controlled via value/onChange. Arrow keys, Home and End move selection. */
export default function InkTabs({ tabs, value, onChange, label = 'Tabs', className = '' }) {
  const motionOn = useInkMotion();
  const refs = useRef([]);
  const onKey = (e, i) => {
    const n = tabs.length;
    let j = null;
    if (e.key === 'ArrowRight') j = (i + 1) % n;
    else if (e.key === 'ArrowLeft') j = (i - 1 + n) % n;
    else if (e.key === 'Home') j = 0;
    else if (e.key === 'End') j = n - 1;
    if (j == null) return;
    e.preventDefault();
    onChange?.(tabs[j].id);
    refs.current[j]?.focus();
  };
  return (
    <div role="tablist" aria-label={label} className={`ink-tabs ${className}`}>
      {tabs.map((t, i) => {
        const on = t.id === value;
        return (
          <button
            key={t.id}
            ref={(el) => { refs.current[i] = el; }}
            type="button"
            role="tab"
            id={t.tabId}
            aria-selected={on}
            aria-controls={t.panelId}
            tabIndex={on ? 0 : -1}
            className="ink-tab"
            onClick={() => onChange?.(t.id)}
            onKeyDown={(e) => onKey(e, i)}
          >
            {t.label}
            {on ? <span aria-hidden className={`ink-tab__line ${motionOn ? 'ink-tab__line--wipe' : ''}`} /> : null}
          </button>
        );
      })}
    </div>
  );
}
