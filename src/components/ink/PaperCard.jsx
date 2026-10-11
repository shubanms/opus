import '../../styles/ink-components.css';

/** Washi paper card. `seal` renders in a slot hanging off the top-right corner. */
export default function PaperCard({ as: Tag = 'div', seal, className = '', children, ...rest }) {
  return (
    <Tag className={`washi ink-card ${className}`} {...rest}>
      {seal ? <span className="ink-card__seal">{seal}</span> : null}
      {children}
    </Tag>
  );
}
