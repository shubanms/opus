import { useEffect, useRef, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Home, BarChart3, Plus, Dumbbell, User, CalendarCheck, Zap, ListChecks, Timer } from 'lucide-react';
import { AnimatePresence, m, SPRING, TWEEN, useMotionEnabled } from '../../motion/index.jsx';
import { useHaptics } from '../../hooks/useHaptics.js';
import { playChime } from '../../utils/sound.js';
import { useToday } from '../../hooks/useTemplates.js';
import useWorkoutStore from '../../store/workoutStore.js';
import { useElapsed } from '../../hooks/useElapsed.js';
import { useRestAlarm } from '../../hooks/useRestClock.js';
import { formatClock } from '../../utils/duration.js';
import { formatRest } from '../../utils/restClock.js';

const tabs = [
  { to: '/home', label: 'Home', Icon: Home },
  { to: '/progress', label: 'Progress', Icon: BarChart3 },
  { to: '/workout', label: 'Workout', Icon: Plus, center: true },
  { to: '/exercises', label: 'Exercises', Icon: Dumbbell },
  { to: '/profile', label: 'Profile', Icon: User },
];



function NavItem({ to, label, Icon }) {
  return (
    <NavLink to={to} aria-label={label} className="relative flex flex-1 flex-col items-center gap-1 py-1">
      {({ isActive }) => (
        <>
          {/* One shared indicator: `layoutId` makes Motion tween the pill from
              the old tab to the new one rather than cross-fading two pills. */}
          {isActive && (
            <m.span
              layoutId="nav-indicator"
              transition={SPRING.layout}
              className="absolute inset-x-1 -top-0.5 bottom-0 rounded-2xl"
              style={{ background: 'var(--accent-wash)' }}
            />
          )}
          <m.span
            className="relative"
            animate={{ y: isActive ? -1 : 0, scale: isActive ? 1.1 : 1 }}
            transition={SPRING.layout}
          >
            <Icon size={21} style={{ color: isActive ? 'var(--color-gold)' : 'var(--color-ash)' }} />
          </m.span>
          <span
            className="relative font-sans text-[10px]"
            style={{ color: isActive ? 'var(--color-text-primary)' : 'var(--color-ash)' }}
          >
            {label}
          </span>
        </>
      )}
    </NavLink>
  );
}

