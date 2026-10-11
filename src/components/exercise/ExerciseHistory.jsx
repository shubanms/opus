import { useState } from 'react';
import { History, Trophy, ChevronDown } from 'lucide-react';
import { m, listVariants, itemVariants } from '../../motion/index.jsx';
import { useExerciseHistory } from '../../hooks/useExercises.js';
import { setChipLabel, recordLabel } from '../../utils/exerciseHistory.js';
import { friendlyDate } from '../../utils/dateKey.js';
import { useHaptics } from '../../hooks/useHaptics.js';

const FIRST = 5;
const MORE = 10;

/**
 * Session-by-session history of one exercise, newest first: the date, the
 * session it was part of, and every set as a chip. Warm-ups are dimmed; a set
 * that set a record (as the finish screen counted it at the time) wears a
 * trophy. This is what a lifter opens an exercise page for — "what did I do
 * last time, and the time before" — and the page had no way to read it.
 */
export default function ExerciseHistory({ exerciseId, unit }) {
  const sessions = useExerciseHistory(exerciseId);
  const haptic = useHaptics();
  const [shown, setShown] = useState(FIRST);

  if (sessions === undefined) {
    return <div className="glass h-28 rounded-2xl" style={{ background: 'var(--color-ivory)' }} aria-busy="true" aria-label="Loading history" />;
  }

  const visible = sessions.slice(0, shown);
  const left = sessions.length - visible.length;

  return (
    <section className="glass rounded-2xl p-4" style={{ background: 'var(--color-ivory)' }} aria-labelledby="exercise-history-title">
      <div className="mb-3 flex items-center gap-2">
        <History size={15} style={{ color: 'var(--color-ash)' }} />
        <h2 id="exercise-history-title" className="font-sans text-xs font-medium uppercase tracking-widest" style={{ color: 'var(--color-text-secondary)' }}>
          History
        </h2>
        {sessions.length > 0 && (
          <span className="ml-auto font-mono text-[11px]" style={{ color: 'var(--color-ash)' }}>
            {sessions.length} session{sessions.length === 1 ? '' : 's'}
          </span>
        )}
      </div>

      {sessions.length === 0 ? (
        <p className="font-sans text-sm" style={{ color: 'var(--color-text-secondary)' }}>
          Not logged yet — your sets will show up here, session by session.
        </p>
      ) : (
        <m.ol className="flex flex-col" variants={listVariants} initial="initial" animate="animate">
          {visible.map((session, i) => {
            const working = session.sets.filter((s) => !s.isWarmup).length;
            return (
              <m.li
                key={session.workoutId}
                variants={itemVariants}
                className="py-2.5"
                style={{ borderTop: i === 0 ? 'none' : '1px solid var(--color-chalk)' }}
              >
                <div className="mb-1.5 flex items-baseline justify-between gap-2">
                  <p className="min-w-0 truncate font-sans text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                    {friendlyDate(session.date)}
                    {session.name && (
                      <span className="font-normal" style={{ color: 'var(--color-text-secondary)' }}> · {session.name}</span>
                    )}
                  </p>
                  <span className="shrink-0 font-mono text-[11px]" style={{ color: 'var(--color-ash)' }}>
                    {working} set{working === 1 ? '' : 's'}
                  </span>
                </div>
                <ul className="flex flex-wrap gap-1.5">
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
                        className="flex items-center gap-1 rounded-full px-2 py-0.5 font-mono text-xs"
                        style={{
                          background: 'var(--color-chalk)',
                          color: record ? 'var(--color-gold)' : 'var(--color-text-primary)',
                          border: record ? '1px solid var(--color-gold)' : '1px solid transparent',
                          opacity: s.isWarmup ? 0.45 : 1,
                        }}
                      >
                        {s.isWarmup && <span className="font-sans text-[10px] font-semibold" aria-hidden>W</span>}
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
        <button
          type="button"
          onClick={() => { setShown((n) => n + MORE); haptic('tap'); }}
          className="mt-2 flex w-full items-center justify-center gap-1 rounded-xl py-2.5 font-sans text-xs font-semibold"
          style={{ background: 'var(--color-chalk)', color: 'var(--color-text-primary)' }}
        >
          <ChevronDown size={14} /> Show {Math.min(MORE, left)} more{left > MORE ? ` of ${left}` : ''}
        </button>
      )}
    </section>
  );
}
