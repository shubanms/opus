import { PaperCard, InkButton } from '../ink/index.js';
import { UI_KANJI } from '../../utils/kanji.js';
import useInkMotion from '../ink/useInkMotion.js';
import '../../styles/ink-home.css';

function MapleSeal({ live }) {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className={`hm-maple${live ? ' hm-maple--sway' : ''}`}>
      <path d="M12 2 L14 7 L19 5 L17 10 L22 11 L17 14 L19 19 L14 17 L12 22 L10 17 L5 19 L7 14 L2 11 L7 10 L5 5 L10 7 Z" fill="var(--ver)" />
      <path d="M12 22 V 9 M12 14 L 16 11 M12 14 L 8 11 M12 18 L 15 16 M12 18 L 9 16" fill="none" stroke="var(--ver-deep)" strokeWidth="0.8" />
    </svg>
  );
}

/**
 * Today: the washi card that overlaps the sky. `rest` swaps the vermilion CTA
 * for a quiet "Train anyway"; `ctaLabel` is the accessible name of the CTA.
 */
export default function TodayCard({ weekday, title, meta, line, cta = 'Begin the duel', ctaLabel, onBegin, rest = false }) {
  const live = useInkMotion();
  return (
    <PaperCard as="section" aria-label="Today" className="hm-today" seal={<MapleSeal live={live} />}>
      <div className="hm-today__head">
        <span className="hm-today__kanji" lang="ja">{UI_KANJI.today}</span>
        <span className="hm-today__day">Today · {weekday}</span>
        <span className="hm-today__meta">{meta}</span>
      </div>
      <h2 className="hm-today__title">{title}</h2>
      {line ? <p className="hm-today__line">{line}</p> : null}
      {rest ? (
        <InkButton variant="secondaryOnPaper" block onClick={onBegin} aria-label={ctaLabel}>{cta}</InkButton>
      ) : (
        <InkButton block onClick={onBegin} aria-label={ctaLabel} className="hm-today__cta">
          <span>{cta}</span>
          <svg aria-hidden viewBox="0 0 44 12" className="hm-today__arrow">
            <path d="M1 6.5 C 14 5.5, 28 5.5, 42 6" />
            <path d="M35 1.5 L 42 6 L 35 10.5" />
          </svg>
        </InkButton>
      )}
    </PaperCard>
  );
}
