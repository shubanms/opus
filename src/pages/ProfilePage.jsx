import { lazy, Suspense, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useNavigate } from 'react-router-dom';
import { Settings, Dumbbell, Layers, Trophy, Flame, Clock, Zap, CalendarDays, ChevronRight, Sparkles, TrendingDown, Swords, Gem, Pencil } from 'lucide-react';
import { db } from '../db/db.js';
import VaultModal from '../components/rpg/VaultModal.jsx';
import { cosmeticById } from '../utils/economy.js';
import { useRPG, useCharacterStats } from '../hooks/useRPG.js';
import { useWorkouts } from '../hooks/useWorkout.js';
import { useCurrentBodyweight, useLifetimeStats } from '../hooks/useProgress.js';
import { useEffectiveXp } from '../hooks/useEffectiveXp.js';
import { useIronBalance } from '../hooks/useIronBalance.js';
import { useStreak } from '../hooks/useStreak.js';
import { fmtWeight, fmtVolume } from '../utils/units.js';
import { friendlyDate, todayKey } from '../utils/dateKey.js';
import { ageFromBirthYear } from '../utils/profileFields.js';
import { bossDesc } from '../utils/bosses.js';
import useSettingsStore from '../store/settingsStore.js';
import CharacterCard from '../components/rpg/CharacterCard.jsx';
import LevelBadge from '../components/rpg/LevelBadge.jsx';
import XPBar from '../components/rpg/XPBar.jsx';
import TrophyCase from '../components/rpg/TrophyCase.jsx';
import ShareButton from '../components/share/ShareButton.jsx';
import CountUp from '../components/fx/CountUp.jsx';

import MascotBoundary from '../components/mascot/MascotBoundary.jsx';
import { hasWebGL } from '../components/mascot/webgl.js';

const Companion = lazy(() => import('../components/mascot/Companion.jsx'));

function StatTile({ icon: Icon, value, label, accent, countTo }) {
  const effects = useSettingsStore((s) => s.effects);
  return (
    <div className="rounded-xl p-3" style={{ background: 'var(--color-chalk)', border: '1px solid var(--color-ivory)' }}>
      <Icon size={14} style={{ color: accent ?? 'var(--color-ash)' }} />
      <p className="mt-1 font-mono text-lg font-semibold" style={{ color: accent ?? 'var(--color-text-primary)' }}>
        {countTo != null && effects ? <CountUp value={countTo} /> : value}
      </p>
      <p className="font-sans text-xs" style={{ color: 'var(--color-text-secondary)' }}>{label}</p>
    </div>
  );
}

/** "today" / "yesterday" / "5 Aug" / "12 Mar 2025", for "Member since …". */
function sinceLabel(key) {
  const label = friendlyDate(key);
  return label === 'Today' || label === 'Yesterday' ? label.toLowerCase() : label;
}

