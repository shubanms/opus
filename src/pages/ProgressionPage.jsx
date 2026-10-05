import { Check, Lock, Star, Swords } from 'lucide-react';
import { useRPG } from '../hooks/useRPG.js';
import { useEffectiveXp } from '../hooks/useEffectiveXp.js';
import useSettingsStore from '../store/settingsStore.js';
import BackButton from '../components/layout/BackButton.jsx';
import { RANKS, prestigeXp, roman, PRESTIGE_STEP } from '../utils/rpg.js';
import { bossDesc, bossList } from '../utils/bosses.js';

function Rung({ reached, current, banked, left, right, sub }) {
  return (
    <div
      className="flex items-center gap-3 rounded-xl px-4 py-3"
      style={{
        background: current ? 'var(--color-gold)' : 'var(--color-chalk)',
        border: current ? 'none' : `1px ${banked ? 'dashed' : 'solid'} ${banked ? 'var(--color-gold)' : 'var(--color-ivory)'}`,
        opacity: reached || current || banked ? 1 : 0.7,
      }}
    >
      <div
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
        style={{ background: current ? 'var(--color-obsidian)' : reached ? 'var(--color-gold)' : 'var(--color-ivory)' }}
      >
        {reached && !current
          ? <Check size={15} style={{ color: 'var(--color-obsidian)' }} strokeWidth={3} />
          : current
            ? <Star size={15} fill="var(--color-gold)" style={{ color: 'var(--color-gold)' }} />
            : <Lock size={13} style={{ color: banked ? 'var(--color-gold)' : 'var(--color-ash)' }} />}
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
  const { profile } = useRPG();
  const unit = useSettingsStore((s) => s.unit);
  // The same answer Home and Profile give: shield-aware XP, and the level a
  // boss gate actually lets you hold. This page computed its own from raw XP,
  // so a player sealed at 20 read "You are Iron Will" (a level 21–25 rank)
  // here and "Grinder" everywhere else.
  const { effectiveXp, level, rawLevel, sealed, prestige, title, boss, bossStats, ready } = useEffectiveXp(profile);
  const bosses = bossList(bossStats);
  const banked = rawLevel - level;
  const tiers = [1, 2, 3, 4, 5];

  // This page is about the gates, so it waits for them rather than briefly
  // showing a sealed player the level the gate is holding back.
  if (!profile || !ready) return null;

  return (
    <div className="px-5 pb-8 pt-8">
      <BackButton fallback="/profile" className="mb-3" />

      <h1 className="font-display text-4xl font-bold leading-none" style={{ color: 'var(--color-text-primary)' }}>
        Progression
      </h1>
      <p className="mt-1 font-sans text-sm" style={{ color: 'var(--color-text-secondary)' }}>
        You are <span style={{ color: 'var(--color-gold)' }}>{title}</span> · {effectiveXp.toLocaleString()} XP
      </p>
      {/* Sealed, said plainly: which level you hold, what is holding it, and
          what is waiting behind the gate. */}
      {sealed && boss ? (
        <p className="mt-2 flex items-start gap-2 rounded-xl px-3 py-2 font-sans text-xs" style={{ background: 'var(--accent-wash)', color: 'var(--color-text-primary)' }}>
          <Swords size={14} className="mt-px shrink-0" style={{ color: 'var(--color-gold)' }} />
          <span>
            Level {level} · sealed by <strong>{boss.title}</strong> · {banked} level{banked === 1 ? '' : 's'} banked.
            {' '}{bossDesc(boss, unit)} to break the seal.
          </span>
        </p>
      ) : (
        <p className="mt-0.5 font-sans text-xs" style={{ color: 'var(--color-text-secondary)' }}>
          Level {level}{prestige > 0 ? ` · Prestige ${prestige}` : ''}
        </p>
      )}

      <h2 className="mb-2 mt-5 font-sans text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--color-text-secondary)' }}>
        Ranks
      </h2>
      <div className="flex flex-col gap-2">
        {RANKS.map((r, i) => {
          const bandEnd = i < RANKS.length - 1 ? RANKS[i + 1].level - 1 : 50;
          const reached = level >= r.level || prestige > 0;
          // Earned on XP, held back by the gate.
          const isBanked = !reached && rawLevel >= r.level;
          return (
            <Rung
              key={r.level}
              reached={reached}
              current={level >= r.level && level <= bandEnd && prestige === 0}
              banked={isBanked}
              left={r.title}
              sub={isBanked ? `Levels ${r.level}–${bandEnd} · XP banked behind ${boss?.title ?? 'a boss gate'}` : `Levels ${r.level}–${bandEnd}`}
              right={r.xp === 0 ? 'Start' : `${r.xp.toLocaleString()} XP`}
            />
          );
        })}
      </div>

      <h2 className="mb-2 mt-6 font-sans text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--color-text-secondary)' }}>
        Boss gates
      </h2>
      <p className="mb-2 font-sans text-xs" style={{ color: 'var(--color-text-secondary)' }}>
        Each milestone level is sealed until you clear its challenge — XP alone won't pass it.
      </p>
      <div className="flex flex-col gap-2">
        {bosses.map((b) => (
          <Rung
            key={b.key}
            reached={b.cleared}
            current={!b.cleared && boss?.key === b.key}
            left={b.title}
            sub={`Level ${b.gate} · ${bossDesc(b, unit)}`}
            right={b.cleared ? 'Cleared' : boss?.key === b.key ? 'Blocking' : 'Locked'}
          />
        ))}
      </div>

      <h2 className="mb-2 mt-6 font-sans text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--color-text-secondary)' }}>
        Prestige
      </h2>
      <p className="mb-2 font-sans text-xs" style={{ color: 'var(--color-text-secondary)' }}>
        Beyond level 50, every {PRESTIGE_STEP.toLocaleString()} XP earns a prestige tier.
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
