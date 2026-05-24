import { useNavigate } from 'react-router-dom';
import { Settings, Dumbbell, Layers, Trophy, Flame, Clock, Zap, CalendarDays, ChevronRight } from 'lucide-react';
import { useRPG, useCharacterStats } from '../hooks/useRPG.js';
import { useWorkouts } from '../hooks/useWorkout.js';
import { useCurrentBodyweight, useLifetimeStats } from '../hooks/useProgress.js';
import { getXPProgress, getTitle } from '../utils/rpg.js';
import { fmtWeight, fmtVolume } from '../utils/units.js';
import useSettingsStore from '../store/settingsStore.js';
import CharacterCard from '../components/rpg/CharacterCard.jsx';
import TrophyCase from '../components/rpg/TrophyCase.jsx';
import ShareButton from '../components/share/ShareButton.jsx';
import ProfileCard from '../components/share/ProfileCard.jsx';

function StatTile({ icon: Icon, value, label, accent }) {
  return (
    <div className="rounded-xl p-3" style={{ background: 'var(--color-chalk)', border: '1px solid var(--color-ivory)' }}>
      <Icon size={14} style={{ color: accent ?? 'var(--color-ash)' }} />
      <p className="mt-1 font-mono text-lg font-semibold" style={{ color: accent ?? 'var(--color-text-primary)' }}>{value}</p>
      <p className="font-sans text-xs" style={{ color: 'var(--color-text-secondary)' }}>{label}</p>
    </div>
  );
}

export default function ProfilePage() {
  const navigate = useNavigate();
  const { profile, loaded } = useRPG();
  const workouts = useWorkouts();
  const charStats = useCharacterStats();
  const bodyweight = useCurrentBodyweight();
  const life = useLifetimeStats();
  const unit = useSettingsStore((s) => s.unit);

  if (!loaded || !profile) return null;

  const totalXp = profile.totalXp ?? 0;
  const { level } = getXPProgress(totalXp);
  const age = profile.birthYear ? new Date().getFullYear() - profile.birthYear : null;

  const identity = [
    age ? `${age} yrs` : null,
    profile.sex || null,
    profile.height ? `${profile.height} cm` : null,
    bodyweight != null ? fmtWeight(bodyweight, unit) : null,
  ].filter(Boolean);

  const profileShareData = {
    name: profile.name,
    level,
    title: getTitle(level),
    stats: charStats,
    workouts: workouts.length,
    streak: profile.streak ?? 0,
    totalXp,
  };

  return (
    <div className="anim-fade-slide-up px-5 pb-8 pt-8">
      {/* Header */}
      <div className="mb-1 flex items-start justify-between">
        <h1 className="font-display text-4xl font-bold leading-none" style={{ color: 'var(--color-text-primary)' }}>
          {profile.name || 'Profile'}
        </h1>
        <button
          onClick={() => navigate('/settings')}
          className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full"
          style={{ background: 'var(--color-ivory)' }}
          aria-label="Settings"
        >
          <Settings size={18} style={{ color: 'var(--color-text-secondary)' }} />
        </button>
      </div>
      <p className="mb-5 font-sans text-sm" style={{ color: 'var(--color-text-secondary)' }}>
        {identity.length ? identity.join('  ·  ') : `Member since ${profile.joinDate}`}
      </p>

      <CharacterCard profile={profile} />

      <button
        onClick={() => navigate('/progression')}
        className="mt-3 flex w-full items-center justify-between rounded-xl px-4 py-3"
        style={{ background: 'var(--color-chalk)', border: '1px solid var(--color-ivory)' }}
      >
        <span className="font-sans text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
          View ranks & prestige
        </span>
        <ChevronRight size={16} style={{ color: 'var(--color-ash)' }} />
      </button>

      {/* Lifetime stats */}
      <h2 className="mb-3 mt-6 font-sans text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--color-text-secondary)' }}>
        Lifetime
      </h2>
      <div className="grid grid-cols-3 gap-3">
        <StatTile icon={Dumbbell} value={life.workouts} label="Workouts" />
        <StatTile icon={Layers} value={life.totalSets.toLocaleString()} label="Sets" />
        <StatTile icon={Trophy} value={life.prCount} label="PRs" accent="var(--color-gold)" />
        <StatTile icon={Zap} value={fmtVolume(life.totalVolume, unit)} label="Volume" />
        <StatTile icon={Clock} value={`${Math.round(life.hours)}h`} label="Trained" />
        <StatTile icon={Flame} value={life.bestStreak} label="Best streak" accent={life.bestStreak > 0 ? 'var(--color-ember)' : undefined} />
      </div>

      {/* Current streak + XP */}
      <div className="mt-3 grid grid-cols-2 gap-3">
        <StatTile icon={Flame} value={profile.streak ?? 0} label="Current streak" accent={(profile.streak ?? 0) > 0 ? 'var(--color-ember)' : undefined} />
        <StatTile icon={Zap} value={totalXp.toLocaleString()} label="Total XP" accent="var(--color-gold)" />
      </div>

      {/* Member since */}
      <div className="mt-3 flex items-center gap-2 rounded-xl px-4 py-3" style={{ background: 'var(--color-chalk)', border: '1px solid var(--color-ivory)' }}>
        <CalendarDays size={14} style={{ color: 'var(--color-ash)' }} />
        <span className="font-sans text-sm" style={{ color: 'var(--color-text-secondary)' }}>Member since {profile.joinDate}</span>
      </div>

      {/* Achievements */}
      <div className="mt-6">
        <TrophyCase />
      </div>

      <ShareButton
        data={profileShareData}
        CardComponent={ProfileCard}
        filename="opus-profile.png"
        label="Share profile"
        className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl py-3 font-sans text-sm font-semibold"
        style={{ background: 'var(--color-obsidian)', color: 'var(--color-chalk)' }}
      />
    </div>
  );
}
