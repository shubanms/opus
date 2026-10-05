import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Plus, ChevronRight, RotateCcw, Zap, Hourglass, CalendarCheck } from 'lucide-react';
import useWorkoutStore from '../store/workoutStore.js';
import { AnimatePresence, m, SPRING, TWEEN } from '../motion/index.jsx';
import ExerciseSection from '../components/workout/ExerciseSection.jsx';
import ExercisePicker from '../components/workout/ExercisePicker.jsx';
import SwapSheet from '../components/workout/SwapSheet.jsx';
import RestTimer from '../components/workout/RestTimer.jsx';
import EndWorkoutModal from '../components/workout/EndWorkoutModal.jsx';
import TemplateCard from '../components/template/TemplateCard.jsx';
import { useExercise } from '../hooks/useExercises.js';
import { useTemplatesWithExercises, useToday } from '../hooks/useTemplates.js';
import { useTodayKey } from '../hooks/useTodayKey.js';
import { useHaptics } from '../hooks/useHaptics.js';
import useSettingsStore from '../store/settingsStore.js';
import { maybePromptPermission, notifyPR } from '../utils/notifications.js';
import { saveWorkoutAsRoutine, advanceProgression } from '../utils/templateActions.js';
import { playChime } from '../utils/sound.js';
import { supersetRuns, noRestIds } from '../utils/supersets.js';
import { db } from '../db/db.js';
import useUIStore from '../store/uiStore.js';
import { useElapsed } from '../hooks/useElapsed.js';
import { restDurationFor } from '../utils/restClock.js';
import { progressionMessage } from '../utils/sessionRewards.js';
import { friendlyDate, parseKey, todayKey } from '../utils/dateKey.js';
import { lastSetAt } from '../utils/workoutSession.js';
import { formatDuration } from '../utils/duration.js';
import useCinematicStore from '../store/cinematicStore.js';

const toast = (...args) => useUIStore.getState().showToast(...args);

// The session header's two heights (px, excluding the safe-area inset).
const HEADER_FULL = 88;
const HEADER_COMPACT = 56;

// Run `fn` once nothing is being celebrated. A full-screen cinematic sits
// above the toast layer, so a reward toast fired underneath it expired unseen.
function afterCelebrations(fn) {
  if (!useCinematicStore.getState().queue.length) {
    fn();
    return;
  }
  const unsub = useCinematicStore.subscribe((s) => {
    if (!s.queue.length) {
      unsub();
      fn();
    }
  });
}

function ElapsedTimer({ startedAt, compact }) {
  const secs = useElapsed(startedAt);
  return (
    <span
      className={`font-mono tabular-nums ${compact ? 'text-xs' : 'text-sm'}`}
      style={{ color: 'var(--color-text-secondary)' }}
    >
      {formatDuration(secs)}
    </span>
  );
}

function ExerciseSectionWrapper({ ex, ...props }) {
  const exerciseData = useExercise(ex.exerciseId);
  // `layout` makes reordering animate for free: move up/down already rewrites
  // the array, and Motion tweens each section from its old box to its new one
  // instead of the list snapping.
  return (
    <m.div layout transition={SPRING.layout}>
      <ExerciseSection
        {...props}
        exercise={ex}
        muscleGroup={exerciseData?.muscleGroup ?? null}
        equipment={exerciseData?.equipment ?? null}
        isBodyweight={exerciseData?.equipment === 'bodyweight'}
        isCardio={exerciseData?.equipment === 'cardio'}
      />
    </m.div>
  );
}

