import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Target, ChevronDown } from 'lucide-react';
import { useWeeklyMuscleSets } from '../../hooks/useProgress.js';
import {
  MUSCLE_LABEL,
  STATUS,
  balanceMessage,
  pushPullBalance,
  weeklyBreakdown,
} from '../../utils/muscleTargets.js';
import { m, itemVariants, listVariants } from '../../motion/index.jsx';
import EmptyState from '../ui/EmptyState.jsx';

// This week's working sets per muscle, against a target.
//
// The app counted every set and never told anyone what the count meant. Total
// volume cannot answer "am I doing enough back work?" — that question is always
// per-muscle and always about this week.
//
// Collapsed by default to the ones that need attention: fifteen bars is a wall,
// and the useful signal is the short list of what you have neglected.

const COLOR = {
  [STATUS.LOW]: 'var(--color-ember)',
  [STATUS.ON_TRACK]: 'var(--color-sage)',
  [STATUS.OVER]: 'var(--color-gold)',
};

function Row({ row }) {
  const pct = Math.min(100, Math.round(row.ratio * 100));
  return (
    <m.div variants={itemVariants} className="flex items-center gap-3">
      <span
        className="w-20 shrink-0 truncate font-sans text-xs"
        style={{ color: 'var(--color-text-secondary)' }}
      >
        {MUSCLE_LABEL[row.muscle] ?? row.muscle}
      </span>
      <div className="h-2 flex-1 overflow-hidden rounded-full" style={{ background: 'var(--color-ivory)' }}>
        <m.div
          className="h-full rounded-full"
          style={{ background: COLOR[row.state] }}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>
      <span
        className="w-12 shrink-0 text-right font-mono text-[11px]"
        style={{ color: row.state === STATUS.LOW ? 'var(--color-ember)' : 'var(--color-ash)' }}
      >
        {row.sets}/{row.target}
      </span>
    </m.div>
  );
}

export default function WeeklyMuscleTargets() {
  const byMuscle = useWeeklyMuscleSets();
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(false);

  const rows = weeklyBreakdown(byMuscle);
  const trained = rows.filter((r) => r.sets > 0);
  const balance = pushPullBalance(byMuscle);
  const message = balanceMessage(balance);

  if (!trained.length) {
    return (
      <EmptyState
        icon={Target}
        title="Nothing logged this week"
        body="Targets appear once you train — they show which muscles you've covered and which you've missed."
        actionLabel="Start a workout"
        onAction={() => navigate('/workout')}
      />
    );
  }

  // Trained muscles plus the neglected ones, because the gap is the point.
  const shown = expanded ? rows : [...trained.slice(0, 5), ...rows.filter((r) => r.sets === 0).slice(0, 3)];

  return (
    <div>
      {message && (
        <div
          className="mb-3 flex items-start gap-2 rounded-xl px-3 py-2"
          style={{
            background: balance.verdict === 'balanced' ? 'var(--color-ivory)' : 'var(--accent-wash)',
          }}
        >
          <Target
            size={13}
            className="mt-0.5 shrink-0"
            style={{ color: balance.verdict === 'balanced' ? 'var(--color-sage)' : 'var(--color-gold)' }}
          />
          <p className="font-sans text-xs" style={{ color: 'var(--color-text-secondary)' }}>
            {message}
          </p>
        </div>
      )}

      <m.div className="flex flex-col gap-2" variants={listVariants} initial="initial" animate="animate">
        {shown.map((row) => (
          <Row key={row.muscle} row={row} />
        ))}
      </m.div>

      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="mt-3 flex w-full items-center justify-center gap-1 font-sans text-xs"
        style={{ color: 'var(--color-text-secondary)' }}
      >
        {expanded ? 'Show less' : `All ${rows.length} muscles`}
        <ChevronDown
          size={13}
          style={{ transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 200ms' }}
        />
      </button>
    </div>
  );
}
