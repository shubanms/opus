import { useNavigate } from 'react-router-dom';
import { Flame, ChevronRight, Play, Moon, CalendarCheck } from 'lucide-react';
import { useRPG } from '../hooks/useRPG.js';
import { useWorkouts } from '../hooks/useWorkout.js';
import { useToday } from '../hooks/useTemplates.js';
import { getXPProgress, getTitle } from '../utils/rpg.js';
import WorkoutCard from '../components/workout/WorkoutCard.jsx';
import LevelBadge from '../components/rpg/LevelBadge.jsx';
import XPBar from '../components/rpg/XPBar.jsx';
import useWorkoutStore from '../store/workoutStore.js';

function TodayCard({ icon: Icon = Play, title, subtitle, onClick }) {
  return (
    <button
      onClick={onClick}
      className="mb-6 flex w-full items-center justify-between rounded-2xl px-5 py-4"
      style={{ background: 'var(--color-obsidian)', border: '1px solid var(--color-stone)' }}
    >
      <div className="min-w-0 text-left">
        <p className="truncate font-sans text-base font-semibold" style={{ color: 'var(--color-chalk)' }}>
          {title}
        </p>
        <p className="truncate font-sans text-xs" style={{ color: 'var(--color-ash)' }}>
          {subtitle}
        </p>
      </div>
      <div className="ml-3 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full" style={{ background: 'var(--color-gold)' }}>
        <Icon size={16} strokeWidth={2.4} style={{ color: 'var(--color-obsidian)' }} />
      </div>
    </button>
  );
}

export default function HomePage() {
  const navigate = useNavigate();
  const { profile } = useRPG();
  const workouts = useWorkouts();
  const today = useToday();
  const activeWorkout = useWorkoutStore(s => s.activeWorkout);
  const startFromTemplate = useWorkoutStore(s => s.startFromTemplate);
  const recent = workouts.slice(0, 3);

  const totalXp = profile?.totalXp ?? 0;
  const { level } = getXPProgress(totalXp);
  const title = getTitle(level);

  function startTemplate() {
    startFromTemplate(today.template);
    navigate('/workout');
  }

  return (
    <div className="anim-fade-slide-up px-5 pb-24 pt-8">
      {/* Greeting */}
      <div className="mb-6">
        <h1 className="font-display text-5xl font-bold leading-none" style={{ color: 'var(--color-text-primary)' }}>
          OPUS
        </h1>
        <p className="mt-1 font-sans text-sm" style={{ color: 'var(--color-text-secondary)' }}>
          {profile?.name ? `Welcome back, ${profile.name}.` : 'Build your masterpiece.'}
        </p>
      </div>

      {/* Level / XP strip */}
      {profile && (
        <div
          className="mb-5 rounded-2xl px-4 py-3"
          style={{ background: 'var(--color-chalk)', border: '1px solid var(--color-ivory)' }}
        >
          <div className="mb-3 flex items-center gap-3">
            <LevelBadge level={level} size="sm" />
            <span className="font-sans text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
              {title}
            </span>
            {profile.streak > 0 && (
              <span className="ml-auto flex items-center gap-1 font-sans text-xs font-medium" style={{ color: 'var(--color-ember)' }}>
                <Flame size={12} />
                {profile.streak} day streak
              </span>
            )}
          </div>
          <XPBar totalXp={totalXp} showLabel={false} />
        </div>
      )}

      {/* Today's workout */}
      {activeWorkout ? (
        <TodayCard
          title="Continue workout"
          subtitle={`${activeWorkout.name} in progress`}
          onClick={() => navigate('/workout')}
        />
      ) : today.type === 'template' ? (
        <TodayCard
          icon={CalendarCheck}
          title={today.template.name}
          subtitle={`${today.reason} · ${today.template.exercises.length} exercises`}
          onClick={startTemplate}
        />
      ) : today.type === 'rest' ? (
        <div
          className="mb-6 flex items-center gap-3 rounded-2xl px-5 py-4"
          style={{ background: 'var(--color-chalk)', border: '1px solid var(--color-ivory)' }}
        >
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full" style={{ background: 'var(--color-ivory)' }}>
            <Moon size={16} style={{ color: 'var(--color-sage)' }} />
          </div>
          <div className="flex-1">
            <p className="font-sans text-base font-semibold" style={{ color: 'var(--color-text-primary)' }}>Rest day</p>
            <p className="font-sans text-xs" style={{ color: 'var(--color-text-secondary)' }}>{today.reason}</p>
          </div>
          <button onClick={() => navigate('/workout')} className="font-sans text-xs font-medium" style={{ color: 'var(--color-gold)' }}>
            Train anyway
          </button>
        </div>
      ) : (
        <TodayCard title="Start workout" subtitle={today.reason || 'Jump into a new session'} onClick={() => navigate('/workout')} />
      )}

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
