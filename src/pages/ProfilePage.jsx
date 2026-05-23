import { Flame, Zap } from 'lucide-react';
import { useRPG } from '../hooks/useRPG.js';
import { useWorkouts } from '../hooks/useWorkout.js';
import CharacterCard from '../components/rpg/CharacterCard.jsx';

export default function ProfilePage() {
  const { profile, loaded } = useRPG();
  const workouts = useWorkouts();

  if (!loaded || !profile) return null;

  const totalXp = profile.totalXp ?? 0;

  return (
    <div className="anim-fade-slide-up px-5 pb-8 pt-8">
      <h1 className="mb-1 font-display text-4xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
        Profile
      </h1>
      <p className="mb-6 font-sans text-sm" style={{ color: 'var(--color-text-secondary)' }}>
        Joined {profile.joinDate}
      </p>

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
    </div>
  );
}
