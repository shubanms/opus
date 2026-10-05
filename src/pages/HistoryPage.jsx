import { useDeferredValue, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dumbbell, Search, SearchX, X } from 'lucide-react';
import PageWrapper from '../components/layout/PageWrapper.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';
import WorkoutCard from '../components/workout/WorkoutCard.jsx';
import { m, TWEEN, useReducedMotion } from '../motion/index.jsx';
import { useHistoryIndex, useWorkoutList } from '../hooks/useWorkout.js';
import { filterHistory, groupByMonth, historyTags } from '../utils/historySearch.js';
import { fmtVolume } from '../utils/units.js';
import useSettingsStore from '../store/settingsStore.js';

// Past sessions, grouped by month, searchable.
//
// An ungrouped list of identical cards gives you nothing to navigate by: after
// a few months of training, scrolling it is guesswork. Each month heading
// carries its own totals — over whatever is showing, so a filtered month says
// what *those* sessions added up to. Search reads what people remember: the
// session's name, its note, its tags, and the lifts in it.

const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

// Shown while the list loads. The page used to render "No workouts yet" for
// that first moment on every visit — to people with months of history.
function Skeleton() {
  const effects = useSettingsStore((s) => s.effects);
  const still = useReducedMotion() || !effects;
  return (
    <div aria-busy="true" aria-label="Loading history" className="pb-6">
      <div className="mb-3 h-11 rounded-2xl" style={{ background: 'var(--color-ivory)' }} />
      {[0, 1, 2, 3].map((i) => (
        <m.div
          key={i}
          className="mb-2 rounded-2xl px-4 py-3"
          style={{ background: 'var(--color-chalk)', border: '1px solid var(--color-ivory)' }}
          initial={{ opacity: 0.55 }}
          animate={still ? { opacity: 0.8 } : { opacity: [0.55, 0.95, 0.55] }}
          transition={still ? TWEEN.standard : { duration: 1.4, repeat: Number.POSITIVE_INFINITY, delay: i * 0.12 }}
        >
          <div className="mb-2.5 h-4 w-1/3 rounded-md" style={{ background: 'var(--color-ivory)' }} />
          <div className="h-3 w-2/3 rounded-md" style={{ background: 'var(--color-ivory)' }} />
        </m.div>
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

  const tags = useMemo(() => historyTags(workouts), [workouts]);
  const shown = useMemo(
    () => filterHistory(workouts, { query: deferredQuery, tag }, index),
    [workouts, deferredQuery, tag, index]
  );
  const months = useMemo(() => groupByMonth(shown), [shown]);
  const filtering = searching || tag != null;

  if (loading) {
    return (
      <PageWrapper title="History" subtitle="Past workouts">
        <Skeleton />
      </PageWrapper>
    );
  }

  if (workouts.length === 0) {
    return (
      <PageWrapper title="History" subtitle="Past workouts">
        <EmptyState
          icon={Dumbbell}
          title="No workouts yet"
          body="Every session you finish lands here, with its sets, volume and records."
          actionLabel="Start a workout"
          onAction={() => navigate('/workout')}
        />
      </PageWrapper>
    );
  }

  const subtitle = filtering
    ? `${shown.length} of ${plural(workouts.length, 'session')}`
    : `${plural(workouts.length, 'session')} logged`;

  return (
    <PageWrapper title="History" subtitle={subtitle}>
      <div className="pb-6">
        <div className="mb-3 flex items-center gap-2 rounded-2xl px-3.5" style={{ background: 'var(--color-ivory)' }}>
          <Search size={15} style={{ color: 'var(--color-ash)' }} />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search sessions, lifts, notes"
            aria-label="Search history"
            enterKeyHint="search"
            // Chrome adds its own clear button to a search field; ours is the
            // one sized for a thumb, so the native one is hidden.
            className="min-w-0 flex-1 bg-transparent py-3 font-sans text-sm outline-none [&::-webkit-search-cancel-button]:hidden"
            style={{ color: 'var(--color-text-primary)' }}
          />
          {query && (
            <button type="button" onClick={() => setQuery('')} aria-label="Clear search" className="-mr-1.5 flex h-9 w-9 items-center justify-center">
              <X size={15} style={{ color: 'var(--color-ash)' }} />
            </button>
          )}
        </div>

        {tags.length > 0 && (
          <div className="-mx-5 mb-4 flex gap-1.5 overflow-x-auto px-5 pb-1 scrollbar-hide">
            {tags.map((t) => {
              const on = tag === t;
              return (
                <button
                  key={t}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setTag(on ? null : t)}
                  className="min-h-[34px] shrink-0 rounded-full px-3.5 font-sans text-xs font-medium"
                  style={{ background: on ? 'var(--color-gold)' : 'var(--color-ivory)', color: on ? 'var(--color-obsidian)' : 'var(--color-text-secondary)' }}
                >
                  {t}
                </button>
              );
            })}
          </div>
        )}

        {months.length === 0 ? (
          <m.div
            className="flex flex-col items-center px-6 py-10 text-center"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={TWEEN.enter}
          >
            <SearchX size={26} style={{ color: 'var(--color-ash)' }} />
            <p className="mt-3 font-display text-xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
              No sessions match
            </p>
            <p className="mt-1 max-w-xs font-sans text-sm" style={{ color: 'var(--color-text-secondary)' }}>
              {searching ? `Nothing with “${deferredQuery.trim()}”` : 'Nothing with that tag'}
              {searching && tag ? ` tagged ${tag}` : ''}.
            </p>
            <button
              type="button"
              onClick={() => { setQuery(''); setTag(null); }}
              className="mt-4 rounded-xl px-4 py-2.5 font-sans text-sm font-semibold"
              style={{ background: 'var(--color-ivory)', color: 'var(--color-text-primary)' }}
            >
              Show all sessions
            </button>
          </m.div>
        ) : (
          months.map((mo) => (
            <div key={mo.key} className="mb-5">
              <div className="mb-2 flex items-baseline justify-between">
                <h2
                  className="font-sans text-xs font-semibold uppercase tracking-widest"
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  {mo.label}
                </h2>
                <span className="font-mono text-[11px]" style={{ color: 'var(--color-ash)' }}>
                  {plural(mo.items.length, 'session')} · {fmtVolume(mo.volume, unit)}
                </span>
              </div>
              {mo.items.map((w) => (
                <WorkoutCard key={w.id} workout={w} />
              ))}
            </div>
          ))
        )}
      </div>
    </PageWrapper>
  );
}
