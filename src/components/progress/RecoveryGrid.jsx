import { m } from '../../motion/index.jsx';
import { useRecovery } from '../../hooks/useRecovery.js';
import useInkMotion from '../ink/useInkMotion.js';
import { FAMILIES, coachLine, familyDays, recoveryNeed, recoveryWord } from './chronicleLogic.js';
import '../../styles/ink-chronicle.css';

// Six kanji tiles. Vermilion opacity equals how much of the family is still
// recovering (0..1); fresh families are outlined. The coach line is derived
// from the same days.
export default function RecoveryGrid() {
  const { byMuscle } = useRecovery();
  const motionOn = useInkMotion();
  const days = familyDays(byMuscle);
  return (
    <>
      <div className="chr-rec">
        {FAMILIES.map((f, i) => {
          const d = days[f.kanji];
          const need = recoveryNeed(d);
          const word = recoveryWord(d);
          return (
            <div
              key={f.kanji}
              className={`chr-tile ${need > 0 ? '' : 'chr-tile--fresh'}`}
            >
              {need > 0 && (
                <m.span
                  aria-hidden
                  className="chr-tile__fill"
                  initial={motionOn ? { opacity: 0 } : false}
                  animate={{ opacity: need }}
                  transition={{ duration: 0.5, delay: i * 0.05 }}
                />
              )}
              <span aria-hidden className="chr-tile__k" style={need > 0.6 ? { filter: 'url(#ink-stamp)' } : undefined}>
                {f.kanji}
              </span>
              <span>
                <span className="chr-tile__n">{f.name}</span>
                <span className="chr-tile__w">{word}</span>
              </span>
            </div>
          );
        })}
      </div>
      <p className="chr-coach">{coachLine(days)}</p>
    </>
  );
}
