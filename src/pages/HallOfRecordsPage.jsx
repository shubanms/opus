import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trophy } from 'lucide-react';
import { useAllPRs } from '../hooks/useProgress.js';
import useSettingsStore from '../store/settingsStore.js';
import { fmtVolume, fmtWeight, toDisplay, unitLabel } from '../utils/units.js';
import { friendlyDate, todayKey } from '../utils/dateKey.js';
import EmptyState from '../components/ui/EmptyState.jsx';
import BackButton from '../components/layout/BackButton.jsx';
import { Seal, SectionLabel } from '../components/ink/index.js';
import useInkMotion from '../components/ink/useInkMotion.js';
import { formKanji } from '../utils/kanji.js';
import '../styles/ink-records.css';

// Every record is a wooden ema plaque on a shrine rack, newest first; the
// newest glows and wears 新. Beneath the rack, THE LEDGER lists the same
// records as rows with the change over the previous mark. Each plaque and row
// opens that lift (its record history). Weights are shown exactly (fmtWeight);
// only volume rounds. Real data only: the struck-through mark is the record
// this one replaced, when there is one.

const TYPE_LABEL = { weight: 'Heaviest weight', reps: 'Most reps', volume: 'Best volume' };
const TYPE_SHORT = { weight: 'weight', reps: 'reps', volume: 'volume' };

function hash(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0;
  return Math.abs(h);
}

// Visible plaques are the only ones that sway (keeps loops to a dozen or so).
function useInView() {
  const ref = useRef(null);
  const [inView, setInView] = useState(true);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') return undefined;
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { rootMargin: '40px' });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return [ref, inView];
}

function fitSize(text, max, width) {
  return Math.min(max, Math.round((width / (Math.max(text.length, 1) * 0.6)) * 10) / 10);
}

function Plaque({ rec, isNewest, onOpen }) {
  const [ref, inView] = useInView();
  const h = hash(String(rec.id));
  const style = { '--rec-dur': `${3 + (h % 11) / 10}s`, '--rec-delay': `-${((h >> 4) % 40) / 10}s` };
  const name = rec.exerciseName;
  return (
    <button
      ref={ref}
      type="button"
      className="rec-ema"
      data-in={inView ? '1' : '0'}
      style={style}
      onClick={() => onOpen(rec)}
      aria-label={rec.aria}
    >
      {isNewest && <span className="rec-ema__glow" aria-hidden="true" />}
      <svg className="rec-ema__svg" viewBox="0 0 92 84" aria-hidden="true">
        <path d="M0 18 L 46 0 L 92 18 L 92 84 L 0 84 Z" style={{ fill: '#C9A77A', stroke: '#8A6A44', strokeWidth: 1.2 }} />
        <path d="M4 20 L 46 4.5 L 88 20 L 88 80 L 4 80 Z" style={{ fill: 'none', stroke: '#A88458', strokeWidth: 0.8 }} />
        <path
          d="M8 38 C 30 35, 60 41, 84 37 M8 56 C 34 59, 58 53, 84 57 M8 71 C 28 69, 62 73, 84 70"
          style={{ fill: 'none', stroke: '#A88458', strokeWidth: 0.6, opacity: 0.6 }}
        />
        <circle cx="46" cy="10" r="2" fill="#3A2A1E" />
        <text className="rec-t rec-t--name" x="46" y="31" fontSize={fitSize(name, 10, 76)}>{name}</text>
        <text className="rec-t rec-t--mark" x="46" y="51" fontSize={fitSize(rec.mark, 19, 74)}>{rec.mark}</text>
        <text className={`rec-t ${rec.prevMark ? "rec-t--prev" : "rec-t--meta"}`} x="46" y="62" fontSize="7.5">{rec.prevMark ?? TYPE_SHORT[rec.type]}</text>
        <text className="rec-t rec-t--meta" x="46" y="75" fontSize="8.5">{rec.dateLabel}</text>
      </svg>
      {isNewest && <Seal kanji="新" size={15} rotate={-4} className="rec-ema__seal" />}
    </button>
  );
}

