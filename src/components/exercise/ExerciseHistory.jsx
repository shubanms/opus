import { useState } from 'react';
import { Trophy, ChevronDown } from 'lucide-react';
import { m, listVariants, itemVariants } from '../../motion/index.jsx';
import { useExerciseHistory } from '../../hooks/useExercises.js';
import { setChipLabel, recordLabel } from '../../utils/exerciseHistory.js';
import { friendlyDate } from '../../utils/dateKey.js';
import { useHaptics } from '../../hooks/useHaptics.js';
import { SectionLabel } from '../ink/index.js';
import '../../styles/ink-forms.css';

const FIRST = 5;
const MORE = 10;

/**
 * Session-by-session history of one exercise, newest first: the date, the
 * session it was part of, and every set as a chip. Warm-ups are dimmed; a set
 * that set a record (as the finish screen counted it at the time) wears a
 * trophy. This is what a lifter opens a form page for: what did I do last
 * time, and the time before.
 */
export default function ExerciseHistory({ exerciseId, unit }) {
  const sessions = useExerciseHistory(exerciseId);
  const haptic = useHaptics();
  const [shown, setShown] = useState(FIRST);

  if (sessions === undefined) {
    return <div className="forms-panel" style={{ height: 112 }} aria-busy="true" aria-label="Loading history" />;
  }

  const visible = sessions.slice(0, shown);
  const left = sessions.length - visible.length;

  return (
    <section aria-labelledby="exercise-history-title">
      <SectionLabel as="h2" id="exercise-history-title" rule meta={sessions.length > 0 ? `${sessions.length} session${sessions.length === 1 ? '' : 's'}` : undefined}>
        History
      </SectionLabel>

      {sessions.length === 0 ? (
        <p className="forms-panel" style={{ color: 'var(--mute-2)', fontSize: 14 }}>
          Not logged yet. Your sets will show up here, session by session.
        </p>
      ) : (
        <m.ol className="forms-panel" style={{ listStyle: 'none', marginBottom: 0 }} variants={listVariants} initial="initial" animate="animate">
          {visible.map((session) => {
            const working = session.sets.filter((s) => !s.isWarmup).length;
            return (
              <m.li key={session.workoutId} variants={itemVariants} className="forms-hist-item">
                <div className="forms-hist-head">
                  <p className="forms-hist-date">
                    {friendlyDate(session.date)}
                    {session.name && <span> · {session.name}</span>}
                  </p>
                  <span className="forms-hist-count">
                    {working} set{working === 1 ? '' : 's'}
                  </span>
                </div>
                <ul className="forms-sets">
                  {session.sets.map((s) => {
                    const record = s.records.length > 0;
                    const label = [setChipLabel(s, unit), s.isWarmup ? 'warm-up' : null, record ? recordLabel(s.records) : null]
                      .filter(Boolean)
                      .join(', ');
                    return (
                      <li
                        key={s.id ?? `${session.workoutId}-${s.setNumber}`}
                        aria-label={label}
                        title={record ? recordLabel(s.records) : s.isWarmup ? 'Warm-up' : undefined}
                        className={`forms-set ${record ? 'forms-set--record' : ''} ${s.isWarmup ? 'forms-set--warm' : ''}`}
                      >
                        {s.isWarmup && <span aria-hidden style={{ fontSize: 10, fontWeight: 700 }}>W</span>}
                        {setChipLabel(s, unit)}
                        {record && <Trophy size={10} aria-hidden />}
                      </li>
                    );
                  })}
                </ul>
              </m.li>
            );
          })}
        </m.ol>
      )}

      {left > 0 && (
        <button type="button" onClick={() => { setShown((n) => n + MORE); haptic('tap'); }} className="forms-more">
          <ChevronDown size={14} /> Show {Math.min(MORE, left)} more{left > MORE ? ` of ${left}` : ''}
        </button>
      )}
    </section>
  );
}
