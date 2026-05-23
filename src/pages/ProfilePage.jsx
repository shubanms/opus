import { useNavigate } from 'react-router-dom';
import { Flame, Zap, Settings } from 'lucide-react';
import { useRPG, useCharacterStats } from '../hooks/useRPG.js';
import { useWorkouts } from '../hooks/useWorkout.js';
import { getXPProgress, getTitle } from '../utils/rpg.js';
import CharacterCard from '../components/rpg/CharacterCard.jsx';
import ShareButton from '../components/share/ShareButton.jsx';
import ProfileCard from '../components/share/ProfileCard.jsx';

export default function ProfilePage() {
  const navigate = useNavigate();
  const { profile, loaded } = useRPG();
  const workouts = useWorkouts();
  const charStats = useCharacterStats();

  if (!loaded || !profile) return null;

  const totalXp = profile.totalXp ?? 0;
  const { level } = getXPProgress(totalXp);

  const profileShareData = {
    level,
    title: getTitle(level),
    stats: charStats,
    workouts: workouts.length,
    streak: profile.streak ?? 0,
    totalXp,
  };

  return (
    <div className="anim-fade-slide-up px-5 pb-8 pt-8">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="font-display text-4xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
            Profile
          </h1>
          <p className="font-sans text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            Joined {profile.joinDate}
          </p>
        </div>
        <button
          onClick={() => navigate('/settings')}
          className="flex h-9 w-9 items-center justify-center rounded-full"
          style={{ background: 'var(--color-ivory)' }}
          aria-label="Settings"
        >
          <Settings size={18} style={{ color: 'var(--color-text-secondary)' }} />
        </button>
      </div>

      <CharacterCard profile={profile} />

      {/* Stats */}
      <div className="mt-5 grid grid-cols-3 gap-3">
        <div className="rounded-xl p-3 text-center" style={{ background: 'var(--color-chalk)', border: '1px solid var(--color-ivory)' }}>
          <p className="font-mono text-xl font-semibold" style={{ color: 'var(--color-text-primary)' }}>
            {workouts.length}
          </p>
          <p className="font-sans text-xs" style={{ color: 'var(--color-text-secondary)' }}>Workouts</p>
        </div>
        <div className="rounded-xl p-3 text-center" style={{ background: 'var(--color-chalk)', border: '1px solid var(--color-ivory)' }}>
          <p className="flex items-center justify-center gap-1 font-mono text-xl font-semibold"
            style={{ color: (profile.streak ?? 0) > 0 ? 'var(--color-ember)' : 'var(--color-text-primary)' }}>
            {(profile.streak ?? 0) > 0 && <Flame size={16} style={{ color: 'var(--color-ember)' }} />}
            {profile.streak ?? 0}
          </p>
          <p className="font-sans text-xs" style={{ color: 'var(--color-text-secondary)' }}>Streak</p>
        </div>
        <div className="rounded-xl p-3 text-center" style={{ background: 'var(--color-chalk)', border: '1px solid var(--color-ivory)' }}>
          <p className="flex items-center justify-center gap-1 font-mono text-xl font-semibold" style={{ color: 'var(--color-gold)' }}>
            <Zap size={14} style={{ color: 'var(--color-gold)' }} />
            {totalXp.toLocaleString()}
          </p>
          <p className="font-sans text-xs" style={{ color: 'var(--color-text-secondary)' }}>Total XP</p>
        </div>
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