export default function HallOfRecordsPage() {
  const navigate = useNavigate();
  const prs = useAllPRs();
  const unit = useSettingsStore((s) => s.unit);
  const live = useInkMotion();

  const fmt = (p, value = p.value) =>
    p.type === 'reps' ? `${value} reps` : p.type === 'volume' ? fmtVolume(value, unit) : fmtWeight(value, unit);
  const fmtDelta = (p, d) => {
    if (p.type === 'reps') return `+${d} rep${d === 1 ? '' : 's'}`;
    if (p.type === 'volume') return `+${Math.round(toDisplay(d, unit)).toLocaleString()} ${unitLabel(unit)}`;
    return `+${fmtWeight(d, unit)}`;
  };
  const open = (p) => navigate(`/exercises/${p.exerciseId}`);
  const dateOf = (p) => todayKey(new Date(p.achievedAt));

  // prs come newest-first, so walk oldest-first: the previous mark is the last
  // one seen for the same exercise and type.
  const lastSeen = {};
  const recs = [];
  for (let i = prs.length - 1; i >= 0; i--) {
    const p = prs[i];
    const key = `${p.exerciseId}:${p.type}`;
    const prev = lastSeen[key];
    lastSeen[key] = p;
    const dateKey = dateOf(p);
    const dateLabel = friendlyDate(dateKey);
    const mark = fmt(p);
    const delta = prev ? p.value - prev.value : null;
    recs[i] = {
      ...p,
      dateKey,
      dateLabel,
      mark,
      prevMark: prev ? fmt(prev) : null,
      delta: delta != null && delta > 0 ? fmtDelta(p, delta) : null,
      aria: `${p.exerciseName}, ${TYPE_LABEL[p.type] ?? p.type} ${mark}, ${dateLabel}${i === 0 ? ', newest record' : ''}. Open exercise`,
    };
  }

  const monthKey = todayKey(new Date()).slice(0, 7);
  const thisMonth = recs.filter((r) => r.dateKey.slice(0, 7) === monthKey).length;

  const rows = [];
  for (let i = 0; i < recs.length; i += 3) rows.push(recs.slice(i, i + 3));

  return (
    <div className={`rec-page ${live ? 'rec-live' : ''}`}>
      <header className="rec-head">
        <div className="rec-head__l">
          <BackButton fallback="/profile" className="" />
          <h1 className="rec-title">Hall of Records</h1>
        </div>
        {recs.length > 0 && (
          <span className="rec-count">
            {recs.length} plaque{recs.length === 1 ? '' : 's'}
          </span>
        )}
      </header>

      {recs.length === 0 ? (
        <EmptyState
          icon={Trophy}
          title="No records yet"
          body="Your first working set sets your first record — every one after that has something to beat."
          actionLabel="Start a workout"
          onAction={() => navigate('/workout')}
        />
      ) : (
        <>
          <section className="rec-rack" aria-label="A shrine rack of wooden plaques, one for each personal record">
            <svg className="rec-roof" viewBox="0 0 390 40" aria-hidden="true">
              <path d="M14 38 L 42 12 L 348 12 L 376 38 Z" fill="#2A1E15" />
              <path d="M30 12 L 360 12" style={{ stroke: '#3A2A1E', strokeWidth: 3, strokeLinecap: 'round' }} />
              <path d="M14 38 L 376 38" style={{ stroke: '#1A120D', strokeWidth: 2 }} />
            </svg>
            {rows.map((row) => (
              <div className="rec-row" key={row[0].id}>
                <div className="rec-beam" aria-hidden="true" />
                <div className="rec-cells">
                  {row.map((r) => (
                    <div className="rec-cell" key={r.id}>
                      <svg className="rec-cord" viewBox="0 0 120 26" aria-hidden="true">
                        <path d="M50 0 L 60 26 L 70 0" />
                      </svg>
                      <Plaque rec={r} isNewest={r === recs[0]} onOpen={open} />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </section>

          <SectionLabel as="h2" meta={`${thisMonth} this month`}>
            The ledger
          </SectionLabel>
          <div className="rec-ledger">
            {recs.map((r, i) => (
              <button type="button" key={r.id} className="rec-row-l" onClick={() => open(r)} aria-label={r.aria}>
                <span className={`rec-row-l__date ${r.dateLabel === 'Today' ? 'rec-row-l__date--new' : ''}`}>{r.dateLabel}</span>
                <span className="rec-row-l__name">
                  <span aria-hidden="true">{formKanji(r.exerciseName)} </span>
                  {r.exerciseName}
                </span>
                <span className="rec-row-l__mark">{r.mark}</span>
                <span className={`rec-row-l__delta ${i === 0 ? 'rec-row-l__delta--new' : ''}`}>{r.delta ?? TYPE_SHORT[r.type]}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
