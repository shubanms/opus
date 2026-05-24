import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, Lock, Star } from 'lucide-react';
import { useRPG } from '../hooks/useRPG.js';
import { RANKS, getLevelFromTotalXP, getPrestige, prestigeXp, roman, getRankLabel } from '../utils/rpg.js';

function Rung({ reached, current, left, right, sub }) {
  return (
    <div
      className="flex items-center gap-3 rounded-xl px-4 py-3"
      style={{
        background: current ? 'var(--color-gold)' : 'var(--color-chalk)',
        border: current ? 'none' : '1px solid var(--color-ivory)',
        opacity: reached || current ? 1 : 0.7,
      }}
    >
      <div
        className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full"
        style={{ background: current ? 'var(--color-obsidian)' : reached ? 'var(--color-gold)' : 'var(--color-ivory)' }}
      >
        {reached && !current
          ? <Check size={15} style={{ color: 'var(--color-obsidian)' }} strokeWidth={3} />
          : current
            ? <Star size={15} fill="var(--color-gold)" style={{ color: 'var(--color-gold)' }} />
            : <Lock size={13} style={{ color: 'var(--color-ash)' }} />}
      </div>
      <div className="flex-1">
        <p className="font-sans text-sm font-semibold" style={{ color: current ? 'var(--color-obsidian)' : 'var(--color-text-primary)' }}>
          {left}
        </p>
        {sub && <p className="font-sans text-xs" style={{ color: current ? 'var(--color-obsidian)' : 'var(--color-text-secondary)' }}>{sub}</p>}
      </div>
      <span className="font-mono text-xs" style={{ color: current ? 'var(--color-obsidian)' : 'var(--color-text-secondary)' }}>
        {right}
      </span>
    </div>
  );
}

export default function ProgressionPage() {
  const navigate = useNavigate();
  const { profile } = useRPG();
  const totalXp = profile?.totalXp ?? 0;
  const level = getLevelFromTotalXP(totalXp);
  const prestige = getPrestige(totalXp);
  const tiers = [1, 2, 3, 4, 5];

  return (
    <div className="anim-fade-slide-up px-5 pb-8 pt-8">
      <button onClick={() => navigate(-1)} className="mb-5 flex items-center gap-2">
        <ArrowLeft size={18} style={{ color: 'var(--color-text-secondary)' }} />
        <span className="font-sans text-sm" style={{ color: 'var(--color-text-secondary)' }}>Back</span>
      </button>

      <h1 className="font-display text-4xl font-bold leading-none" style={{ color: 'var(--color-text-primary)' }}>
        Progression
      </h1>
      <p className="mt-1 mb-5 font-sans text-sm" style={{ color: 'var(--color-text-secondary)' }}>
        You are <span style={{ color: 'var(--color-gold)' }}>{getRankLabel(totalXp)}</span> · {totalXp.toLocaleString()} XP
      </p>

      <h2 className="mb-2 font-sans text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--color-text-secondary)' }}>
        Ranks
      </h2>
      <div className="flex flex-col gap-2">
        {RANKS.map((r) => (
          <Rung
            key={r.level}
            reached={totalXp >= r.xp}
            current={level === r.level && prestige === 0}
            left={r.title}
            sub={`Level ${r.level}`}
            right={r.xp === 0 ? 'Start' : `${r.xp.toLocaleString()} XP`}
          />
        ))}
      </div>

      <h2 className="mb-2 mt-6 font-sans text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--color-text-secondary)' }}>
        Prestige
      </h2>
      <p className="mb-2 font-sans text-xs" style={{ color: 'var(--color-text-secondary)' }}>
        Beyond Magnum Opus, every {(15000).toLocaleString()} XP earns a prestige tier.
      </p>
      <div className="flex flex-col gap-2">
        {tiers.map((t) => (
          <Rung
            key={t}
            reached={prestige > t}
            current={prestige === t}
            left={`Magnum Opus ${roman(t)}`}
            right={`${prestigeXp(t).toLocaleString()} XP`}
          />
        ))}
      </div>
    </div>
  );
}
