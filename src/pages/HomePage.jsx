import { lazy, Suspense, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Flame, ChevronRight, Play, Moon, CalendarCheck, TrendingDown, Swords, Activity, Droplet, Target } from 'lucide-react';
import { useRPG } from '../hooks/useRPG.js';
import { useWorkouts } from '../hooks/useWorkout.js';
import { useToday } from '../hooks/useTemplates.js';
import { getXPProgress, getRankLabel, getPrestige, getTitle } from '../utils/rpg.js';
import { sceneParams } from '../utils/ambient.js';
import { decayInfo, streakBreakPenalty } from '../utils/decay.js';
import { STREAK, rescueOffer, streakLabel, streakState } from '../utils/streak.js';
import { isShieldActive, shieldedDecay } from '../utils/streakShield.js';
import { useRestTokens } from '../hooks/useRestTokens.js';
import { cappedLevel, activeBoss } from '../utils/bosses.js';
import { useBossStats } from '../hooks/useBosses.js';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db.js';
import { playChime } from '../utils/sound.js';
import useSettingsStore from '../store/settingsStore.js';
import { useWeeklyRecap } from '../hooks/useWeeklyRecap.js';
import { toDisplay, unitLabel } from '../utils/units.js';
import WorkoutCard from '../components/workout/WorkoutCard.jsx';
import LevelBadge from '../components/rpg/LevelBadge.jsx';
import XPBar from '../components/rpg/XPBar.jsx';
import RecoveryMap from '../components/progress/RecoveryMap.jsx';
import SessionVerdict from '../components/progress/SessionVerdict.jsx';
import ActivityRings from '../components/progress/ActivityRings.jsx';
import WeeklyRecap from '../components/progress/WeeklyRecap.jsx';
import QuestBoard from '../components/rpg/QuestBoard.jsx';
import DailyDungeonCard from '../components/rpg/DailyDungeonCard.jsx';
import useWorkoutStore from '../store/workoutStore.js';

const Companion = lazy(() => import('../components/mascot/Companion.jsx'));

function TodayCard({ icon: Icon = Play, title, subtitle, onClick }) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center justify-between rounded-2xl px-5 py-4"
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
        className="ml-3 flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
        style={{ background: 'var(--color-gold)', animation: 'goldPulse 2.6s var(--opus-ease-out) infinite' }}
      >
        <Icon size={16} strokeWidth={2.4} style={{ color: 'var(--color-obsidian)' }} />
      </div>
    </button>
  );
}

// Consolidates the three heavy stacked widgets (activity / recovery / quests)
// into one swappable deck so the home feed stays short. Each keeps its full UI.
function SecondaryDeck({ hasWorkouts }) {
  const tabs = [
    { key: 'activity', label: 'Activity', icon: Droplet },
    ...(hasWorkouts ? [{ key: 'recovery', label: 'Recovery', icon: Activity }] : []),
    { key: 'quests', label: 'Quests', icon: Target },
  ];
  const [tab, setTab] = useState(tabs[0].key);

  return (
    <div>
      <div className="mb-3 flex gap-1.5 overflow-hidden rounded-xl p-1" style={{ background: 'var(--color-chalk)', border: '1px solid var(--color-ivory)' }}>
        {tabs.map((t) => {
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => { setTab(t.key); playChime('tap'); }}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 font-sans text-xs font-semibold transition-colors"
              style={{ background: active ? 'var(--color-obsidian)' : 'transparent', color: active ? 'var(--color-text-inverse)' : 'var(--color-ash)' }}
            >
              <t.icon size={13} />{t.label}
            </button>
          );
        })}
      </div>
      <div key={tab} className="anim-fade-in">
        {tab === 'activity' && <ActivityRings />}
        {tab === 'recovery' && <RecoveryMap />}
        {tab === 'quests' && <QuestBoard />}
      </div>
    </div>
  );
}

