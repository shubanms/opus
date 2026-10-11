import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/db.js';
import { useTodayKey } from '../../hooks/useTodayKey.js';
import { mondayKey } from '../../utils/weeks.js';
import { shiftKey } from '../../utils/dateKey.js';
import { SectionLabel } from '../ink/index.js';
import { WEEKDAY_KANJI } from '../../utils/kanji.js';
import '../../styles/ink-home.css';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
// Slightly different strokes so the underlines look hand-made.
const STROKES = [
  { d: 'M3 6 C 9 3.5, 18 3.5, 25 5', w: 3.6 },
  { d: 'M2 5 C 10 3, 17 4, 26 5.5', w: 3.8 },
  { d: 'M3 5.5 C 10 4, 19 3, 25 4.5', w: 3.4 },
];

/** Monday to Sunday of this week: trained days get a brush underline, today is vermilion until sealed. */
export default function WeekRow({ onOpen }) {
  const today = useTodayKey();
  const monday = mondayKey(today);
  const trained = useLiveQuery(async () => {
    const rows = await db.workouts.toArray();
    return new Set(rows.filter((w) => w.status === 'completed' && w.date >= monday && w.date <= today).map((w) => w.date));
  }, [today]) ?? new Set();
  const days = DAYS.map((name, i) => {
    const key = shiftKey(monday, i);
    return { name, key, done: trained.has(key), isToday: key === today, future: key > today };
  });
  const count = days.filter((d) => d.done).length;
  return (
    <section className="hm-week" aria-label="This week">
      <SectionLabel meta={`${count} ${count === 1 ? 'SESSION' : 'SESSIONS'}`}>THIS WEEK</SectionLabel>
      <button type="button" className="hm-week__grid" onClick={onOpen} aria-label={`This week: ${count} ${count === 1 ? 'session' : 'sessions'}. Open progress`}>
        {days.map((d, i) => {
          const sealedToday = d.isToday && d.done;
          const hot = d.isToday && !d.done;
          const dim = !d.done && !hot;
          return (
            <span key={d.key} className={`hm-day${dim ? ' hm-day--dim' : ''}${hot ? ' hm-day--today' : ''}`}>
              <span className="hm-day__k" lang="ja">{WEEKDAY_KANJI[d.name]}</span>
              <span className="hm-day__e">{hot ? 'TODAY' : d.name.toUpperCase()}</span>
              {d.done || sealedToday ? (
                <svg aria-hidden viewBox="0 0 28 10" className="hm-day__brush">
                  <path d={STROKES[i % 3].d} filter="url(#ink-brush-fine)" fill="none" stroke="currentColor" strokeWidth={STROKES[i % 3].w} strokeLinecap="round" />
                </svg>
              ) : hot ? (
                <span className="hm-day__ring" />
              ) : (
                <span className="hm-day__dot" />
              )}
            </span>
          );
        })}
      </button>
    </section>
  );
}
