import PageWrapper from '../components/layout/PageWrapper.jsx';
import WorkoutCard from '../components/workout/WorkoutCard.jsx';
import { useWorkouts } from '../hooks/useWorkout.js';
import { monthLabel } from '../utils/dateKey.js';
import { fmtVolume } from '../utils/units.js';
import useSettingsStore from '../store/settingsStore.js';

// Past sessions, grouped by month.
//
// An ungrouped list of identical cards gives you nothing to navigate by: after
// a few months of training, scrolling it is guesswork. Each month heading also
// carries its own totals, so scrolling back through the year answers "how did
// that month go?" without opening anything.

export default function HistoryPage() {
  const workouts = useWorkouts();
  const unit = useSettingsStore((s) => s.unit);

  if (workouts.length === 0) {
    return (
      <PageWrapper title="History" subtitle="Past workouts">
        <div className="mt-20 text-center">
          <p className="font-display text-3xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
            No workouts yet
          </p>
          <p className="mt-2 font-sans text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            Complete your first session to see it here
          </p>
        </div>
      </PageWrapper>
    );
  }

  // `useWorkouts` already returns newest-first, so months come out in order.
  const months = [];
  const byMonth = {};
  for (const w of workouts) {
    const key = (w.date ?? '').slice(0, 7);
    if (!byMonth[key]) {
      byMonth[key] = { key, label: monthLabel(w.date), items: [], volume: 0 };
      months.push(byMonth[key]);
    }
    byMonth[key].items.push(w);
    byMonth[key].volume += w.totalVolume ?? 0;
  }

  return (
    <PageWrapper title="History" subtitle={`${workouts.length} session${workouts.length === 1 ? '' : 's'} logged`}>
      <div className="pb-6">
        {months.map((mo) => (
          <div key={mo.key} className="mb-5">
            <div className="mb-2 flex items-baseline justify-between">
              <h2
                className="font-sans text-xs font-semibold uppercase tracking-widest"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                {mo.label}
              </h2>
              <span className="font-mono text-[11px]" style={{ color: 'var(--color-ash)' }}>
                {mo.items.length} session{mo.items.length === 1 ? '' : 's'} · {fmtVolume(mo.volume, unit)}
              </span>
            </div>
            {mo.items.map((w) => (
              <WorkoutCard key={w.id} workout={w} />
            ))}
          </div>
        ))}
      </div>
    </PageWrapper>
  );
}
