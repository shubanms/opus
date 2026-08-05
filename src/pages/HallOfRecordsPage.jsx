import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Trophy } from 'lucide-react';
import { useAllPRs } from '../hooks/useProgress.js';
import useSettingsStore from '../store/settingsStore.js';
import { toDisplay, unitLabel } from '../utils/units.js';
import { friendlyDate, todayKey } from '../utils/dateKey.js';
import { m, itemVariants, listVariants } from '../motion/index.jsx';

// Every record, newest first.
//
// The screen is called a hall, so the newest record is displayed rather than
// listed: it is the thing you came to look at. The rest are a ledger beneath
// it, grouped by the day they were set — the day headings used to print the
// raw storage key ("2026-08-05"), which is a format, not a date you read.

const TYPE_LABEL = { weight: 'Heaviest weight', reps: 'Most reps', volume: 'Best volume' };

export default function HallOfRecordsPage() {
  const navigate = useNavigate();
  const prs = useAllPRs();
  const unit = useSettingsStore((s) => s.unit);
  const u = unitLabel(unit);

  const fmt = (p) =>
    p.type === 'reps'
      ? `${p.value} reps`
      : `${Math.round(toDisplay(p.value, unit)).toLocaleString()} ${u}`;
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
      <button onClick={() => navigate(-1)} className="mb-5 flex items-center gap-2">
        <ArrowLeft size={18} style={{ color: 'var(--color-text-secondary)' }} />
        <span className="font-sans text-sm" style={{ color: 'var(--color-text-secondary)' }}>Back</span>
      </button>

      <h1 className="font-display text-4xl font-bold leading-none" style={{ color: 'var(--color-text-primary)' }}>
        Hall of Records
      </h1>
      <p className="mt-1 font-sans text-sm" style={{ color: 'var(--color-text-secondary)' }}>
        {prs.length > 0
          ? `${prs.length} record${prs.length === 1 ? '' : 's'} set, newest first.`
          : "Every personal record you've set, newest first."}
      </p>

      {!latest ? (
        <div className="mt-12 text-center">
          <Trophy size={32} style={{ color: 'var(--color-ash)' }} className="mx-auto" />
          <p className="mt-3 font-sans text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            No records yet. Log a working set to start your legacy.
          </p>
        </div>
      ) : (
        <>
          {/* The most recent record, displayed rather than listed. */}
          <m.div
            className="glass mt-6 rounded-2xl px-5 py-5"
            style={{ background: 'var(--accent-wash)', border: '1px solid var(--color-gold)' }}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
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
            <p className="mt-2 font-sans text-xs" style={{ color: 'var(--color-text-secondary)' }}>
              {TYPE_LABEL[latest.type] ?? latest.type} · {friendlyDate(dateOf(latest))}
            </p>
          </m.div>

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
                    <m.div
                      key={p.id}
                      variants={itemVariants}
                      className="flex items-center gap-3 rounded-xl px-3 py-2.5"
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
                      <span className="font-mono text-sm font-semibold" style={{ color: 'var(--color-gold)' }}>
                        {fmt(p)}
                      </span>
                    </m.div>
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
