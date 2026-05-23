import { useNavigate } from 'react-router-dom';
import { Flame, ChevronRight, Play } from 'lucide-react';
import { useRPG } from '../hooks/useRPG.js';
import { useWorkouts } from '../hooks/useWorkout.js';
import { getXPProgress, getTitle } from '../utils/rpg.js';
import WorkoutCard from '../components/workout/WorkoutCard.jsx';
import useWorkoutStore from '../store/workoutStore.js';

export default function HomePage() {
  const navigate = useNavigate();
  const { profile } = useRPG();
  const workouts = useWorkouts();
  const activeWorkout = useWorkoutStore(s => s.activeWorkout);
  const recent = workouts.slice(0, 3);

  const totalXp = profile?.totalXp ?? 0;
  const { level, progress } = getXPProgress(totalXp);
  const title = getTitle(level);

  return (
    <div className="anim-fade-slide-up px-5 pb-24 pt-8">
      {/* Greeting */}
      <div className="mb-6">
        <h1 className="font-display text-5xl font-bold leading-none" style={{ color: 'var(--color-text-primary)' }}>
          OPUS
        </h1>
        <p className="mt-1 font-sans text-sm" style={{ color: 'var(--color-text-secondary)' }}>
          Build your masterpiece.
        </p>
      </div>

      {/* Level / XP strip */}
      {profile && (
        <div
          className="mb-5 rounded-2xl px-4 py-3"
          style={{ background: 'var(--color-chalk)', border: '1px solid var(--color-ivory)' }}
        >
          <div className="mb-2 flex items-center justify-between">
            <div>
              <span className="font-sans text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--color-gold)' }}>
                Lv. {level}
              </span>
              <span className="ml-2 font-sans text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                {title}
              </span>
            </div>
            {profile.streak > 0 && (
              <span className="flex items-center gap-1 font-sans text-xs font-medium" style={{ color: 'var(--color-ember)' }}>
                <Flame size={12} />
                {profile.streak} day streak
              </span>
            )}
          </div>
          <div className="h-1.5 overflow-hidden rounded-full" style={{ background: 'var(--color-ivory)' }}>
            <div
              className="h-full rounded-full"
              style={{ width: `${Math.round(progress * 100)}%`, background: 'var(--color-gold)' }}
            />
          </div>
        </div>
      )}

      {/* Quick start */}
      <button
        onClick={() => navigate('/workout')}
        className="mb-6 flex w-full items-center justify-between rounded-2xl px-5 py-4"
        style={{ background: 'var(--color-obsidian)', border: '1px solid var(--color-stone)' }}
      >
        <div className="text-left">
          <p className="font-sans text-base font-semibold" style={{ color: 'var(--color-chalk)' }}>
            {activeWorkout ? 'Continue workout' : 'Start workout'}
          </p>
          <p className="font-sans text-xs" style={{ color: 'var(--color-ash)' }}>
            {activeWorkout ? `${activeWorkout.name} in progress` : 'Jump into a new session'}
          </p>
        </div>
        <div
          className="flex h-10 w-10 items-center justify-center rounded-full"
          style={{ background: 'var(--color-gold)' }}
        >
          <Play size={16} fill="var(--color-obsidian)" style={{ color: 'var(--color-obsidian)' }} />
        </div>
      </button>

      {/* Recent workouts */}
      {recent.length > 0 ? (
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-sans text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--color-text-secondary)' }}>
              Recent
            </h2>
            <button
              onClick={() => navigate('/history')}
              className="flex items-center gap-1 font-sans text-xs"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              See all <ChevronRight size={12} />
            </button>
          </div>
          {recent.map(w => <WorkoutCard key={w.id} workout={w} />)}
        </div>
      ) : (
        <div className="mt-10 text-center">
          <p className="font-display text-3xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
            Your legacy starts here
          </p>
          <p className="mt-2 font-sans text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            Complete your first workout to begin the journey.
          </p>
        </div>
      )}
    </div>
  );
}