const clock = (ms) => {
  const d = new Date(ms);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

/** A session left open past the resume window, waiting for a decision. */
function StaleSessionCard({ session, onSave, onDiscard, busy }) {
  const sets = session.exercises.reduce((n, e) => n + e.sets.length, 0);
  const startDay = todayKey(new Date(session.startedAt));
  const last = lastSetAt(session);
  return (
    <div className="glass mt-6 rounded-2xl p-4" style={{ background: 'var(--color-chalk)', border: '1px solid var(--accent-line)' }}>
      <p className="flex items-center gap-2 font-sans text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--color-gold)' }}>
        <Hourglass size={13} /> Unfinished session
      </p>
      <p className="mt-2 font-sans text-base font-semibold" style={{ color: 'var(--color-text-primary)' }}>
        {(session.name ?? '').trim() || 'Workout'}
      </p>
      <p className="mt-0.5 font-sans text-xs" style={{ color: 'var(--color-text-secondary)' }}>
        {friendlyDate(startDay)} · {clock(session.startedAt)}
        {last ? `–${clock(last)}` : ''} · {sets} set{sets === 1 ? '' : 's'} logged
      </p>
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={onSave}
          disabled={busy}
          className="h-11 flex-1 rounded-xl font-sans text-sm font-semibold"
          style={{ background: 'var(--color-gold)', color: 'var(--color-obsidian)', opacity: busy ? 0.6 : 1 }}
        >
          {busy ? 'Saving…' : 'Save it'}
        </button>
        <button
          type="button"
          onClick={onDiscard}
          disabled={busy}
          className="h-11 rounded-xl px-5 font-sans text-sm font-medium"
          style={{ background: 'var(--color-ivory)', color: 'var(--color-text-secondary)' }}
        >
          Discard
        </button>
      </div>
      <p className="mt-2 font-sans text-[11px]" style={{ color: 'var(--color-text-secondary)' }}>
        Saving ends it at your last set, so the hours after don't count as training.
      </p>
    </div>
  );
}

export default function WorkoutPage() {
  const activeWorkout = useWorkoutStore((s) => s.activeWorkout);
  const resumed = useWorkoutStore((s) => s.resumed);
  const resumeCued = useWorkoutStore((s) => s.resumeCued);
  const staleWorkout = useWorkoutStore((s) => s.staleWorkout);
  const {
    dismissResumed, markResumeCued, startWorkout, startFromTemplate, addExercise, removeExercise, restoreExercise,
    removeSet, restoreSet, swapExercise, discardWorkout, undoDiscard, completeWorkout, setWorkoutName, setEnergy,
    setWorkoutNotes, toggleSuperset, moveExercise, startRest, retargetRest, clearRest, saveStaleWorkout,
    discardStaleWorkout, restoreStaleWorkout,
  } = useWorkoutStore.getState();
  const navigate = useNavigate();
  const templates = useTemplatesWithExercises();
  const [params, setParams] = useSearchParams();
  const today = useToday();
  const dayKey = useTodayKey();

  const [pickerOpen, setPickerOpen] = useState(false);
  const [swapId, setSwapId] = useState(null); // exercise being swapped, or null
  const [swapOpen, setSwapOpen] = useState(false);
  const [endOpen, setEndOpen] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [energyOpen, setEnergyOpen] = useState(false);
  const [compact, setCompact] = useState(false);
  const [staleBusy, setStaleBusy] = useState(false);
  const restDuration = useSettingsStore((s) => s.restDuration);
  const unit = useSettingsStore((s) => s.unit);
  const effects = useSettingsStore((s) => s.effects);
  const sentinelRef = useRef(null);
  const savingRef = useRef(false);
  const haptic = useHaptics();

  // Home-screen shortcuts (long-press the installed icon) land here with an
  // intent. A shortcut that only *navigates* saves one tap and is not worth a
  // menu entry, so these actually begin the session.
  const start = params.get('start');
  // biome-ignore lint/correctness/useExhaustiveDependencies: store actions and setParams are stable, and `today.template` must not retrigger this — it arrives with `today.type`, which is in the list.
  useEffect(() => {
    if (!start) return;
    // Never stomp a session already in progress — the shortcut is a shortcut,
    // not a reset. `today` resolves asynchronously, so wait for the routine
    // rather than silently downgrading to an empty session.
    if (activeWorkout) { setParams({}, { replace: true }); return; }
    if (start === 'today') {
      if (today.type === 'template' && today.template) startFromTemplate(today.template);
      else if (today.type === 'fresh') startWorkout();
      else return; // still resolving, or a rest day — leave the screen as it is
    } else if (start === 'empty') {
      playChime('start');
      startWorkout();
    }
    setParams({}, { replace: true });
  }, [start, today.type, activeWorkout]);

  // Gentle cue when a session was restored from a lock/reload — once per
  // resume. It replayed on every visit to this tab until the banner was
  // dismissed.
  // biome-ignore lint/correctness/useExhaustiveDependencies: fires on the resume flag; haptic is a fresh closure each render
  useEffect(() => {
    if (resumed && activeWorkout && !resumeCued) {
      markResumeCued();
      haptic('success');
      playChime('success');
    }
  }, [resumed, resumeCued, Boolean(activeWorkout)]);

  // The header condenses once the title scrolls away, and stays reachable:
  // after the last set of a long session, Finish used to be a long scroll up.
  const live = Boolean(activeWorkout);
  useEffect(() => {
    const el = sentinelRef.current;
    if (!live || !el || typeof IntersectionObserver === 'undefined') return undefined;
    const io = new IntersectionObserver(([entry]) => setCompact(!entry.isIntersecting), { threshold: 0 });
    io.observe(el);
    return () => io.disconnect();
  }, [live]);

  // ---- Saving -------------------------------------------------------------

  async function afterSave(result, snapshot, routine) {
    if (!result || result.discarded) return;
    if (result.alreadySaved) {
      toast('Already saved — this session is in your history.', { type: 'success' });
      return;
    }

    // Everything worth celebrating goes to one queue, which owns the order and
    // — since none of it can be skipped — the pacing. It goes first: nothing
    // below may hold it up. (The first workout's celebrations used to wait on
    // the notification permission prompt.)
    const celebrating = useCinematicStore.getState().celebrate(result);
    if (!celebrating) {
      haptic('success');
      playChime('success');
    }
    maybePromptPermission().catch(() => {});
    if (result.prCount > 0) {
      notifyPR(`You set ${result.prCount} new record${result.prCount === 1 ? '' : 's'} this session.`);
    }

    // Reward feedback lands once the celebrations have played. Iron and rest
    // tokens are derived from history; this surfaces what the session added.
    const messages = [];
    try {
      const finishedCount = await db.workouts.count();
      const earnedToken = finishedCount > 0 && finishedCount % 10 === 0; // one token per 10 workouts
      const iron = result.ironEarned ?? 0;
      messages.push([earnedToken ? `◆ +${iron} Iron · 🛡 Rest token earned!` : `◆ +${iron} Iron earned`, { type: 'success' }]);
    } catch (e) {
      console.error('Reward feedback failed (workout still saved):', e);
    }
    // A real dungeon clear gets its own cinematic. Re-running a dungeon already
    // banked today rewards nothing, so it stays a plain toast — a fanfare for
    // no reward would be a lie.
    if (result.dungeon?.alreadyCleared) {
      messages.push([`⚔ ${result.dungeon.name} — already cleared today`, { type: 'success' }]);
    }

    // Advance the routine's targets by its progression scheme (if any), and
    // say what actually happened — a deload is not "progressed".
    if (snapshot?.templateId) {
      try {
        const prog = await advanceProgression(snapshot.templateId, snapshot.exercises, { unit });
        const msg = progressionMessage(prog);
        if (msg) messages.push([msg.text, { type: msg.tone }]);
      } catch (e) {
        console.error('Progression advance failed (workout still saved):', e);
      }
    }

    // Keep an ad-hoc session as a routine if the user opted in.
    if (routine?.saveRoutine) {
      try {
        const savedName = await saveWorkoutAsRoutine({ ...routine, name: routine.routineName, workout: snapshot });
        if (savedName) messages.push([`Saved as "${savedName}"`, { type: 'success' }]);
      } catch (e) {
        console.error('Save-as-routine failed (workout still saved):', e);
      }
    }

    afterCelebrations(() => {
      for (const [text, opts] of messages) toast(text, opts);
    });
  }

  async function handleSave(xp, routine, opts = {}) {
    // The store refuses a second save while one is in flight; this stops the
    // follow-up work (toasts, routine progression) from running twice too.
    if (savingRef.current) return false;
    savingRef.current = true;
    const snapshot = activeWorkout; // completeWorkout clears the store — capture first
    let result;
    try {
      result = await completeWorkout(xp, opts);
    } catch (e) {
      // Never fail silently: nothing was written (the save is one
      // transaction) and the session is untouched, so it can simply be retried.
      console.error('Finish workout failed:', e);
      toast("Couldn't save the workout — your session is safe. Try again.", { type: 'error' });
      savingRef.current = false;
      return false;
    }
    savingRef.current = false;
    setEndOpen(false);
    await afterSave(result, snapshot, routine);
    return true;
  }

  async function handleSaveStale() {
    if (savingRef.current) return;
    savingRef.current = true;
    setStaleBusy(true);
    try {
      const out = await saveStaleWorkout();
      if (out) await afterSave(out.result, out.snapshot, null);
    } catch (e) {
      console.error('Saving the unfinished session failed:', e);
      toast("Couldn't save that session — it's still here. Try again.", { type: 'error' });
    } finally {
      savingRef.current = false;
      setStaleBusy(false);
    }
  }

  // ---- Undoable removals --------------------------------------------------

  // One tap removes; the toast offers it back. The restore refuses to land in
  // a different session than the one it came from.
  function offerUndo(message, restore) {
    playChime('delete');
    toast(message, {
      action: {
        label: 'Undo',
        onAction: () => {
          if (restore()) {
            playChime('goal');
            haptic('success');
          } else {
            toast("Couldn't undo — another session is open now.", { type: 'error' });
          }
        },
      },
    });
  }

  function handleDiscardStale() {
    const snap = discardStaleWorkout();
    if (snap) offerUndo('Unfinished session discarded', () => { restoreStaleWorkout(snap); return true; });
  }

  // ---- No session: the start screen ---------------------------------------

  if (!activeWorkout) {
    const dow = parseKey(dayKey)?.getDay();
    const scheduled = templates.filter((t) => t.dayOfWeek === dow);
    const others = templates.filter((t) => t.dayOfWeek !== dow);
    const begin = (tpl) => { playChime('start'); startFromTemplate(tpl); };
    return (
      <div className="px-5 pb-24 pt-8">
        <h1 className="font-display text-5xl font-bold leading-none" style={{ color: 'var(--color-text-primary)' }}>
          Ready?
        </h1>
        <p className="mt-1 font-sans text-sm" style={{ color: 'var(--color-text-secondary)' }}>
          {scheduled.length ? `${scheduled[0].name} is on the plan for today` : 'Start fresh or pick a routine'}
        </p>

        {staleWorkout && (
          <StaleSessionCard session={staleWorkout} onSave={handleSaveStale} onDiscard={handleDiscardStale} busy={staleBusy} />
        )}

        <button
          type="button"
          onClick={() => { playChime('start'); startWorkout(); }}
          className="mt-6 w-full rounded-2xl py-4 font-sans text-base font-semibold"
          style={{ background: 'var(--color-gold)', color: 'var(--color-obsidian)' }}
        >
          Quick start (empty)
        </button>

        {/* Today's routine first, and marked as such — it used to sit
            wherever its creation date put it. */}
        {scheduled.length > 0 && (
          <>
            <h2 className="mb-3 mt-8 flex items-center gap-2 font-sans text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--color-gold)' }}>
              <CalendarCheck size={13} /> Today
            </h2>
            {scheduled.map((t) => (
              <div key={t.id} className="mb-3 rounded-2xl" style={{ boxShadow: '0 0 0 1.5px var(--color-gold), var(--glow-accent)' }}>
                <div className="-mb-3">
                  <TemplateCard template={t} onStart={begin} />
                </div>
              </div>
            ))}
          </>
        )}

        <div className="mb-3 mt-8 flex items-center justify-between">
          <h2 className="font-sans text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--color-text-secondary)' }}>
            {scheduled.length ? 'Other routines' : 'Your routines'}
          </h2>
          <button
            type="button"
            onClick={() => navigate('/templates')}
            className="-my-2 flex min-h-10 items-center gap-1 px-1 font-sans text-xs"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            Manage <ChevronRight size={12} />
          </button>
        </div>

        {templates.length === 0 ? (
          <button
            type="button"
            onClick={() => navigate('/templates')}
            className="flex w-full items-center justify-center gap-2 rounded-2xl py-5 font-sans text-sm font-medium"
            style={{ border: '1px dashed var(--color-ash)', color: 'var(--color-text-secondary)' }}
          >
            <Plus size={15} /> Create a routine
          </button>
        ) : (
          others.map((t) => <TemplateCard key={t.id} template={t} onStart={begin} />)
        )}
      </div>
    );
  }

  // ---- In a session -------------------------------------------------------

  const exercises = activeWorkout.exercises;
  const alreadyAdded = exercises.map((e) => e.exerciseId);
  // "Done" only means a target was actually met. An ad-hoc session has no
  // targets, so nothing is dimmed — logging two sets of bench doesn't mean
  // you're finished with bench.
  const isDone = (ex) => {
    const working = ex.sets.filter((x) => !x.isWarmup).length;
    return Boolean(ex.targetSets) && working >= ex.targetSets;
  };
  // "Active" is where you actually are: the exercise you logged to most
  // recently. Before anything is logged, it's the first one that isn't done.
  let latest = null;
  let latestEx = null;
  for (const ex of exercises) {
    for (const s of ex.sets) {
      if (!latest || (s.completedAt ?? 0) >= (latest.completedAt ?? 0)) {
        latest = s;
        latestEx = ex;
      }
    }
  }
  const activeId = latestEx?.exerciseId ?? exercises.find((ex) => !isDone(ex))?.exerciseId ?? null;
  // The effort question goes to exactly one set: the last one logged in the
  // whole session, if it was a working set.
  const rateUid = latest && !latest.isWarmup && !latest.isCardio ? latest.uid : null;
  const runs = supersetRuns(exercises);
  const noRest = noRestIds(exercises);

  // What the rest is for: the same exercise until its target is met, then the
  // next one that still has work.
  const activeIdx = exercises.findIndex((e) => e.exerciseId === activeId);
  const nextEx = activeIdx >= 0 && !isDone(exercises[activeIdx])
    ? exercises[activeIdx]
    : exercises.find((e, i) => i > activeIdx && !isDone(e)) ?? exercises.find((e) => !isDone(e)) ?? null;

  function handleSetLogged(exerciseId, set) {
    // Superset members before the last go straight on to the next move.
    if (noRest.has(exerciseId)) {
      clearRest();
      return;
    }
    const ex = exercises.find((e) => e.exerciseId === exerciseId);
    const secs = restDurationFor({ targetRest: ex?.targetRest, defaultSecs: restDuration });
    // A warm-up is not a working set: a short breather, not a full rest.
    startRest(set?.isWarmup ? Math.min(60, secs) : secs);
  }

  function handleEffortRated(exerciseId, rpe) {
    const ex = exercises.find((e) => e.exerciseId === exerciseId);
    // The routine's own rest for the exercise wins over the effort suggestion.
    if (Number(ex?.targetRest) > 0) return;
    retargetRest(restDurationFor({ rpe, defaultSecs: restDuration }));
  }

  function handleSetRemoved(exerciseId, setNumber) {
    const snap = removeSet(exerciseId, setNumber);
    if (snap) offerUndo(`Set ${setNumber} removed`, () => restoreSet(snap));
  }

  function handleRemoveExercise(ex) {
    const snap = removeExercise(ex.exerciseId);
    if (snap) offerUndo(`${ex.name} removed`, () => restoreExercise(snap));
  }

  function handleDiscard() {
    const snap = discardWorkout();
    setEndOpen(false);
    if (snap) offerUndo('Workout discarded', () => undoDiscard(snap));
  }

  function handleSwap(ex) {
    const outcome = swapExercise(swapId, ex);
    playChime('tap');
    if (outcome === 'added') {
      const from = exercises.find((e) => e.exerciseId === swapId);
      toast(`${ex.name} added after ${from?.name ?? 'it'}`, { type: 'success' });
    }
    setSwapOpen(false);
    setPickerOpen(false);
    setSwapId(null);
  }

  function finishNameEdit() {
    // An empty name is not a name: fall back rather than saving "".
    if (!(activeWorkout.name ?? '').trim()) setWorkoutName('Workout');
    setEditingName(false);
  }

  const swapping = swapId != null ? exercises.find((e) => e.exerciseId === swapId) : null;
  const energySet = activeWorkout.energy != null;
  const showEnergy = !energySet || energyOpen;
  const headerTransition = effects
    ? ['height', 'margin-bottom', 'font-size', 'background-color', 'box-shadow']
        .map((prop) => `${prop} 200ms var(--opus-ease-out)`)
        .join(', ')
    : 'none';

  return (
    <div className="px-5 pb-40 pt-6">
      <div ref={sentinelRef} aria-hidden className="h-px" />

      {/* Sticky session header: name · elapsed · Finish, always in reach. It
          condenses to one line as soon as the page scrolls. Fully opaque once
          stuck — a translucent strip let the card scrolling beneath it read
          through the workout's name. */}
      {/* Its footprint in the page never changes: as the strip shrinks, a
          bottom margin grows by the same amount, on the same curve. Otherwise
          every card below jumped 32px under your thumb the moment you scrolled. */}
      <header
        className="sticky top-0 z-30 -mx-5 flex flex-col justify-center px-5"
        style={{
          marginTop: 'calc(-1 * env(safe-area-inset-top))',
          paddingTop: 'env(safe-area-inset-top)',
          height: `calc(env(safe-area-inset-top) + ${compact ? HEADER_COMPACT : HEADER_FULL}px)`,
          marginBottom: compact ? HEADER_FULL - HEADER_COMPACT : 0,
          background: compact ? 'var(--color-chalk)' : 'transparent',
          borderBottom: `1px solid ${compact ? 'var(--glass-line)' : 'transparent'}`,
          boxShadow: compact ? 'var(--elev-2)' : 'none',
          transition: headerTransition,
        }}
      >
        <div className="flex items-center gap-2">
          <div className={`min-w-0 flex-1 ${compact ? 'flex items-baseline gap-2' : ''}`}>
            {editingName ? (
              <input
                autoFocus
                value={activeWorkout.name}
                onChange={(e) => setWorkoutName(e.target.value)}
                onBlur={finishNameEdit}
                onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
                aria-label="Workout name"
                className="w-full bg-transparent font-display font-bold leading-tight outline-none"
                style={{ color: 'var(--color-text-primary)', fontSize: compact ? '1.25rem' : '1.875rem', transition: headerTransition }}
              />
            ) : (
              <button type="button" onClick={() => setEditingName(true)} className="block min-w-0 max-w-full text-left" aria-label={`Rename workout: ${activeWorkout.name}`}>
                <h1
                  className="truncate font-display font-bold leading-tight"
                  style={{ color: 'var(--color-text-primary)', fontSize: compact ? '1.25rem' : '1.875rem', transition: headerTransition }}
                >
                  {(activeWorkout.name ?? '').trim() || 'Workout'}
                </h1>
              </button>
            )}
            <div className={`flex shrink-0 items-center gap-2 ${compact ? '' : 'mt-0.5'}`}>
              <ElapsedTimer startedAt={activeWorkout.startedAt} compact={compact} />
              {energySet && (
                <button
                  type="button"
                  onClick={() => setEnergyOpen((v) => !v)}
                  aria-expanded={energyOpen}
                  aria-label={`Energy ${activeWorkout.energy} of 5 — change`}
                  className="-my-2 flex min-h-10 items-center gap-1 px-1 font-mono text-xs"
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  <span className="flex items-center gap-1 rounded-full px-2 py-0.5" style={{ background: 'var(--color-ivory)' }}>
                    <Zap size={11} style={{ color: 'var(--color-gold)' }} aria-hidden />
                    {activeWorkout.energy}/5
                  </span>
                </button>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={handleDiscard}
            className="h-10 shrink-0 rounded-xl px-3 font-sans text-xs font-medium"
            style={{ background: 'var(--color-ivory)', color: 'var(--color-text-secondary)' }}
          >
            Discard
          </button>
          <button
            type="button"
            onClick={() => setEndOpen(true)}
            className="h-10 shrink-0 rounded-xl px-4 font-sans text-sm font-semibold"
            style={{ background: 'var(--color-gold)', color: 'var(--color-obsidian)', boxShadow: compact ? 'var(--glow-accent)' : 'none' }}
          >
            Finish
          </button>
        </div>
      </header>

      {resumed && (
        <div
          className="mb-4 mt-2 flex items-center gap-2 rounded-xl py-1 pl-3 pr-1"
          style={{ background: 'var(--color-chalk)', border: '1px solid var(--color-gold)' }}
        >
          <RotateCcw size={14} style={{ color: 'var(--color-gold)' }} />
          <span className="flex-1 font-sans text-xs" style={{ color: 'var(--color-text-secondary)' }}>
            Picked up your in-progress workout.
          </span>
          <button type="button" onClick={dismissResumed} className="min-h-10 px-3 font-sans text-xs font-semibold" style={{ color: 'var(--color-gold)' }}>
            Got it
          </button>
        </div>
      )}

      {/* Energy check-in: a card until answered, then a chip in the header. */}
      <AnimatePresence initial={false}>
        {showEnergy && (
          <m.div
            key="energy"
            className="overflow-hidden"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={TWEEN.standard}
          >
            <div className="glass mb-4 mt-2 rounded-2xl px-4 py-3" style={{ background: 'var(--color-chalk)', border: '1px solid var(--color-ivory)' }}>
              <p className="mb-2 font-sans text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
                How's your energy today?
              </p>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    type="button"
                    key={n}
                    onClick={() => { setEnergy(n); setEnergyOpen(false); haptic('tap'); }}
                    aria-pressed={activeWorkout.energy === n}
                    className="flex h-11 flex-1 items-center justify-center rounded-xl font-mono text-sm font-medium"
                    style={{
                      background: activeWorkout.energy === n ? 'var(--color-gold)' : 'var(--color-ivory)',
                      color: activeWorkout.energy === n ? 'var(--color-obsidian)' : 'var(--color-text-primary)',
                    }}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
          </m.div>
        )}
      </AnimatePresence>

      <div className="mt-2" />

      {/* Exercise sections (grouped into superset brackets) */}
      {runs.map((run) => {
        const renderEx = (ex) => {
          const idx = exercises.indexOf(ex);
          const linked = idx > 0 && ex.supersetId != null && ex.supersetId === exercises[idx - 1].supersetId;
          return (
            <ExerciseSectionWrapper
              key={ex.exerciseId}
              ex={ex}
              rateUid={rateUid}
              canLink={idx > 0}
              linked={linked}
              onSetLogged={handleSetLogged}
              onEffortRated={handleEffortRated}
              onSetRemoved={handleSetRemoved}
              onRemove={() => handleRemoveExercise(ex)}
              onSwap={() => { setSwapId(ex.exerciseId); setSwapOpen(true); }}
              onToggleSuperset={() => toggleSuperset(ex.exerciseId)}
              onMoveUp={() => moveExercise(ex.exerciseId, -1)}
              onMoveDown={() => moveExercise(ex.exerciseId, 1)}
              canMoveUp={idx > 0}
              canMoveDown={idx < exercises.length - 1}
              active={ex.exerciseId === activeId}
              done={isDone(ex)}
            />
          );
        };
        if (run.length < 2) return renderEx(run[0]);
        return (
          <div
            key={`ss-${run[0].exerciseId}`}
            className="mb-4 rounded-2xl py-1 pl-2"
            style={{ borderLeft: '3px solid var(--color-gold)' }}
          >
            <p className="mb-1 pl-2 pt-1 font-sans text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'var(--color-gold)' }}>
              Superset · {run.length} moves · rest after the last
            </p>
            {run.map(renderEx)}
          </div>
        );
      })}

      {/* Add exercise */}
      <button
        type="button"
        onClick={() => setPickerOpen(true)}
        className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl py-4 font-sans text-sm font-medium"
        style={{ background: 'var(--color-chalk)', border: '1px dashed var(--color-ivory)', color: 'var(--color-text-secondary)' }}
      >
        <Plus size={16} /> Add exercise
      </button>

      {/* Session note */}
      <textarea
        value={activeWorkout.notes ?? ''}
        onChange={(e) => setWorkoutNotes(e.target.value)}
        placeholder="Session notes — how it felt, what to change next time…"
        aria-label="Session notes"
        rows={2}
        className="mt-4 w-full resize-none rounded-2xl px-4 py-3 font-sans text-sm outline-none"
        style={{ background: 'var(--color-chalk)', border: '1px solid var(--color-ivory)', color: 'var(--color-text-primary)' }}
      />

      <RestTimer nextName={nextEx?.name ?? null} />

      <SwapSheet
        isOpen={swapOpen}
        currentId={swapId}
        loggedSets={swapping?.sets.length ?? 0}
        exclude={alreadyAdded}
        onClose={() => { setSwapOpen(false); setSwapId(null); }}
        onSelect={handleSwap}
        onBrowseAll={() => { setSwapOpen(false); setPickerOpen(true); }}
      />

      <ExercisePicker
        isOpen={pickerOpen}
        onClose={() => { setPickerOpen(false); setSwapId(null); }}
        onSelect={(ex) => {
          if (swapId) handleSwap(ex);
          else { playChime('tap'); addExercise(ex); }
        }}
        alreadyAdded={alreadyAdded}
      />

      <EndWorkoutModal
        isOpen={endOpen}
        activeWorkout={activeWorkout}
        onSave={handleSave}
        onClose={() => setEndOpen(false)}
      />
    </div>
  );
}
