import { lazy, Suspense, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { useRPG } from '../hooks/useRPG.js';
import { useWorkouts } from '../hooks/useWorkout.js';
import { useToday } from '../hooks/useTemplates.js';
import { STREAK, rescueOffer, streakLabel } from '../utils/streak.js';
import { usePlanDays, useStreak } from '../hooks/useStreak.js';
import { useRestTokens } from '../hooks/useRestTokens.js';
import { useEffectiveXp } from '../hooks/useEffectiveXp.js';
import { playChime } from '../utils/sound.js';
import useSettingsStore from '../store/settingsStore.js';
import { useWeeklyRecap } from '../hooks/useWeeklyRecap.js';
import { toDisplay, unitLabel } from '../utils/units.js';
import { getXPProgress } from '../utils/rpg.js';
import { rankSealKanji, UI_KANJI } from '../utils/kanji.js';
import { InkTabs, Seal, SectionLabel } from '../components/ink/index.js';
import useInkMotion from '../components/ink/useInkMotion.js';
import SkyScene from '../components/home/SkyScene.jsx';
import TodayCard from '../components/home/TodayCard.jsx';
import WeekRow from '../components/home/WeekRow.jsx';
import useSky from '../components/home/useSky.js';
import { SKY_PALETTES } from '../components/home/skyPalettes.js';
import WorkoutCard from '../components/workout/WorkoutCard.jsx';
import RecoveryMap from '../components/progress/RecoveryMap.jsx';
import SessionVerdict from '../components/progress/SessionVerdict.jsx';
import BackupCard from '../components/backup/BackupCard.jsx';
import InstallCard from '../components/backup/InstallCard.jsx';
import ActivityRings from '../components/progress/ActivityRings.jsx';
import WeeklyRecap from '../components/progress/WeeklyRecap.jsx';
import QuestBoard from '../components/rpg/QuestBoard.jsx';
import DailyDungeonCard from '../components/rpg/DailyDungeonCard.jsx';
import MascotBoundary from '../components/mascot/MascotBoundary.jsx';
import { hasWebGL } from '../components/mascot/webgl.js';
import useWorkoutStore from '../store/workoutStore.js';
import '../styles/ink-home.css';

const Companion = lazy(() => import('../components/mascot/Companion.jsx'));

const NUMBER_WORDS = ['Zero', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten'];

// Activity / Recovery / Quests in one swappable deck so the feed stays short.
// Each keeps its full UI.
function SecondaryDeck({ hasWorkouts }) {
  const tabs = [
    { id: 'activity', label: 'Activity', tabId: 'home-tab-activity', panelId: 'home-panel' },
    ...(hasWorkouts ? [{ id: 'recovery', label: 'Recovery', tabId: 'home-tab-recovery', panelId: 'home-panel' }] : []),
    { id: 'quests', label: 'Quests', tabId: 'home-tab-quests', panelId: 'home-panel' },
  ];
  const [tab, setTab] = useState('activity');

  return (
    <div>
      <InkTabs tabs={tabs} value={tab} onChange={(id) => { setTab(id); playChime('tap'); }} label="Home sections" />
      <div key={tab} id="home-panel" role="tabpanel" aria-labelledby={`home-tab-${tab}`} className="anim-fade-in" style={{ marginTop: 14 }}>
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
  const activeWorkout = useWorkoutStore((s) => s.activeWorkout);
  const startFromTemplate = useWorkoutStore((s) => s.startFromTemplate);
  const recent = workouts.slice(0, 2);

  const unit = useSettingsStore((s) => s.unit);
  const week = useWeeklyRecap();

  // Streak shield / rest token. Tokens are derived from history (workouts +
  // claimed quests), so they're already earned; spending one waives the
  // streak-break penalty on the current lapse.
  const spendShield = useSettingsStore((s) => s.spendShield);
  const declineRescue = useSettingsStore((s) => s.declineRescue);
  const shieldTokens = useRestTokens();
  // Effective XP, level and title: shared with Profile and Progression so the
  // shield and the boss-gate cap read the same everywhere (hooks/useEffectiveXp).
  const { effectiveXp, rawDecay, shieldActive, streakPenalty, decaying, lost, rawLevel, prestige, level, boss, title, sealed } =
    useEffectiveXp(profile);
  const streak = useStreak();
  // useStreak answers with the plain day-streak until the plan and workout
  // dates have loaded, then switches to the schedule-aware one. With a plan,
  // that first answer can be "broken" for a streak that is merely between
  // sessions, so nothing streak-shaped is offered until the real one is in.
  const plan = usePlanDays();
  const streakLoading = plan == null || (plan.size > 0 && !streak.scheduled);
  // The offer itself lives in StreakRescueHost, app-wide. This is only the way
  // back to it after "let it go", given the same live streak the host uses.
  const offer = !profile || streakLoading ? null : rescueOffer(profile, shieldTokens, undefined, streak);
  const banked = sealed ? rawLevel - level : 0;
  const canShield = rawDecay.decaying && streakPenalty > 0 && !shieldActive && shieldTokens > 0;

  const live = useInkMotion();
  const sky = useSky();
  const pal = SKY_PALETTES[sky] ?? SKY_PALETTES.dusk;
  const { progress, xpToNext } = getXPProgress(effectiveXp);
  const caption = sealed
    ? `Sealed at the boss gate · ${banked} ${banked === 1 ? 'level' : 'levels'} banked`
    : `${xpToNext.toLocaleString()} XP to the next mark`;
  const weekday = new Date().toLocaleDateString('en-US', { weekday: 'long' });

  // The week tiles open the Progress overview, scrolled to what they summarise.
  const openProgress = (focus) => {
    playChime('tap');
    navigate('/progress', { state: { tab: 'Overview', focus } });
  };
  const webgl = hasWebGL();

  function startTemplate() {
    playChime('start');
    startFromTemplate(today.template);
    navigate('/workout');
  }

  const atRisk = streak.state === STREAK.AT_RISK;
  const hasNotes = Boolean(profile) && (banked > 0 || decaying || shieldActive || offer || shieldTokens > 0);
  const nForms = today.type === 'template' ? today.template.exercises.length : 0;

  return (
    <div className="hm-page">
      <div className="relative">
        <header className="hm-header" style={{ color: pal.headerInk }}>
          <div>
            <h1 className="hm-header__word">OPUS</h1>
            <span className="hm-header__hello">{profile?.name ? `Welcome back, ${profile.name}.` : 'Build your masterpiece.'}</span>
          </div>
          {/* Only while the streak is standing (profile.streak is frozen at the
              last workout). At risk is called out rather than looking safe. */}
          {streak.count > 0 && (
            <span className={`hm-header__streak${atRisk ? ' hm-header__streak--risk' : ''}`} title={streakLabel(streak)} aria-label={streakLabel(streak)}>
              <Seal kanji={UI_KANJI.streak} size={28} rotate={-4} />
              <span className="hm-header__text" aria-hidden>{streak.count} in a row</span>
            </span>
          )}
        </header>
        <SkyScene
          pal={pal}
          level={level}
          title={title}
          sealKanji={rankSealKanji(level, prestige)}
          progress={sealed ? 1 : progress}
          caption={caption}
          live={live}
        />
      </div>

      <div className="hm-over">
        {activeWorkout ? (
          <TodayCard weekday={weekday} title="Continue workout" meta="In progress" line={`${activeWorkout.name} in progress`} cta="Continue the duel" ctaLabel="Continue workout" onBegin={() => navigate('/workout')} />
        ) : today.type === 'template' ? (
          <TodayCard
            weekday={weekday}
            title={today.template.name}
            meta={`${NUMBER_WORDS[nForms] ?? nForms} ${nForms === 1 ? 'form' : 'forms'}`}
            line={today.reason}
            ctaLabel="Start today's routine"
            onBegin={startTemplate}
          />
        ) : today.type === 'rest' ? (
          <TodayCard weekday={weekday} title="Rest day" meta={UI_KANJI.rest} line={today.reason} cta="Train anyway" ctaLabel="Train anyway" rest onBegin={() => navigate('/workout')} />
        ) : (
          <TodayCard weekday={weekday} title="A fresh session" meta="Open plan" line={today.reason || 'Jump into a new session.'} ctaLabel="Open workout" onBegin={() => navigate('/workout')} />
        )}
      </div>

      {hasNotes && (
        <div className="hm-notes">
          {banked > 0 && (
            <p className="hm-note" title={`XP for level ${rawLevel} earned — clear the boss gate to claim it`}>
              Lv {level} · {banked} {banked === 1 ? 'level' : 'levels'} banked
            </p>
          )}
          {decaying && (
            <div className="hm-note hm-note--ver">
              <span>Rank slipping — train to recover (−{lost.toLocaleString()} XP)</span>
              {canShield && (
                <button type="button" className="hm-note__btn hm-note__btn--ver" onClick={() => { spendShield(profile?.lastWorkoutDate); playChime('goal'); }}>
                  Use shield ({shieldTokens})
                </button>
              )}
            </div>
          )}
          {!decaying && shieldActive && <p className="hm-note">Streak shielded — your rest day is protected</p>}
          {/* A streak you can still buy back. The app-open prompt is the primary offer; this is the way back after "let it go". */}
          {offer && (
            <button type="button" className="hm-note hm-note--row hm-note--ver" onClick={() => { declineRescue(null); playChime('tick'); }}>
              <span>{offer.lost}-{offer.scheduled ? 'session' : 'day'} streak ended</span>
              <span className="hm-note__aside">{offer.affordable ? `Rescue · ${offer.cost} token${offer.cost === 1 ? '' : 's'}` : 'See what it costs'}</span>
            </button>
          )}
          {!offer && !decaying && !shieldActive && shieldTokens > 0 && (
            <p className="hm-note">{shieldTokens} rest {shieldTokens === 1 ? 'token' : 'tokens'} banked</p>
          )}
        </div>
      )}

      <WeekRow onOpen={() => openProgress(null)} />

      <DailyDungeonCard />

      <div className="hm-below">
        <BackupCard />
        <InstallCard />
        <SessionVerdict workout={recent[0]} />

        <div className="hm-stats">
          {[
            { k: 'This week', v: String(week.sessions), u: week.sessions === 1 ? 'session' : 'sessions', focus: null },
            { k: 'Volume', v: Math.round(toDisplay(week.volumeKg, unit)).toLocaleString(), u: `${unitLabel(unit)} lifted`, focus: 'volume' },
            { k: 'Records', v: String(week.prCount), u: week.prCount === 1 ? 'PR' : 'PRs', focus: 'prs' },
          ].map((t) => (
            <button type="button" key={t.k} className="hm-stat" onClick={() => openProgress(t.focus)} aria-label={`${t.k}: ${t.v} ${t.u}. Open progress`}>
              <span className="hm-stat__k">{t.k}</span>
              <span className="hm-stat__v">{t.v}</span>
              <span className="hm-stat__u">{t.u}</span>
            </button>
          ))}
        </div>

        {/* Boss gate: blocks the next milestone level until cleared. */}
        {boss && (
          <div className="hm-gate">
            <span className="hm-gate__eyebrow">Boss gate · Level {boss.gate}</span>
            <p className="hm-gate__name">{boss.title}</p>
            <p className="hm-gate__desc">{boss.desc} to break past level {boss.gate}.</p>
          </div>
        )}

        <WeeklyRecap />

        <SecondaryDeck hasWorkouts={workouts.length > 0} />

        {/* Magnus keeps this slot until Phase 5 replaces him. Only where WebGL
            works, and fenced so a device without a context can't take the app down. */}
        {webgl && (
          <MascotBoundary>
            <Suspense fallback={<div className="glass rounded-2xl" style={{ height: 132 }} />}>
              <Companion className="glass rounded-2xl px-3 py-2" size={116} bubbleWidth={220} />
            </Suspense>
          </MascotBoundary>
        )}

        {recent.length > 0 ? (
          <div>
            <SectionLabel
              meta={(
                <button type="button" className="hm-more" onClick={() => navigate('/history')}>
                  See all <ChevronRight size={12} />
                </button>
              )}
            >
              RECENT
            </SectionLabel>
            {recent.map((w) => <WorkoutCard key={w.id} workout={w} />)}
          </div>
        ) : (
          <div className="hm-legacy">
            <p className="hm-legacy__t">Your legacy starts here</p>
            <p className="hm-legacy__s">Complete your first workout to begin the journey.</p>
          </div>
        )}
      </div>
    </div>
  );
}