export default function HomePage() {
  const navigate = useNavigate();
  const { profile } = useRPG();
  const workouts = useWorkouts();
  const today = useToday();
  const activeWorkout = useWorkoutStore(s => s.activeWorkout);
  const startFromTemplate = useWorkoutStore(s => s.startFromTemplate);
  const recent = workouts.slice(0, 2);

  const effects = useSettingsStore((s) => s.effects);
  const unit = useSettingsStore((s) => s.unit);
  const week = useWeeklyRecap();
  const bossStats = useBossStats();

  // Streak shield / rest token. Tokens are derived from history (workouts +
  // claimed quests), so they're already earned; spending one waives the
  // streak-break penalty on the current lapse.
  const shieldedLapseDate = useSettingsStore((s) => s.shieldedLapseDate);
  const spendShield = useSettingsStore((s) => s.spendShield);
  const declineRescue = useSettingsStore((s) => s.declineRescue);
  const shieldTokens = useRestTokens();
  const rawDecay = decayInfo(profile ?? {});
  const shieldActive = isShieldActive(shieldedLapseDate, profile?.lastWorkoutDate);
  // Deliberately the STORED streak, not the live one: this is the penalty for
  // the streak you *lost*, and the live count is 0 once it has broken — passing
  // that here would silently zero the penalty and kill the rest-token mechanic.
  const streakPenalty = streakBreakPenalty(rawDecay.days, profile?.streak ?? 0);
  const streak = streakState(profile);
  // The offer itself lives in StreakRescueHost, app-wide. This is only the way
  // back to it after "let it go" — a lapse you dismissed once should still be
  // recoverable while it is still recoverable, and Home is where you look.
  const offer = rescueOffer(profile, shieldTokens);
  const { effectiveXp, decaying, lost } = shieldedDecay(rawDecay, { active: shieldActive, streakPenalty, earnedXp: profile?.totalXp ?? 0 });
  const canShield = rawDecay.decaying && streakPenalty > 0 && !shieldActive && shieldTokens > 0;
  const { level: rawLevel } = getXPProgress(effectiveXp);
  const prestige = getPrestige(effectiveXp);
  const level = bossStats ? cappedLevel(rawLevel, bossStats) : rawLevel;
  const boss = bossStats ? activeBoss(rawLevel, bossStats) : null;
  const title = prestige > 0 ? getRankLabel(effectiveXp) : getTitle(level);

  const reducedMotion = typeof window !== 'undefined' && window.matchMedia
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false;
  const scene = sceneParams({ streak: streak.count, level, prestige, reducedMotion: reducedMotion || !effects });

  function startTemplate() {
    playChime('start');
    startFromTemplate(today.template);
    navigate('/workout');
  }

  return (
    <div className="px-5 pb-24 pt-6">
      {/* Compact hero — greeting + level/XP merged into one card (declutters
          three former full-width strips into one), over a living aura. */}
      <div className="relative mb-4">
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
            background: `radial-gradient(circle, rgba(139, 125, 255,${scene.goldShade}) 0%, rgba(139, 125, 255,${scene.glowAlpha}) 38%, rgba(139, 125, 255,0) 70%)`,
            filter: `blur(${scene.glowBlur}px)`,
            animationDuration: scene.motionSpeed > 0 ? `${(7 - scene.motionSpeed * 3).toFixed(1)}s` : undefined,
          }}
        />
        <div className="glass relative rounded-2xl px-4 py-4" style={{ background: 'var(--color-chalk)', border: '1px solid var(--color-ivory)' }}>
          <div className="flex items-start justify-between">
            <div className="min-w-0">
              <h1 className="font-display text-4xl font-bold leading-none" style={{ color: 'var(--color-text-primary)' }}>
                OPUS
              </h1>
              <p className="mt-1 truncate font-sans text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                {profile?.name ? `Welcome back, ${profile.name}.` : 'Build your masterpiece.'}
              </p>
            </div>
            {/* Only shown while the streak is actually standing. It used to
                read `profile.streak`, which is frozen at the last workout — so
                a streak that ended three weeks ago still displayed its old
                count. At risk (trained yesterday, not today) is called out
                rather than looking identical to safe. */}
            {streak.count > 0 && (
              <span
                className="flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 font-sans text-xs font-semibold"
                style={{
                  background: streak.state === STREAK.AT_RISK ? 'var(--accent-wash)' : 'var(--color-ivory)',
                  color: 'var(--color-ember)',
                  border: streak.state === STREAK.AT_RISK ? '1px solid var(--color-ember)' : '1px solid transparent',
                }}
                title={streakLabel(streak)}
                aria-label={streakLabel(streak)}
              >
                <Flame size={12} />
                {streak.count}
              </span>
            )}
          </div>

          {profile && (
            <div className="mt-4">
              <div className="mb-2 flex items-center gap-2.5">
                <LevelBadge level={level} size="sm" prestige={prestige} />
                <span className="truncate font-sans text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                  {title}
                </span>
              </div>
              <XPBar totalXp={effectiveXp} showLabel={false} />
              {decaying && (
                <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1">
                  <p className="flex items-center gap-1.5 font-sans text-xs font-medium" style={{ color: 'var(--color-ember)' }}>
                    <TrendingDown size={12} />
                    Rank slipping — train to recover (−{lost.toLocaleString()} XP)
                  </p>
                  {canShield && (
                    <button
                      onClick={() => { spendShield(profile?.lastWorkoutDate); playChime('goal'); }}
                      className="flex items-center gap-1 rounded-full px-2.5 py-1 font-sans text-xs font-semibold"
                      style={{ background: 'var(--color-gold)', color: 'var(--color-obsidian)' }}
                    >
                      🛡️ Use shield ({shieldTokens})
                    </button>
                  )}
                </div>
              )}
              {!decaying && shieldActive && (
                <p className="mt-2 flex items-center gap-1.5 font-sans text-xs font-medium" style={{ color: 'var(--color-sage)' }}>
                  🛡️ Streak shielded — your rest day is protected
                </p>
              )}
              {/* A streak you can still buy back. The prompt on app-open is the
                  primary offer; this is the way back to it, and it replaces the
                  old bare "🛡️ 2 banked" line — a number with no mechanic
                  attached, in the one place it could never be spent. */}
              {offer && (
                <button
                  type="button"
                  onClick={() => { declineRescue(null); playChime('tick'); }}
                  className="mt-2 flex w-full items-center gap-1.5 rounded-xl px-2.5 py-1.5 font-sans text-xs font-semibold"
                  style={{ background: 'var(--accent-wash)', color: 'var(--color-ember)' }}
                >
                  <Flame size={12} />
                  {offer.lost}-day streak ended
                  <span className="ml-auto font-medium" style={{ color: 'var(--color-text-secondary)' }}>
                    {offer.affordable ? `Rescue · ${offer.cost} token${offer.cost === 1 ? '' : 's'}` : 'See what it costs'}
                  </span>
                </button>
              )}
              {!offer && !decaying && !shieldActive && shieldTokens > 0 && (
                <p className="mt-2 font-mono text-[11px]" style={{ color: 'var(--color-ash)' }}>
                  🛡️ {shieldTokens} rest {shieldTokens === 1 ? 'token' : 'tokens'} banked
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      <SessionVerdict workout={recent[0]} />

      {/* Bento row. Magnus previously floated between two full-width cards with
          a tall empty band above him — the speech bubble is absolutely
          positioned, so its space was reserved whether or not he was talking.
          Giving him a tile turns that reserved space into deliberate padding,
          and the stats beside him fill the row. */}
      <div className="mb-4 flex flex-col gap-3">
        <div className="glass rounded-2xl px-3 py-2">
          <Suspense fallback={<div style={{ height: 116 }} />}>
            <Companion size={116} bubbleWidth={220} />
          </Suspense>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {[
            { k: 'This week', v: String(week.sessions), u: week.sessions === 1 ? 'session' : 'sessions' },
            { k: 'Volume', v: Math.round(toDisplay(week.volumeKg, unit)).toLocaleString(), u: `${unitLabel(unit)} lifted` },
            { k: 'Records', v: String(week.prCount), u: week.prCount === 1 ? 'PR' : 'PRs' },
          ].map((t) => (
            <div key={t.k} className="glass rounded-2xl px-3 py-3">
              <p className="font-sans text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'var(--color-text-secondary)' }}>
                {t.k}
              </p>
              <p className="mt-1.5 truncate font-mono text-xl leading-none" style={{ color: 'var(--color-text-primary)' }}>
                {t.v}
              </p>
              <p className="mt-1 truncate font-sans text-[10px]" style={{ color: 'var(--color-text-secondary)' }}>
                {t.u}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Boss gate — blocks the next milestone level until cleared */}
      {boss && (
        <div className="mb-4 rounded-2xl p-4" style={{ background: 'var(--color-obsidian)', border: '1px solid var(--color-gold)' }}>
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

      {/* Today's workout — primary action */}
      <div className="mb-5">
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
            className="glass flex items-center gap-3 rounded-2xl px-5 py-4"
            style={{ background: 'var(--color-chalk)', border: '1px solid var(--color-ivory)' }}
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full" style={{ background: 'var(--color-ivory)' }}>
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
      </div>

      {/* Daily dungeon */}
      <DailyDungeonCard />

      {/* Weekly recap — compact, auto-hides when no data / dismissed */}
      <WeeklyRecap />

      {/* Secondary widgets collapsed into one tabbed deck */}
      <div className="mb-6">
        <SecondaryDeck hasWorkouts={workouts.length > 0} />
      </div>

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
