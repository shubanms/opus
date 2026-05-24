import { lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { Flame, ChevronRight, Play, Moon, CalendarCheck, TrendingDown, Swords } from 'lucide-react';
import { useRPG } from '../hooks/useRPG.js';
import { useWorkouts } from '../hooks/useWorkout.js';
import { useToday } from '../hooks/useTemplates.js';
import { getXPProgress, getRankLabel, getPrestige, getTitle } from '../utils/rpg.js';
import { sceneParams } from '../utils/ambient.js';
import { decayInfo } from '../utils/decay.js';
import { cappedLevel, activeBoss } from '../utils/bosses.js';
import { useBossStats } from '../hooks/useBosses.js';
import { playChime } from '../utils/sound.js';
import useSettingsStore from '../store/settingsStore.js';
import WorkoutCard from '../components/workout/WorkoutCard.jsx';
import LevelBadge from '../components/rpg/LevelBadge.jsx';
import XPBar from '../components/rpg/XPBar.jsx';
import RecoveryMap from '../components/progress/RecoveryMap.jsx';
import ActivityRings from '../components/progress/ActivityRings.jsx';
import WeeklyRecap from '../components/progress/WeeklyRecap.jsx';
import QuestBoard from '../components/rpg/QuestBoard.jsx';
import useWorkoutStore from '../store/workoutStore.js';

const Companion = lazy(() => import('../components/mascot/Companion.jsx'));

function TodayCard({ icon: Icon = Play, title, subtitle, onClick }) {
  return (
    <button
      onClick={onClick}
      className="mb-6 flex w-full items-center justify-between rounded-2xl px-5 py-4"
      style={{ background: 'var(--color-obsidian)', border: '1px solid var(--color-stone)' }}
    >
      <div className="min-w-0 text-left">
        <p className="truncate font-sans text-base font-semibold" style={{ color: 'var(--color-text-inverse)' }}>
          {title}
        </p>
        <p className="truncate font-sans text-xs" style={{ color: 'var(--color-ash)' }}>
          {subtitle}
        </p>
      </div>
      <div
        className="ml-3 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full"
        style={{ background: 'var(--color-gold)', animation: 'goldPulse 2.6s var(--ease-out) infinite' }}
      >
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

  const effects = useSettingsStore((s) => s.effects);
  const bossStats = useBossStats();
  const { effectiveXp, decaying, lost } = decayInfo(profile ?? {});
  const { level: rawLevel } = getXPProgress(effectiveXp);
  const prestige = getPrestige(effectiveXp);
  const level = bossStats ? cappedLevel(rawLevel, bossStats) : rawLevel;
  const boss = bossStats ? activeBoss(rawLevel, bossStats) : null;
  const title = prestige > 0 ? getRankLabel(effectiveXp) : getTitle(level);

  const reducedMotion = typeof window !== 'undefined' && window.matchMedia
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false;
  const scene = sceneParams({ streak: profile?.streak ?? 0, level, prestige, reducedMotion: reducedMotion || !effects });

  function startTemplate() {
    playChime('start');
    startFromTemplate(today.template);
    navigate('/workout');
  }

  return (
    <div className="anim-fade-slide-up px-5 pb-24 pt-8">
      {/* Greeting with a living aura that warms as you progress */}
      <div className="relative mb-6">
        <div
          aria-hidden
          className={scene.motionSpeed > 0 ? 'anim-breathe pointer-events-none' : 'pointer-events-none'}
          style={{
            position: 'absolute',
            left: -48,
            top: -56,
            width: 240,
            height: 240,
            borderRadius: '50%',
            background: `radial-gradient(circle, rgba(201,168,76,${scene.goldShade}) 0%, rgba(201,168,76,${scene.glowAlpha}) 38%, rgba(201,168,76,0) 70%)`,
            filter: `blur(${scene.glowBlur}px)`,
            animationDuration: scene.motionSpeed > 0 ? `${(7 - scene.motionSpeed * 3).toFixed(1)}s` : undefined,
          }}
        />
        <h1 className="relative font-display text-5xl font-bold leading-none" style={{ color: 'var(--color-text-primary)' }}>
          OPUS
        </h1>
        <p className="relative mt-1 font-sans text-sm" style={{ color: 'var(--color-text-secondary)' }}>
          {profile?.name ? `Welcome back, ${profile.name}.` : 'Build your masterpiece.'}
        </p>
      </div>

      {/* Magnus — 3D training companion */}
      <Suspense fallback={<div style={{ height: 150 }} />}>
        <Companion />
      </Suspense>

      {/* Level / XP strip */}
      {profile && (
        <div
          className="mb-5 rounded-2xl px-4 py-3"
          style={{ background: 'var(--color-chalk)', border: '1px solid var(--color-ivory)' }}
        >
          <div className="mb-3 flex items-center gap-3">
            <LevelBadge level={level} size="sm" prestige={prestige} />
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
          <XPBar totalXp={effectiveXp} showLabel={false} />
          {decaying && (
            <p className="mt-2 flex items-center gap-1.5 font-sans text-xs font-medium" style={{ color: 'var(--color-ember)' }}>
              <TrendingDown size={12} />
              Rank slipping — train to recover (−{lost.toLocaleString()} XP)
            </p>
          )}
        </div>
      )}

      {/* Boss gate — blocks the next milestone level until cleared */}
      {boss && (
        <div className="mb-5 rounded-2xl p-4" style={{ background: 'var(--color-obsidian)', border: '1px solid var(--color-gold)' }}>
          <div className="mb-1 flex items-center gap-2">
            <Swords size={15} style={{ color: 'var(--color-gold)' }} />
            <span className="font-sans text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--color-gold)' }}>
              Boss gate · Level {boss.gate}
            </span>
          </div>
          <p className="font-display text-xl font-bold" style={{ color: 'var(--color-text-inverse)' }}>{boss.title}</p>
          <p className="mt-0.5 font-sans text-sm" style={{ color: 'var(--color-ash)' }}>
            {boss.desc} to break past level {boss.gate}.
          </p>
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

      {/* Weekly recap */}
      <WeeklyRecap />

      {/* Weekly quests */}
      <div className="mb-6">
        <QuestBoard />
      </div>

      {/* Daily activity */}
      <div className="mb-6">
        <ActivityRings />
      </div>

      {/* Recovery body-map */}
      {workouts.length > 0 && (
        <div className="mb-6">
          <RecoveryMap />
        </div>
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