export default function BottomNav() {
  const navigate = useNavigate();
  const haptic = useHaptics();
  const motionOn = useMotionEnabled();
  const [quickOpen, setQuickOpen] = useState(false);
  const today = useToday();
  const startFromTemplate = useWorkoutStore((s) => s.startFromTemplate);
  // Nothing outside the workout screen used to suggest a session was open — you
  // could wander to Progress mid-session and the app looked idle.
  const activeWorkout = useWorkoutStore((s) => s.activeWorkout);
  const live = Boolean(activeWorkout?.startedAt);
  const elapsed = useElapsed(activeWorkout?.startedAt);
  // The rest belongs to the session, not the workout page: its countdown
  // rides in the pill on every tab, and its end-of-rest cue fires from here
  // because this is the one component that is always on screen.
  const { rest, remaining, done: restDone } = useRestAlarm();
  const resting = live && Boolean(rest);
  // A ref, not a `let`: the clock re-renders this component every second, and
  // a fresh `let` each render meant pointer-up cleared a timer that no longer
  // existed — about one tap in eight mid-session opened the quick menu.
  const pressTimer = useRef(null);
  // A long press opens the menu; the click that follows its release must not
  // immediately close it again (or, worse, navigate).
  const longPressed = useRef(false);
  useEffect(() => () => clearTimeout(pressTimer.current), []);

  // Long-press the centre action for the ways a session actually starts,
  // instead of always landing on the workout tab and choosing from there.
  // Each entry does real work — no route that nothing handles.
  const quick = live
    ? [{ label: 'Back to your session', Icon: Timer, run: () => navigate('/workout') }]
    : [
    // Actually starts one — the workout page handles the intent (and refuses
    // to stomp a session already in progress).
    { label: 'Empty session', Icon: Zap, run: () => navigate('/workout?start=empty') },
    today.type === 'template' && {
      label: today.template.name,
      Icon: CalendarCheck,
      run: () => { playChime('start'); startFromTemplate(today.template); navigate('/workout'); },
    },
    { label: 'Browse routines', Icon: ListChecks, run: () => navigate('/templates') },
  ].filter(Boolean);

  function openQuick() {
    setQuickOpen(true);
    haptic('tap');
    playChime('tap');
  }

  function go(run) {
    setQuickOpen(false);
    run();
  }

  return (
    <>
      {/* Scrim: tapping anywhere closes the quick menu, and it sits under the
          dock so the dock itself stays interactive. */}
      <AnimatePresence>
        {quickOpen && (
          <m.button
            type="button"
            aria-label="Close quick actions"
            className="fixed inset-0 z-[41]"
            style={{ background: 'rgba(6,9,20,0.5)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={TWEEN.micro}
            onClick={() => setQuickOpen(false)}
          />
        )}
      </AnimatePresence>

      <div
        className="fixed bottom-0 left-1/2 z-[42] w-full max-w-md -translate-x-1/2 px-3"
        style={{ paddingBottom: 'calc(var(--space-3) + env(safe-area-inset-bottom))' }}
      >
        {/* Quick actions fan up from the centre button. */}
        <AnimatePresence>
          {quickOpen && (
            <m.div className="mb-3 flex flex-col items-center gap-2">
              {quick.map((q, i) => (
                <m.button
                  type="button"
                  key={q.label}
                  onClick={() => go(q.run)}
                  className="glass glass-strong flex w-56 items-center gap-3 rounded-2xl px-4 py-3"
                  initial={{ opacity: 0, y: 14, scale: 0.94 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.96 }}
                  transition={{ ...SPRING.pop, delay: motionOn ? (quick.length - 1 - i) * 0.04 : 0 }}
                >
                  <q.Icon size={17} style={{ color: 'var(--color-gold)' }} />
                  <span className="font-sans text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                    {q.label}
                  </span>
                </m.button>
              ))}
            </m.div>
          )}
        </AnimatePresence>

        {/* The dock floats clear of the screen edge rather than sitting flush,
            so the aurora reads underneath it. */}
        <nav
          className="glass glass-strong flex items-center justify-around rounded-3xl px-2 pb-1 pt-1.5"
          style={{ boxShadow: 'var(--elev-3)' }}
        >
          {tabs.map(({ to, label, Icon, center }) =>
            center ? (
              <div key={to} className="relative flex flex-1 justify-center">
                <m.button
                  type="button"
                  aria-label={
                    live
                      ? resting
                        ? `Session in progress, ${restDone ? 'rest over' : `resting ${formatRest(remaining)}`} — tap to return`
                        : `Session in progress, ${formatClock(elapsed)} — tap to return`
                      : 'Workout — tap to start, press and hold for quick actions'
                  }
                  className="-mt-7 flex h-14 w-14 items-center justify-center"
                  style={{
                    background: 'var(--grad-accent)',
                    color: 'var(--color-obsidian)',
                    borderRadius: 'var(--opus-radius-lg)',
                    boxShadow: 'var(--glow-accent)',
                  }}
                  whileTap={{ scale: 0.92 }}
                  animate={{ rotate: quickOpen ? 45 : 0 }}
                  transition={SPRING.pop}
                  onClick={() => {
                    if (longPressed.current) { longPressed.current = false; return; }
                    if (quickOpen) setQuickOpen(false);
                    else navigate(to);
                  }}
                  onContextMenu={(e) => { e.preventDefault(); if (!quickOpen) { clearTimeout(pressTimer.current); longPressed.current = true; openQuick(); } }}
                  onPointerDown={() => {
                    longPressed.current = false;
                    clearTimeout(pressTimer.current);
                    pressTimer.current = setTimeout(() => { longPressed.current = true; openQuick(); }, 420);
                  }}
                  onPointerUp={() => clearTimeout(pressTimer.current)}
                  onPointerLeave={() => clearTimeout(pressTimer.current)}
                  onPointerCancel={() => clearTimeout(pressTimer.current)}
                >
                  <Icon size={26} strokeWidth={2.5} />
                </m.button>

                {/* A breathing halo behind the button, plus the running clock —
                    visible from any tab, and the clock answers the question the
                    dot raises ("how long have I been in here?"). */}
                {live && !quickOpen && (
                  <>
                    <m.span
                      aria-hidden
                      className="pointer-events-none absolute -mt-7 h-14 w-14"
                      style={{
                        borderRadius: 'var(--opus-radius-lg)',
                        border: '2px solid var(--color-sage)',
                      }}
                      initial={{ opacity: 0.9, scale: 1 }}
                      animate={motionOn ? { opacity: [0.9, 0, 0.9], scale: [1, 1.35, 1] } : { opacity: 0.9 }}
                      transition={motionOn ? { duration: 2.2, repeat: Number.POSITIVE_INFINITY, ease: 'easeOut' } : undefined}
                    />
                    {/* Elapsed time normally; the rest countdown while resting,
                        in the accent colour so the two never read as one. */}
                    <span
                      data-testid="session-clock"
                      className="pointer-events-none absolute -top-8 flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 font-mono text-[10px] font-semibold tabular-nums"
                      style={{
                        background: resting && !restDone ? 'var(--color-gold)' : 'var(--color-sage)',
                        color: 'var(--color-obsidian)',
                        boxShadow: 'var(--elev-2)',
                        transition: 'background-color var(--dur-standard) var(--opus-ease-out)',
                      }}
                    >
                      {resting && !restDone && <Timer size={10} strokeWidth={2.75} aria-hidden />}
                      {resting ? (restDone ? 'GO' : formatRest(remaining)) : formatClock(elapsed)}
                    </span>
                  </>
                )}
              </div>
            ) : (
              <NavItem key={to} to={to} label={label} Icon={Icon} />
            )
          )}
        </nav>
      </div>
    </>
  );
}
