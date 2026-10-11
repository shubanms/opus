import '../../styles/ink-components.css';

/** Uppercase label left, meta right. `rule` adds the hairline (use when it starts a list). */
export default function SectionLabel({ children, meta, rule = false, as: Tag = 'div', className = '', ...rest }) {
  return (
    <Tag className={`ink-label ${rule ? 'ink-label--rule' : ''} ${className}`} {...rest}>
      <span>{children}</span>
      {meta != null ? <span className="ink-label__meta">{meta}</span> : null}
    </Tag>
  );
}
