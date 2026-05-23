import { Flame, Zap } from 'lucide-react';
import { useRPG } from '../hooks/useRPG.js';
import { useWorkouts } from '../hooks/useWorkout.js';
import { getXPProgress, getTitle } from '../utils/rpg.js';

const R = 80;
const C = 2 * Math.PI * R;

export default function ProfilePage() {
  const { profile, loaded } = useRPG();
  const workouts = useWorkouts();

  if (!loaded || !profile) return null;

  const totalXp = profile.totalXp ?? 0;
  const { level, progress, xpToNext } = getXPProgress(totalXp);
  const title = getTitle(level);
  const dashoffset = C * (1 - progress);

  return (
    <div className="anim-fade-slide-up px-5 pb-8 pt-8">
      <h1 className="mb-6 font-display text-4xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
        Profile
      </h1>

      {/* Level ring */}
      <div className="mb-6 flex flex-col items-center">
        <svg width={200} height={200} viewBox="0 0 200 200">
          <circle cx={100} cy={100} r={R} fill="none" stroke="var(--color-ivory)" strokeWidth={8} />
          <circle
            cx={100} cy={100} r={R}
            fill="none"
            stroke="var(--color-gold)"
            strokeWidth={8}
            strokeLinecap="round"
            strokeDasharray={C}
            strokeDashoffset={dashoffset}
            transform="rotate(-90 100 100)"
            style={{ transition: 'stroke-dashoffset 1.2s ease-out' }}
          />
          <text
            x={100} y={96}
            textAnchor="middle"
            fontFamily="DM Mono, monospace"
            fontSize={44}
            fontWeight="600"
            fill="var(--color-text-primary)"
          >
            {level}
          </text>
          <text
            x={100} y={116}
            textAnchor="middle"
            fontFamily="DM Sans, sans-serif"
            fontSize={11}
            letterSpacing={2}
            fill="var(--color-text-secondary)"
          >
            LEVEL
          </text>
        </svg>

        <span
          className="mt-2 rounded-full px-4 py-1 font-sans text-sm font-semibold"
          style={{ background: 'var(--color-gold)', color: 'var(--color-obsidian)' }}
        >
          {title}
        </span>
      </div>

      {/* XP progress bar */}
      <div
        className="mb-5 rounded-2xl px-4 py-3"
        style={{ background: 'var(--color-chalk)', border: '1px solid var(--color-ivory)' }}
      >
        <div className="mb-2 flex items-center justify-between">
          <span className="flex items-center gap-1.5 font-sans text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>
            <Zap size={12} style={{ color: 'var(--color-gold)' }} />
            Experience
          </span>
          <span className="font-mono text-xs" style={{ color: 'var(--color-text-secondary)' }}>
            {xpToNext.toLocaleString()} XP to next
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-full" style={{ background: 'var(--color-ivory)' }}>
          <div
            className="h-full rounded-full"
            style={{
              width: `${Math.round(progress * 100)}%`,
              background: 'var(--color-gold)',
              transition: 'width 1.2s ease-out',
            }}
          />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div
          className="rounded-xl p-3 text-center"
          style={{ background: 'var(--color-chalk)', border: '1px solid var(--color-ivory)' }}
        >
          <p className="font-mono text-xl font-semibold" style={{ color: 'var(--color-text-primary)' }}>
            {workouts.length}
          </p>
          <p className="font-sans text-xs" style={{ color: 'var(--color-text-secondary)' }}>Workouts</p>
        </div>
        <div
          className="rounded-xl p-3 text-center"
          style={{ background: 'var(--color-chalk)', border: '1px solid var(--color-ivory)' }}
        >
          <p className="flex items-center justify-center gap-1 font-mono text-xl font-semibold"
            style={{ color: (profile.streak ?? 0) > 0 ? 'var(--color-ember)' : 'var(--color-text-primary)' }}>
            {(profile.streak ?? 0) > 0 && <Flame size={16} style={{ color: 'var(--color-ember)' }} />}
            {profile.streak ?? 0}
          </p>
          <p className="font-sans text-xs" style={{ color: 'var(--color-text-secondary)' }}>Streak</p>
        </div>
        <div
          className="rounded-xl p-3 text-center"
          style={{ background: 'var(--color-chalk)', border: '1px solid var(--color-ivory)' }}
        >
          <p className="font-mono text-xl font-semibold" style={{ color: 'var(--color-gold)' }}>
            {totalXp.toLocaleString()}
          </p>
          <p className="font-sans text-xs" style={{ color: 'var(--color-text-secondary)' }}>Total XP</p>
        </div>
      </div>
    </div>
  );
}
