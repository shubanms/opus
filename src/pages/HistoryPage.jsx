import { useDeferredValue, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dumbbell, Search, SearchX, X } from 'lucide-react';
import BackButton from '../components/layout/BackButton.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';
import JournalSlip from '../components/history/JournalSlip.jsx';
import { Chip, InkButton, SectionLabel } from '../components/ink/index.js';
import useInkMotion from '../components/ink/useInkMotion.js';
import { m, TWEEN } from '../motion/index.jsx';
import { useHistoryIndex, useWorkoutList } from '../hooks/useWorkout.js';
import { useAllPRs } from '../hooks/useProgress.js';
import { filterHistory, groupByMonth, historyTags } from '../utils/historySearch.js';
import { fmtVolume } from '../utils/units.js';
import useSettingsStore from '../store/settingsStore.js';
import '../styles/ink-journal.css';

// The Journal: past sessions as paper slips on a timeline, grouped by month,
// searchable. Each month heading carries its own totals over whatever is
// showing, so a filtered month says what *those* sessions added up to. Search
// reads what people remember: the session's name, its note, its tags, and the
// lifts in it. A vermilion seal sits on a slip only if a record fell in it.

const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

function Header({ count }) {
  return (
    <header className="jr-head">
      <div className="jr-head__l">
        <BackButton fallback="/home" label="" className="" />
        <h1 className="jr-title">Journal</h1>
      </div>
      {count ? <span className="jr-count">{count}</span> : null}
    </header>
  );
}

// Shown while the list loads, so people with months of history never see
// "No workouts yet" for a moment.
function Skeleton() {
  const motionOn = useInkMotion();
  return (
    <div aria-busy="true" aria-label="Loading history">
      <div className="jr-skel jr-skel--search" />
      {[0, 1, 2, 3].map((i) => (
        <m.div
          key={i}
          className="jr-skel"
          initial={{ opacity: 0.4 }}
          animate={motionOn ? { opacity: [0.4, 0.8, 0.4] } : { opacity: 0.6 }}
          transition={motionOn ? { duration: 1.4, repeat: Number.POSITIVE_INFINITY, delay: i * 0.12 } : TWEEN.standard}
        />
      ))}
    </div>
  );
}

export default function HistoryPage() {
  const { workouts, loading } = useWorkoutList();
  const navigate = useNavigate();
  const unit = useSettingsStore((s) => s.unit);
  const [query, setQuery] = useState('');
  const [tag, setTag] = useState(null);
  // Typing stays responsive on a long history; the list catches up a beat later.
  const deferredQuery = useDeferredValue(query);
  const searching = deferredQuery.trim().length > 0;
  const index = useHistoryIndex(searching);
  const allPRs = useAllPRs();
  const withRecord = useMemo(() => new Set(allPRs.map((p) => p.workoutId).filter((id) => id != null)), [allPRs]);

  const tags = useMemo(() => historyTags(workouts), [workouts]);
  const shown = useMemo(
    () => filterHistory(workouts, { query: deferredQuery, tag }, index),
    [workouts, deferredQuery, tag, index]
  );
  const months = useMemo(() => groupByMonth(shown), [shown]);
  const filtering = searching || tag != null;

  if (loading) {
    return (
      <div className="jr-page">
        <Header />
        <Skeleton />
      </div>
    );
  }

  if (workouts.length === 0) {
    return (
      <div className="jr-page">
        <Header />
        <EmptyState
          icon={Dumbbell}
          title="No workouts yet"
          body="Every session you finish lands here, with its sets, volume and records."
          actionLabel="Start a workout"
          onAction={() => navigate('/workout')}
        />
      </div>
    );
  }

  const count = filtering ? `${shown.length} of ${plural(workouts.length, 'session')}` : `${plural(workouts.length, 'session')} logged`;

  return (
    <div className="jr-page">
      <Header count={count} />

      <div className="jr-search">
        <Search size={15} aria-hidden />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search sessions, lifts, notes"
          aria-label="Search history"
          enterKeyHint="search"
          // Chrome adds its own clear button; ours is sized for a thumb.
          className="jr-search__input [&::-webkit-search-cancel-button]:hidden"
        />
        {query && (
          <button type="button" onClick={() => setQuery('')} aria-label="Clear search" className="jr-search__clear">
            <X size={15} />
          </button>
        )}
      </div>

      {tags.length > 0 && (
        <div className="jr-tags scrollbar-hide">
          {tags.map((t) => (
            <Chip key={t} selected={tag === t} onClick={() => setTag(tag === t ? null : t)}>
              {t}
            </Chip>
          ))}
        </div>
      )}

      {months.length === 0 ? (
        <m.div className="jr-none" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={TWEEN.enter}>
          <SearchX size={26} aria-hidden />
          <p className="jr-none__t">No sessions match</p>
          <p className="jr-none__b">
            {searching ? `Nothing with “${deferredQuery.trim()}”` : 'Nothing with that tag'}
            {searching && tag ? ` tagged ${tag}` : ''}.
          </p>
          <InkButton
            variant="secondary"
            onClick={() => {
              setQuery('');
              setTag(null);
            }}
          >
            Show all sessions
          </InkButton>
        </m.div>
      ) : (
        months.map((mo) => (
          <section key={mo.key} className="jr-month" aria-label={mo.label}>
            <SectionLabel as="h2" rule meta={`${plural(mo.items.length, 'session')} · ${fmtVolume(mo.volume, unit)}`}>
              {mo.label}
            </SectionLabel>
            <div className="jr-line">
              {mo.items.map((w) => (
                <JournalSlip key={w.id} workout={w} hasRecord={withRecord.has(w.id)} />
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}