export default function ProfilePage() {
  const navigate = useNavigate();
  const { profile, loaded } = useRPG();
  const workouts = useWorkouts();
  const charStats = useCharacterStats();
  const bodyweight = useCurrentBodyweight();
  const life = useLifetimeStats();
  const unit = useSettingsStore((s) => s.unit);
  const equipped = useSettingsStore((s) => s.equipped);
  const { balance: ironBal } = useIronBalance();
  // The first session on record. A restore lands in a fresh profile whose
  // join date is the day of the restore, which would make a three-year
  // history read "Member since today".
  const firstSession = useLiveQuery(() => db.workouts.orderBy('date').first().then((w) => w?.date ?? null), []);
  const [vaultOpen, setVaultOpen] = useState(false);
  // Above the early return: hooks cannot live behind a conditional, and this
  // page returns null until the profile loads.
  const streak = useStreak();
  // Level, title and XP exactly as Home shows them: with the rest-token shield
  // and the boss-gate cap applied. This page used to compute its own without
  // the shield, and the card below without either — three answers on one
  // screen for a sealed player.
  const xp = useEffectiveXp(profile);

  if (!loaded || !profile) return null;

  const flair = equipped?.titleFlair ? cosmeticById(equipped.titleFlair)?.value : null;
  const totalXp = profile.totalXp ?? 0;
  const { effectiveXp, decaying, lost, level, rawLevel, sealed, prestige, title, boss } = xp;
  const banked = rawLevel - level;

  // One "best streak" for the whole app (achievements.computeStats): the larger
  // of the day and schedule definitions. It is never shown below the live
  // count — a best smaller than the streak you are on is a contradiction.
  const bestStreak = Math.max(xp.bossStats?.bestStreak ?? 0, streak.count);

  const age = ageFromBirthYear(profile.birthYear);
  const identity = [
    age ? `${age} yrs` : null,
    profile.sex || null,
    profile.height ? `${profile.height} cm` : null,
    bodyweight != null ? fmtWeight(bodyweight, unit) : null,
  ].filter(Boolean);

  const joined = profile.joinDate || todayKey();
  const since = firstSession && firstSession < joined ? firstSession : joined;

  const profileShareData = {
    name: profile.name,
    level,
    prestige,
    title,
    stats: charStats,
    workouts: workouts.length,
    streak: streak.count,
    totalXp,
  };

  const challengeShareData = {
    name: profile.name,
    level,
    title,
    workouts: life.workouts,
    volumeKg: life.totalVolume,
    bestStreak,
    unit,
  };

  return (
    <div className="px-5 pb-8 pt-8">
      {/* Identity + progression hero */}
      <div className="glass mb-4 rounded-2xl p-4" style={{ background: 'var(--color-chalk)', border: '1px solid var(--color-ivory)' }}>
        <div className="flex items-start justify-between gap-2">
          {/* Your name and details are yours to change from here — they were
              only editable by finding the right row in Settings. */}
          <button
            type="button"
            onClick={() => navigate('/settings#profile')}
            className="-m-1 min-w-0 rounded-xl p-1 text-left"
            aria-label="Edit your profile"
          >
            <h1 className="truncate font-display text-3xl font-bold leading-none" style={{ color: 'var(--color-text-primary)' }}>
              {flair ? `${flair} ` : ''}{profile.name || 'Profile'}
            </h1>
            <p className="mt-1.5 flex items-center gap-1.5 font-sans text-sm" style={{ color: 'var(--color-text-secondary)' }}>
              <span className="truncate">{identity.length ? identity.join('  ·  ') : 'Add your details'}</span>
              <Pencil size={12} className="shrink-0" style={{ color: 'var(--color-ash)' }} />
            </p>
          </button>
          <button
            type="button"
            onClick={() => navigate('/settings')}
            className="-mr-1 -mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-full"
            aria-label="Settings"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-full" style={{ background: 'var(--color-ivory)' }}>
              <Settings size={18} style={{ color: 'var(--color-text-secondary)' }} />
            </span>
          </button>
        </div>

        <div className="mt-4 flex items-center gap-2.5">
          <LevelBadge level={level} size="sm" prestige={prestige} />
          <div className="min-w-0 flex-1">
            <p className="truncate font-sans text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>{title}</p>
            <p className="font-sans text-xs" style={{ color: 'var(--color-text-secondary)' }}>
              Level {level}{prestige > 0 ? ` · Prestige ${prestige}` : ''}{sealed ? ' · sealed' : ''}
            </p>
          </div>
        </div>
        <div className="mt-3">
          <XPBar totalXp={effectiveXp} level={level} showLabel={false} />
        </div>
      </div>

      {/* Decoration must never cost the page: a WebGL context that can't be
          created, a model that fails to load, or the lazy chunk itself failing
          leaves Profile intact with no Magnus (components/mascot). */}
      {hasWebGL() && (
        <MascotBoundary>
          <Suspense fallback={<div style={{ height: 150 }} />}>
            <Companion autoGreet={false} />
          </Suspense>
        </MascotBoundary>
      )}

      <CharacterCard profile={profile} />

      {decaying && (
        <div className="mt-2 flex items-center gap-2 rounded-xl px-4 py-2.5" style={{ background: 'var(--color-chalk)', border: '1px solid var(--color-ember)' }}>
          <TrendingDown size={15} style={{ color: 'var(--color-ember)' }} />
          <span className="font-sans text-xs" style={{ color: 'var(--color-text-secondary)' }}>
            Rank slipping from inactivity — <span style={{ color: 'var(--color-text-primary)' }}>−{lost.toLocaleString()} XP</span>. Train to recover it.
          </span>
        </div>
      )}

      {boss && (
        <button
          type="button"
          onClick={() => navigate('/progression')}
          className="mt-2 w-full rounded-xl px-4 py-3 text-left"
          style={{ background: 'var(--color-obsidian)', border: '1px solid var(--color-gold)' }}
        >
          <div className="flex items-center gap-2">
            <Swords size={14} style={{ color: 'var(--color-gold)' }} />
            <span className="font-sans text-[11px] font-semibold uppercase tracking-widest" style={{ color: 'var(--color-gold)' }}>
              Boss gate · Level {boss.gate}
            </span>
          </div>
          <p className="mt-1 font-sans text-sm" style={{ color: 'var(--color-text-inverse)' }}>
            <span className="font-semibold">{boss.title}</span> — {bossDesc(boss, unit)} to advance past level {boss.gate}.
          </p>
          {banked > 0 && (
            <p className="mt-1 font-sans text-xs" style={{ color: 'var(--color-ash)' }}>
              {banked} level{banked === 1 ? '' : 's'} banked — they land the moment it falls.
            </p>
          )}
        </button>
      )}

      <div className="mt-3 overflow-hidden rounded-xl" style={{ background: 'var(--color-chalk)', border: '1px solid var(--color-ivory)' }}>
        {[
          { to: '/progression', icon: Swords, iconColor: 'var(--color-ash)', label: 'Ranks & prestige' },
          { to: '/records', icon: Trophy, iconColor: 'var(--color-gold)', label: 'Hall of Records' },
          { to: '/wrapped', icon: Sparkles, iconColor: 'var(--color-gold)', label: 'Wrapped — monthly & yearly' },
        ].map((row, i) => (
          <button
            type="button"
            key={row.to}
            onClick={() => navigate(row.to)}
            className="flex min-h-11 w-full items-center justify-between px-4 py-3"
            style={{ borderTop: i > 0 ? '1px solid var(--color-ivory)' : 'none' }}
          >
            <span className="flex items-center gap-2.5 font-sans text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
              <row.icon size={15} style={{ color: row.iconColor }} /> {row.label}
            </span>
            <ChevronRight size={16} style={{ color: 'var(--color-ash)' }} />
          </button>
        ))}
      </div>

      {/* The Vault */}
      <button
        type="button"
        onClick={() => setVaultOpen(true)}
        className="mt-3 flex w-full items-center justify-between rounded-xl px-4 py-3"
        style={{ background: 'var(--color-chalk)', border: '1px solid var(--color-gold)' }}
      >
        <span className="flex items-center gap-2.5 font-sans text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
          <Gem size={15} style={{ color: 'var(--color-gold)' }} /> The Vault — cosmetics &amp; loot
        </span>
        <span className="flex items-center gap-1.5 font-mono text-sm font-bold" style={{ color: 'var(--color-gold)' }}>
          <span style={{ display: 'inline-block', width: 11, height: 11, transform: 'rotate(45deg)', background: 'linear-gradient(135deg, var(--color-gold), #a8791f)', borderRadius: 2 }} />
          {ironBal.toLocaleString()}
        </span>
      </button>

      <VaultModal isOpen={vaultOpen} onClose={() => setVaultOpen(false)} />

      {/* Lifetime stats */}
      <h2 className="mb-3 mt-6 font-sans text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--color-text-secondary)' }}>
        Lifetime
      </h2>
      <div className="grid grid-cols-3 gap-3">
        <StatTile icon={Dumbbell} value={life.workouts} countTo={life.workouts} label="Workouts" />
        <StatTile icon={Layers} value={life.totalSets.toLocaleString()} countTo={life.totalSets} label="Sets" />
        <StatTile icon={Trophy} value={life.prCount} countTo={life.prCount} label="PRs" accent="var(--color-gold)" />
        <StatTile icon={Zap} value={fmtVolume(life.totalVolume, unit)} label="Volume" />
        <StatTile icon={Clock} value={`${Math.round(life.hours)}h`} label="Trained" />
        <StatTile icon={Flame} value={bestStreak} countTo={bestStreak} label="Best streak" accent={bestStreak > 0 ? 'var(--color-ember)' : undefined} />
      </div>

      {/* Current streak + XP */}
      <div className="mt-3 grid grid-cols-2 gap-3">
        <StatTile icon={Flame} value={streak.count} countTo={streak.count} label="Current streak" accent={streak.count > 0 ? 'var(--color-ember)' : undefined} />
        <StatTile icon={Zap} value={totalXp.toLocaleString()} countTo={totalXp} label="Total XP" accent="var(--color-gold)" />
      </div>

      {/* Member since */}
      <div className="mt-3 flex items-center gap-2 rounded-xl px-4 py-3" style={{ background: 'var(--color-chalk)', border: '1px solid var(--color-ivory)' }}>
        <CalendarDays size={14} style={{ color: 'var(--color-ash)' }} />
        <span className="font-sans text-sm" style={{ color: 'var(--color-text-secondary)' }}>Member since {sinceLabel(since)}</span>
      </div>

      {/* Achievements */}
      <div className="mt-6">
        <TrophyCase />
      </div>

      <ShareButton
        data={profileShareData}
        kind="profile"
        filename="opus-profile.png"
        label="Share profile"
        className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl py-3 font-sans text-sm font-semibold"
        style={{ background: 'var(--color-obsidian)', color: 'var(--color-text-inverse)' }}
      />

      <ShareButton
        data={challengeShareData}
        kind="challenge"
        filename="opus-challenge.png"
        label="Challenge a friend"
        className="glass mt-3 flex w-full items-center justify-center gap-2 rounded-2xl py-3 font-sans text-sm font-semibold"
        style={{ background: 'var(--color-ivory)', color: 'var(--color-text-primary)' }}
      />
    </div>
  );
}
