import { useNavigate } from 'react-router-dom';
import { ChevronRight, Trophy } from 'lucide-react';
import { useAllPRs } from '../hooks/useProgress.js';
import useSettingsStore from '../store/settingsStore.js';
import { fmtVolume, fmtWeight } from '../utils/units.js';
import { friendlyDate, todayKey } from '../utils/dateKey.js';
import { m, itemVariants, listVariants } from '../motion/index.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';
import BackButton from '../components/layout/BackButton.jsx';

// Every record, newest first.
//
// The screen is called a hall, so the newest record is displayed rather than
// listed: it is the thing you came to look at. The rest are a ledger beneath
// it, grouped by the day they were set — the day headings used to print the
// raw storage key ("2026-08-05"), which is a format, not a date you read.
//
// Every record opens its lift. Weights are shown exactly (fmtWeight): rounding
// them to whole numbers made a 102.5 kg record read "103 kg" here and 102.5 on
// Progress — the same record, two numbers. Only volume rounds.

const TYPE_LABEL = { weight: 'Heaviest weight', reps: 'Most reps', volume: 'Best volume' };

export default function HallOfRecordsPage() {
  const navigate = useNavigate();
  const prs = useAllPRs();
  const unit = useSettingsStore((s) => s.unit);

  const fmt = (p) =>
    p.type === 'reps' ? `${p.value} reps` : p.type === 'volume' ? fmtVolume(p.value, unit) : fmtWeight(p.value, unit);
  const open = (p) => navigate(`/exercises/${p.exerciseId}`);
  const dateOf = (p) => todayKey(new Date(p.achievedAt));

  const latest = prs[0] ?? null;

  // Group reverse-chronologically by date (prs already come newest-first). The
  // newest is skipped: it is displayed above, and the same record twice in a
  // row reads as a rendering fault rather than as emphasis.
  const groups = [];
  const byDate = {};
  for (const p of prs.slice(1)) {
    const d = dateOf(p);
    if (!byDate[d]) {
      byDate[d] = { date: d, items: [] };
      groups.push(byDate[d]);
    }
    byDate[d].items.push(p);
  }

  return (
    <div className="px-5 pb-8 pt-8">
      <BackButton fallback="/profile" className="mb-3" />

      <h1 className="font-display text-4xl font-bold leading-none" style={{ color: 'var(--color-text-primary)' }}>
        Hall of Records
      </h1>
      <p className="mt-1 font-sans text-sm" style={{ color: 'var(--color-text-secondary)' }}>
        {prs.length > 0
          ? `${prs.length} record${prs.length === 1 ? '' : 's'} set, newest first.`
          : "Every personal record you've set, newest first."}
      </p>

      {!latest ? (
        <EmptyState
          icon={Trophy}
          title="No records yet"
          body="Your first working set sets your first record — every one after that has something to beat."
          actionLabel="Start a workout"
          onAction={() => navigate('/workout')}
        />
      ) : (
        <>
          {/* The most recent record, displayed rather than listed. */}
          <m.button
            type="button"
            onClick={() => open(latest)}
            aria-label={`${latest.exerciseName}, ${TYPE_LABEL[latest.type] ?? latest.type} ${fmt(latest)}. Open exercise`}
            className="glass mt-6 block w-full rounded-2xl px-5 py-5 text-left"
            style={{ background: 'var(--accent-wash)', border: '1px solid var(--color-gold)' }}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            whileTap={{ scale: 0.98 }}
            transition={{ duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
          >
            <p
              className="font-sans text-[10px] font-semibold uppercase"
              style={{ color: 'var(--color-gold)', letterSpacing: '0.22em' }}
            >
              Latest record
            </p>
            <p className="mt-1.5 font-display text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
              {latest.exerciseName}
            </p>
            <div className="mt-2 flex items-baseline gap-2">
              <span
                className="font-display text-4xl font-bold leading-none"
                style={{
                  backgroundImage: 'var(--grad-accent)',
                  WebkitBackgroundClip: 'text',
                  backgroundClip: 'text',
                  color: 'transparent',
                }}
              >
                {fmt(latest)}
              </span>
            </div>
            <p className="mt-2 flex items-center gap-1 font-sans text-xs" style={{ color: 'var(--color-text-secondary)' }}>
              {TYPE_LABEL[latest.type] ?? latest.type} · {friendlyDate(dateOf(latest))}
              <ChevronRight size={13} className="ml-auto" style={{ color: 'var(--color-gold)' }} />
            </p>
          </m.button>

          <div className="mt-7 flex flex-col gap-5">
            {groups.map((g) => (
              <div key={g.date}>
                <p
                  className="mb-2 font-sans text-xs font-semibold uppercase tracking-widest"
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  {friendlyDate(g.date)}
                </p>
                <m.div
                  className="flex flex-col gap-1.5"
                  variants={listVariants}
                  initial="initial"
                  animate="animate"
                >
                  {g.items.map((p) => (
                    <m.button
                      type="button"
                      key={p.id}
                      variants={itemVariants}
                      onClick={() => open(p)}
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left"
                      style={{ background: 'var(--color-chalk)', border: '1px solid var(--color-ivory)' }}
                    >
                      <div
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
                        style={{ background: 'var(--grad-accent)' }}
                      >
                        <Trophy size={15} style={{ color: 'var(--color-obsidian)' }} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p
                          className="truncate font-sans text-sm font-medium"
                          style={{ color: 'var(--color-text-primary)' }}
                        >
                          {p.exerciseName}
                        </p>
                        <p className="font-sans text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                          {TYPE_LABEL[p.type] ?? p.type}
                        </p>
                      </div>
                      <span className="shrink-0 font-mono text-sm font-semibold" style={{ color: 'var(--color-gold)' }}>
                        {fmt(p)}
                      </span>
                      <ChevronRight size={15} className="shrink-0" style={{ color: 'var(--color-ash)' }} />
                    </m.button>
                  ))}
                </m.div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
