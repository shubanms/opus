import { ChevronRight } from 'lucide-react';
import '../../styles/ink-components.css';
import KanjiTile from './KanjiTile.jsx';

const DOT_KEYS = ['a', 'b', 'c', 'd', 'e', 'f'];

/** mastery (0..max) shows dots; otherwise `trailing` or a chevron (chevron=false hides). Pass as="button" or as="a" when interactive. */
export default function ListRow({ kanji, tileState = 'outline', title, meta, mastery, max = 3, trailing, chevron = true, as: Tag = 'div', className = '', ...rest }) {
  let end = trailing;
  if (end == null && mastery != null) {
    end = (
      <span className="ink-dots" role="img" aria-label={`Mastery ${mastery} of ${max}`}>
        {Array.from({ length: max }, (_, i) => <i key={DOT_KEYS[i]} className={i < mastery ? 'on' : ''} />)}
      </span>
    );
  }
  if (end == null && chevron) end = <ChevronRight size={18} strokeWidth={1.6} aria-hidden style={{ color: 'var(--mute-3)' }} />;
  return (
    <Tag className={`ink-row ${className}`} {...rest}>
      {kanji ? <KanjiTile kanji={kanji} state={tileState} size={44} /> : null}
      <span className="ink-row__body">
        <span className="ink-row__title">{title}</span>
        {meta ? <span className="ink-row__meta">{meta}</span> : null}
      </span>
      {end}
    </Tag>
  );
}
