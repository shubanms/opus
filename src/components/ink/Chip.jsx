import '../../styles/ink-components.css';

/** Outline chip. tone: dark | paper. Selected state is exposed via aria-pressed. */
export default function Chip({ selected = false, tone = 'dark', className = '', type = 'button', children, ...rest }) {
  return (
    <button type={type} aria-pressed={selected} className={`ink-chip ink-chip--${tone} ${className}`} {...rest}>
      {children}
    </button>
  );
}
