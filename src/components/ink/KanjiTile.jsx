import '../../styles/ink-components.css';

/** state: lit | paper | outline | locked. aria-hidden unless `label` is given. */
export default function KanjiTile({ kanji, state = 'outline', size = 48, label, className = '' }) {
  const a11y = label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true };
  return (
    <span className={`ink-tile ink-tile--${state} ${className}`} style={{ width: size, height: size, fontSize: Math.round(size * 0.58) }} {...a11y}>
      <span style={state === 'lit' ? { filter: 'url(#ink-stamp)' } : undefined}>{kanji}</span>
    </span>
  );
}
