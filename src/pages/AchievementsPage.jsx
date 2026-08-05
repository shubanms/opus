import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Award, Lock, HelpCircle } from 'lucide-react';
import { useAchievements } from '../hooks/useAchievements.js';
import { compactNumber } from '../utils/chartMath.js';
import { m, itemVariants, listVariants } from '../motion/index.jsx';

// The achievement wall.
//
// It used to be nineteen near-identical rows where the only difference between
// earned and unearned was the colour of a badge — and, worse, a locked one told
// you the target ("Complete 50 workouts") but never how far along you were,
// even though the app already computes that number. Now the locked ones carry
// a bar, unlocked ones are grouped and lit, and the header is a real gauge.

function Ring({ count, total }) {
  const ratio = total > 0 ? count / total : 0;
  const R = 26;
  const C = 2 * Math.PI * R;

  return (
    <div className="relative flex h-16 w-16 shrink-0 items-center justify-center">
      <svg width={64} height={64} style={{ transform: 'rotate(-90deg)' }} aria-hidden="true">
        <circle cx={32} cy={32} r={R} fill="none" stroke="var(--color-ash)" strokeOpacity={0.2} strokeWidth={5} />
        <m.circle
          cx={32}
          cy={32}
          r={R}
          fill="none"
          stroke="var(--color-gold)"
          strokeWidth={5}
          strokeLinecap="round"
          strokeDasharray={C}
          initial={{ strokeDashoffset: C }}
          animate={{ strokeDashoffset: C * (1 - ratio) }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        />
      </svg>
      <span
        className="absolute font-mono text-sm font-semibold"
        style={{ color: 'var(--color-text-primary)' }}
      >
        {count}
      </span>
    </div>
  );
}

function Row({ item }) {
  const secret = item.hidden && !item.unlocked;
  const p = item.progress;
  // A bar at 0% is noise on something you have not started; the description
  // already says what it wants.
  const showBar = !item.unlocked && !secret && p && p.current > 0;

  return (
    <m.div
      variants={itemVariants}
      className="glass flex items-center gap-3 rounded-2xl px-3.5 py-3"
      style={{
        background: item.unlocked ? 'var(--accent-wash)' : 'var(--color-chalk)',
        border: `1px solid ${item.unlocked ? 'var(--color-gold)' : 'var(--color-ivory)'}`,
      }}
    >
      <div
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full"
        style={{ background: item.unlocked ? 'var(--grad-accent)' : 'var(--color-ivory)' }}
      >
        {item.unlocked ? (
          <Award size={20} style={{ color: 'var(--color-obsidian)' }} />
        ) : secret ? (
          <HelpCircle size={18} style={{ color: 'var(--color-ash)' }} />
        ) : (
          <Lock size={16} style={{ color: 'var(--color-ash)' }} />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="font-sans text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
          {secret ? 'Hidden achievement' : item.title}
        </p>
        <p className="font-sans text-xs" style={{ color: 'var(--color-text-secondary)' }}>
          {secret ? 'Keep training to reveal this one.' : item.desc}
        </p>

        {showBar && (
          <div className="mt-2 flex items-center gap-2">
            <div
              className="h-1.5 flex-1 overflow-hidden rounded-full"
              style={{ background: 'var(--color-ivory)' }}
            >
              <m.div
                className="h-full rounded-full"
                style={{ background: 'var(--grad-accent)' }}
                initial={{ width: 0 }}
                animate={{ width: `${Math.round(p.ratio * 100)}%` }}
                transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
              />
            </div>
            <span className="font-mono text-[10px]" style={{ color: 'var(--color-ash)' }}>
              {compactNumber(p.current)}/{compactNumber(p.target)}
            </span>
          </div>
        )}
      </div>

      {item.xp > 0 && (
        <span
          className="font-mono text-xs"
          style={{ color: item.unlocked ? 'var(--color-gold)' : 'var(--color-ash)' }}
        >
          +{item.xp}
        </span>
      )}
    </m.div>
  );
}

export default function AchievementsPage() {
  const navigate = useNavigate();
  const { items, count, total } = useAchievements();

  const earned = items.filter((i) => i.unlocked);
  // Closest-first, so the top of the locked list is what you might actually get
  // next rather than whatever happened to be declared first.
  const locked = items
    .filter((i) => !i.unlocked)
    .sort((a, b) => (b.progress?.ratio ?? -1) - (a.progress?.ratio ?? -1));
  const xpEarned = earned.reduce((sum, i) => sum + (i.xp || 0), 0);

  return (
    <div className="px-5 pb-8 pt-8">
      <button onClick={() => navigate(-1)} className="mb-5 flex items-center gap-2">
        <ArrowLeft size={18} style={{ color: 'var(--color-text-secondary)' }} />
        <span className="font-sans text-sm" style={{ color: 'var(--color-text-secondary)' }}>
          Back
        </span>
      </button>

      <h1
        className="font-display text-4xl font-bold leading-none"
        style={{ color: 'var(--color-text-primary)' }}
      >
        Achievements
      </h1>

      <div
        className="glass mt-5 flex items-center gap-4 rounded-2xl px-4 py-3"
        style={{ background: 'var(--color-chalk)', border: '1px solid var(--color-ivory)' }}
      >
        <Ring count={count} total={total} />
        <div>
          <p className="font-sans text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
            {count} of {total} unlocked
          </p>
          <p className="font-sans text-xs" style={{ color: 'var(--color-text-secondary)' }}>
            {xpEarned > 0 ? `${xpEarned.toLocaleString()} XP earned from badges` : 'Your first badge is one workout away'}
          </p>
        </div>
      </div>

      {earned.length > 0 && (
        <>
          <h2
            className="mb-2 mt-6 font-sans text-xs font-semibold uppercase tracking-widest"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            Earned
          </h2>
          <m.div className="flex flex-col gap-2" variants={listVariants} initial="initial" animate="animate">
            {earned.map((it) => (
              <Row key={it.key} item={it} />
            ))}
          </m.div>
        </>
      )}

      {locked.length > 0 && (
        <>
          <h2
            className="mb-2 mt-6 font-sans text-xs font-semibold uppercase tracking-widest"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            In progress
          </h2>
          <m.div className="flex flex-col gap-2" variants={listVariants} initial="initial" animate="animate">
            {locked.map((it) => (
              <Row key={it.key} item={it} />
            ))}
          </m.div>
        </>
      )}
    </div>
  );
}
